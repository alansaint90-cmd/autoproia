import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { conversations, handoffEvents, leads, messages, users } from "@/lib/db/schema";
import { SYSTEM_USER_ID } from "@/lib/constants";
import { generateAiReply } from "@/lib/services/ai-agent";
import { sendWhatsAppText } from "@/lib/services/evolution-api";
import {
  drainConversationBuffer,
  pushToConversationBuffer,
  scheduleBufferProcessing,
  shouldProcessBuffer
} from "@/lib/services/message-buffer";
import { publishRealtimeEvent } from "@/lib/services/realtime";
import type { NormalizedInboundMessage } from "@/lib/whatsapp/normalizer";

export async function registerInboundMessage(input: NormalizedInboundMessage) {
  await ensureSystemUser();

  const lead = await upsertLead(input);
  const conversation = await upsertConversation(lead.id, input.externalChatId);

  const [message] = await db
    .insert(messages)
    .values({
      conversation_id: conversation.id,
      external_message_id: input.externalMessageId,
      role: input.fromMe ? "human" : "lead",
      content: input.text,
      metadata: { source: "evolution" },
      modified_by: SYSTEM_USER_ID
    })
    .returning();

  await db
    .update(conversations)
    .set({
      last_message_at: new Date(),
      updated_at: new Date(),
      modified_by: SYSTEM_USER_ID
    })
    .where(and(eq(conversations.id, conversation.id), eq(conversations.is_deleted, false)));

  await publishRealtimeEvent({
    type: "message.created",
    conversationId: conversation.id,
    payload: { message }
  });

  if (!input.fromMe && conversation.status === "ai") {
    await pushToConversationBuffer({
      conversationId: conversation.id,
      messageId: message.id,
      content: input.text,
      receivedAt: new Date().toISOString()
    });
    await scheduleBufferProcessing(conversation.id);
  }

  return { lead, conversation, message };
}

async function ensureSystemUser() {
  await db
    .insert(users)
    .values({
      id: SYSTEM_USER_ID,
      name: "Auto Pro IA",
      email: "sistema@autoproia.local",
      role: "admin",
      modified_by: SYSTEM_USER_ID
    })
    .onConflictDoNothing();
}

export async function processBufferedConversation(conversationId: string) {
  console.info("[conversation-service] processing buffer started", { conversationId });

  if (!(await shouldProcessBuffer(conversationId))) {
    console.info("[conversation-service] processing skipped without pending buffer", { conversationId });
    return { skipped: true };
  }

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.is_deleted, false)))
    .limit(1);

  if (!conversation || conversation.status !== "ai") {
    console.info("[conversation-service] processing skipped by conversation status", {
      conversationId,
      status: conversation?.status
    });
    return { skipped: true };
  }

  const buffered = await drainConversationBuffer(conversationId);
  if (buffered.length === 0) {
    console.info("[conversation-service] processing skipped empty buffer", { conversationId });
    return { skipped: true };
  }

  const recentMessages = await db
    .select()
    .from(messages)
    .where(and(eq(messages.conversation_id, conversationId), eq(messages.is_deleted, false)))
    .orderBy(desc(messages.created_at))
    .limit(20);

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, conversation.lead_id), eq(leads.is_deleted, false)))
    .limit(1);

  if (!lead) {
    throw new Error("Lead da conversa nao encontrado.");
  }

  console.info("[conversation-service] generating ai reply", {
    conversationId,
    leadId: lead.id,
    bufferedMessages: buffered.length
  });

  const reply = await generateAiReply({
    leadName: lead?.name,
    contextSummary: conversation.context_summary,
    messages: recentMessages.reverse().map((message) => ({
      role: message.role,
      content: message.content
    }))
  });

  console.info("[conversation-service] sending whatsapp reply", { conversationId, phone: lead.phone });
  await sendWhatsAppText({ phone: lead.phone, text: reply });
  console.info("[conversation-service] whatsapp reply sent", { conversationId });

  const [aiMessage] = await db
    .insert(messages)
    .values({
      conversation_id: conversationId,
      role: "ai",
      content: reply,
      metadata: { source: "openai", bufferedMessageIds: buffered.map((item) => item.messageId) },
      modified_by: SYSTEM_USER_ID
    })
    .returning();

  await db
    .update(conversations)
    .set({
      last_message_at: new Date(),
      updated_at: new Date(),
      modified_by: SYSTEM_USER_ID
    })
    .where(and(eq(conversations.id, conversationId), eq(conversations.is_deleted, false)));

  await publishRealtimeEvent({
    type: "message.created",
    conversationId,
    payload: { message: aiMessage }
  });

  return { skipped: false, message: aiMessage };
}

export async function assumeConversation(conversationId: string, userId: string, reason?: string) {
  return changeConversationStatus(conversationId, userId, "human", reason);
}

export async function returnConversationToAi(conversationId: string, userId: string, reason?: string) {
  return changeConversationStatus(conversationId, userId, "ai", reason);
}

async function changeConversationStatus(
  conversationId: string,
  userId: string,
  toStatus: "ai" | "human",
  reason?: string
) {
  const [current] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.is_deleted, false)))
    .limit(1);

  if (!current) {
    throw new Error("Conversa nao encontrada.");
  }

  const [updated] = await db
    .update(conversations)
    .set({
      status: toStatus,
      assigned_to: toStatus === "human" ? userId : null,
      ai_paused_reason: toStatus === "human" ? reason ?? "Atendente assumiu a conversa." : null,
      updated_at: new Date(),
      modified_by: userId
    })
    .where(and(eq(conversations.id, conversationId), eq(conversations.is_deleted, false)))
    .returning();

  await db.insert(handoffEvents).values({
    conversation_id: conversationId,
    from_status: current.status,
    to_status: toStatus,
    reason,
    modified_by: userId
  });

  await publishRealtimeEvent({
    type: "handoff.changed",
    conversationId,
    payload: { conversation: updated }
  });

  return updated;
}

async function upsertLead(input: NormalizedInboundMessage) {
  const [existing] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.phone, input.phone), eq(leads.is_deleted, false)))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(leads)
    .values({
      name: input.leadName,
      phone: input.phone,
      origin: "whatsapp",
      modified_by: SYSTEM_USER_ID
    })
    .returning();

  return created;
}

async function upsertConversation(leadId: string, externalChatId: string) {
  const [existing] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.external_chat_id, externalChatId), eq(conversations.is_deleted, false)))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(conversations)
    .values({
      lead_id: leadId,
      external_chat_id: externalChatId,
      status: "ai",
      modified_by: SYSTEM_USER_ID
    })
    .returning();

  return created;
}
