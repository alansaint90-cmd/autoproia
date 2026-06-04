import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { conversations, handoffEvents, leads, messages, users } from "@/lib/db/schema";
import { SYSTEM_USER_ID } from "@/lib/constants";
import { generateAiReply } from "@/lib/services/ai-agent";
import { sendWhatsAppText } from "@/lib/services/evolution-api";
import {
  appendRecentConversationContext,
  drainConversationBuffer,
  getRecentConversationContext,
  pushToConversationBuffer,
  scheduleBufferProcessing,
  shouldProcessBuffer
} from "@/lib/services/message-buffer";
import { publishRealtimeEvent } from "@/lib/services/realtime";
import type { NormalizedInboundMessage } from "@/lib/whatsapp/normalizer";

export async function registerInboundMessage(input: NormalizedInboundMessage) {
  await ensureSystemUser();

  const leadSignal = classifyLeadSignal(input.text);
  const lead = await upsertLead(input, leadSignal);
  const conversation = await upsertConversation(lead.id, input.externalChatId);

  if (input.externalMessageId) {
    const [existingMessage] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.external_message_id, input.externalMessageId), eq(messages.is_deleted, false)))
      .limit(1);

    if (existingMessage) {
      console.info("[conversation-service] duplicated evolution message ignored", {
        conversationId: conversation.id,
        externalMessageId: input.externalMessageId
      });
      return { lead, conversation, message: existingMessage };
    }
  }

  const [message] = await db
    .insert(messages)
    .values({
      conversation_id: conversation.id,
      external_message_id: input.externalMessageId,
      role: input.fromMe ? "human" : "lead",
      content: input.text,
      metadata: { source: "evolution", leadSignal },
      modified_by: SYSTEM_USER_ID
    })
    .returning();

  await db
    .update(conversations)
    .set({
      last_message_at: new Date(),
      context_summary: buildContextSummary(input.text, leadSignal),
      updated_at: new Date(),
      modified_by: SYSTEM_USER_ID
    })
    .where(and(eq(conversations.id, conversation.id), eq(conversations.is_deleted, false)));

  await appendRecentConversationContext({
    conversationId: conversation.id,
    messageId: message.id,
    role: message.role,
    content: message.content,
    createdAt: new Date().toISOString()
  });

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

  const redisContext = await getRecentConversationContext(conversationId);
  const messagesForContext = redisContext.length > 0
    ? redisContext.map((message) => ({ role: message.role, content: message.content }))
    : recentMessages.reverse().map((message) => ({
      role: message.role,
      content: message.content
    }));

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
    messages: messagesForContext
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

  await appendRecentConversationContext({
    conversationId,
    messageId: aiMessage.id,
    role: aiMessage.role,
    content: aiMessage.content,
    createdAt: new Date().toISOString()
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

type LeadSignal = {
  temperature: "urgente" | "quente" | "morno" | "frio";
  sentiment: "positivo" | "neutro" | "duvida" | "negativo";
  pipelineStage: "novo" | "ia" | "atendimento" | "followup" | "matricula_pendente" | "fechado" | "perdido";
  interest?: string;
  enrollmentClosedAt?: Date;
};

async function upsertLead(input: NormalizedInboundMessage, signal: LeadSignal) {
  const now = new Date();
  const name = input.leadName?.trim() || undefined;

  const [existing] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.phone, input.phone), eq(leads.is_deleted, false)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(leads)
      .set({
        name: existing.name ?? name,
        interest: signal.interest ?? existing.interest,
        temperature: signal.temperature,
        sentiment: signal.sentiment,
        pipeline_stage: signal.pipelineStage,
        last_message_preview: input.text.slice(0, 280),
        last_interaction_at: now,
        enrollment_closed_at: signal.enrollmentClosedAt ?? existing.enrollment_closed_at,
        updated_at: now,
        modified_by: SYSTEM_USER_ID
      })
      .where(and(eq(leads.id, existing.id), eq(leads.is_deleted, false)))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(leads)
    .values({
      name,
      phone: input.phone,
      origin: "whatsapp",
      interest: signal.interest,
      temperature: signal.temperature,
      sentiment: signal.sentiment,
      pipeline_stage: signal.pipelineStage,
      last_message_preview: input.text.slice(0, 280),
      last_interaction_at: now,
      enrollment_closed_at: signal.enrollmentClosedAt,
      modified_by: SYSTEM_USER_ID
    })
    .returning();

  return created;
}

function classifyLeadSignal(text: string): LeadSignal {
  const normalized = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  const hasAny = (terms: string[]) => terms.some((term) => normalized.includes(term));
  const isClosed = hasAny(["matricula fechada", "matricula realizada", "paguei", "pagamento feito", "contrato assinado"]);
  const wantsEnroll = hasAny(["quero matricular", "fechar matricula", "posso matricular", "vou fechar", "enviar contrato"]);
  const urgent = hasAny(["urgente", "hoje", "agora", "preciso comecar", "preciso tirar", "quanto antes"]);
  const hot = wantsEnroll || hasAny(["valor", "preco", "parcel", "desconto", "pix", "cartao", "proposta"]);
  const cold = hasAny(["vou pensar", "depois", "sem interesse", "nao quero", "muito caro"]);
  const negative = hasAny(["reclamar", "problema", "ruim", "demora", "cancelar", "nao gostei"]);
  const positive = isClosed || wantsEnroll || hasAny(["obrigado", "gostei", "perfeito", "otimo", "beleza"]);

  const interest = hasAny(["moto"]) ? "moto" : hasAny(["adicao", "adicionar"]) ? "adicao" : hasAny(["mudanca"]) ? "mudanca" : hasAny(["carro", "cnh b", "categoria b"]) ? "carro" : undefined;

  return {
    temperature: urgent ? "urgente" : hot ? "quente" : cold ? "frio" : "morno",
    sentiment: negative ? "negativo" : positive ? "positivo" : hasAny(["duvida", "como", "quando", "qual", "tem aula"]) ? "duvida" : "neutro",
    pipelineStage: isClosed ? "fechado" : wantsEnroll ? "matricula_pendente" : hot ? "atendimento" : cold ? "followup" : "ia",
    interest,
    enrollmentClosedAt: isClosed ? new Date() : undefined
  };
}

function buildContextSummary(text: string, signal: LeadSignal) {
  return [
    `Temperatura: ${signal.temperature}.`,
    `Sentimento: ${signal.sentiment}.`,
    `Etapa: ${signal.pipelineStage}.`,
    signal.interest ? `Interesse: ${signal.interest}.` : "",
    `Ultima mensagem: ${text.slice(0, 180)}`
  ].filter(Boolean).join(" ");
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
