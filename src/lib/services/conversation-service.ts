import { and, desc, eq, notInArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { conversations, handoffEvents, leads, messages, users } from "@/lib/db/schema";
import { SYSTEM_USER_ID } from "@/lib/constants";
import { env } from "@/lib/env";
import { generateAiReply, triageInitialConversation, type AiTriageResult } from "@/lib/services/ai-agent";
import { logAiDecision } from "@/lib/services/ai-decision-log-service";
import { fetchWhatsAppProfilePicture, sanitizeWhatsAppText, sendWhatsAppText } from "@/lib/services/evolution-api";
import {
  pauseLeadFollowUp,
  resetLeadFollowUpOnCustomerReply,
  resumeLeadFollowUp,
  scheduleLeadFollowUp
} from "@/lib/services/follow-up-service";
import {
  appendRecentConversationContext,
  clearConversationBuffer,
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

  const duplicated = await findDuplicatedEvolutionMessage(input.externalMessageId);
  if (duplicated) {
    console.info("[conversation-service] duplicated evolution message ignored", {
      conversationId: duplicated.conversation.id,
      externalMessageId: input.externalMessageId
    });
    return { ...duplicated, duplicated: true };
  }

  let leadSignal = classifyLeadSignal(input.text);
  const lead = await upsertLead(input, leadSignal);
  const conversationState = await upsertConversation(lead.id, input.externalChatId);
  let conversation = conversationState.conversation;
  let triage: AiTriageResult | null = null;

  if (!input.fromMe && conversationState.created) {
    triage = await triageInitialConversation({
      leadName: input.leadName,
      messages: [{ role: "lead", content: input.text }]
    });
    leadSignal = {
      ...leadSignal,
      temperature: triage.temperature,
      sentiment: triage.sentiment,
      pipelineStage: triage.pipelineStage
    };
    const triageResult = await applyInitialTriage(conversation.id, lead.id, triage);
    conversation = triageResult.conversation;
    await logAiDecision({
      conversationId: conversation.id,
      leadId: lead.id,
      action: "ai_triage_applied",
      reason: triage.reason,
      model: env.OPENAI_MODEL,
      mode: "triage",
      metadata: {
        type: triage.type,
        action: triage.action,
        temperature: triage.temperature,
        sentiment: triage.sentiment,
        pipelineStage: triage.pipelineStage
      }
    });
  }

  if (!input.fromMe) {
    await resetLeadFollowUpOnCustomerReply(lead.id);
  }

  const [message] = await db
    .insert(messages)
    .values({
      conversation_id: conversation.id,
      external_message_id: input.externalMessageId,
      role: input.fromMe ? "human" : "lead",
      content: input.text,
      metadata: {
        source: "evolution",
        leadSignal,
        triage,
        messageType: input.messageType,
        media: input.media
      },
      modified_by: SYSTEM_USER_ID
    })
    .onConflictDoNothing({ target: messages.external_message_id })
    .returning();

  if (!message && input.externalMessageId) {
    const duplicatedAfterRace = await findDuplicatedEvolutionMessage(input.externalMessageId);
    if (duplicatedAfterRace) {
      console.info("[conversation-service] duplicated evolution message ignored after insert race", {
        conversationId: duplicatedAfterRace.conversation.id,
        externalMessageId: input.externalMessageId
      });
      return { ...duplicatedAfterRace, duplicated: true };
    }
  }

  if (!message) {
    throw new Error("Nao foi possivel registrar a mensagem recebida.");
  }

  await db
    .update(conversations)
    .set({
      last_message_at: new Date(),
      context_summary: buildContextSummary(input.text, leadSignal, triage),
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

  if (!input.fromMe) {
    await logAiDecision({
      conversationId: conversation.id,
      leadId: lead.id,
      messageId: message.id,
      action: "ai_qualified_lead",
      reason: "Mensagem do lead classificada para atualizar temperatura, sentimento e etapa do funil.",
      mode: conversation.status,
      metadata: {
        temperature: leadSignal.temperature,
        sentiment: leadSignal.sentiment,
        pipelineStage: leadSignal.pipelineStage,
        interest: leadSignal.interest,
        triageType: triage?.type
      }
    });
  }

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

  return { lead, conversation, message, duplicated: false };
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
    if (conversation && conversation.status !== "ai") {
      await clearConversationBuffer(conversationId);
      await logAiDecision({
        conversationId,
        leadId: conversation.lead_id,
        action: "ai_reply_skipped_manual_mode",
        reason: "A IA nao respondeu porque a conversa nao estava em modo automatico.",
        mode: conversation.status,
        safetyStatus: "skipped",
        metadata: { status: conversation.status }
      });
    }
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
  const cleanReply = sanitizeWhatsAppText(reply.text);

  if (reply.safety.status === "blocked") {
    await logAiDecision({
      conversationId,
      leadId: lead.id,
      action: "ai_reply_blocked_by_safety",
      reason: reply.safety.reason,
      model: env.OPENAI_MODEL,
      mode: "ai",
      safetyStatus: "blocked",
      metadata: {
        blockedValues: reply.safety.blockedValues,
        bufferedMessageIds: buffered.map((item) => item.messageId)
      }
    });
  }

  const [currentBeforeSend] = await db
    .select({ status: conversations.status })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.is_deleted, false)))
    .limit(1);

  if (!currentBeforeSend || currentBeforeSend.status !== "ai") {
    console.info("[conversation-service] ai reply discarded because conversation left automatic mode", {
      conversationId,
      status: currentBeforeSend?.status
    });
    await logAiDecision({
      conversationId,
      leadId: lead.id,
      action: "ai_reply_skipped_manual_mode",
      reason: "Resposta gerada foi descartada porque a conversa saiu do modo automatico antes do envio.",
      model: env.OPENAI_MODEL,
      mode: currentBeforeSend?.status ?? null,
      safetyStatus: "skipped",
      metadata: { status: currentBeforeSend?.status }
    });
    return { skipped: true };
  }

  console.info("[conversation-service] sending whatsapp reply", { conversationId, phone: lead.phone });
  await sendWhatsAppText({ phone: lead.phone, text: cleanReply });
  console.info("[conversation-service] whatsapp reply sent", { conversationId });

  const [aiMessage] = await db
    .insert(messages)
    .values({
      conversation_id: conversationId,
      role: "ai",
      content: cleanReply,
      metadata: { source: "openai", bufferedMessageIds: buffered.map((item) => item.messageId) },
      modified_by: SYSTEM_USER_ID
    })
    .returning();

  await logAiDecision({
    conversationId,
    leadId: lead.id,
    messageId: aiMessage.id,
    action: "ai_reply_generated",
    reason: reply.safety.status === "blocked"
      ? "Resposta segura enviada apos bloqueio de informacao comercial nao cadastrada."
      : "Conversa estava em modo automatico e a resposta foi validada contra as regras comerciais.",
    model: env.OPENAI_MODEL,
    mode: "ai",
    safetyStatus: reply.safety.status === "blocked" ? "fallback" : "ok",
    metadata: {
      bufferedMessageIds: buffered.map((item) => item.messageId),
      safety: reply.safety
    }
  });

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
    content: cleanReply,
    createdAt: new Date().toISOString()
  });

  await scheduleLeadFollowUp(lead.id);

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

  if (toStatus === "human" || toStatus === "ai") {
    if (toStatus === "human") {
      await clearConversationBuffer(conversationId);
      await pauseLeadFollowUp(current.lead_id, userId);
    } else {
      await resumeLeadFollowUp(current.lead_id, userId);
    }

    await db
      .update(leads)
      .set({
        pipeline_stage: toStatus === "human" ? "atendimento" : "ia",
        last_interaction_at: new Date(),
        updated_at: new Date(),
        modified_by: userId
      })
      .where(
        and(
          eq(leads.id, current.lead_id),
          eq(leads.is_deleted, false),
          notInArray(leads.pipeline_stage, ["fechado", "perdido", "matricula_pendente"])
        )
      );
  }

  await db.insert(handoffEvents).values({
    conversation_id: conversationId,
    from_status: current.status,
    to_status: toStatus,
    reason,
    modified_by: userId
  });

  await logAiDecision({
    conversationId,
    leadId: current.lead_id,
    action: toStatus === "human" ? "human_handoff_triggered" : "ai_mode_restored",
    reason: reason ?? (toStatus === "human" ? "Atendente assumiu a conversa manualmente." : "Atendente devolveu a conversa para a IA."),
    mode: toStatus,
    safetyStatus: "ok",
    metadata: {
      fromStatus: current.status,
      toStatus
    },
    modifiedBy: userId
  });

  await publishRealtimeEvent({
    type: "handoff.changed",
    conversationId,
    payload: { conversation: updated }
  });

  return updated;
}

async function findDuplicatedEvolutionMessage(externalMessageId?: string) {
  if (!externalMessageId) return null;

  const [message] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.external_message_id, externalMessageId), eq(messages.is_deleted, false)))
    .limit(1);

  if (!message) return null;

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, message.conversation_id), eq(conversations.is_deleted, false)))
    .limit(1);

  if (!conversation) return null;

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, conversation.lead_id), eq(leads.is_deleted, false)))
    .limit(1);

  if (!lead) return null;

  return { lead, conversation, message };
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
  const avatarUrl = input.avatarUrl ?? await fetchWhatsAppProfilePicture(input.phone);

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
        avatar_url: avatarUrl ?? existing.avatar_url,
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
      avatar_url: avatarUrl,
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

function buildContextSummary(text: string, signal: LeadSignal, triage?: AiTriageResult | null) {
  return [
    triage ? `Triagem inicial: ${triage.type}; acao: ${triage.action}; motivo: ${triage.reason}.` : "",
    `Temperatura: ${signal.temperature}.`,
    `Sentimento: ${signal.sentiment}.`,
    `Etapa: ${signal.pipelineStage}.`,
    signal.interest ? `Interesse: ${signal.interest}.` : "",
    `Ultima mensagem: ${text.slice(0, 180)}`
  ].filter(Boolean).join(" ");
}

async function applyInitialTriage(conversationId: string, leadId: string, triage: AiTriageResult) {
  const toStatus = triage.action === "pause_ai" ? "human" : "ai";

  const [conversation] = await db
    .update(conversations)
    .set({
      status: toStatus,
      assigned_to: null,
      ai_paused_reason: triage.action === "pause_ai" ? `Triagem: ${triage.reason}` : null,
      context_summary: `Triagem: ${triage.type}. Acao: ${triage.action}. Motivo: ${triage.reason}`,
      updated_at: new Date(),
      modified_by: SYSTEM_USER_ID
    })
    .where(and(eq(conversations.id, conversationId), eq(conversations.is_deleted, false)))
    .returning();

  await db
    .update(leads)
    .set({
      temperature: triage.temperature,
      sentiment: triage.sentiment,
      pipeline_stage: triage.pipelineStage,
      updated_at: new Date(),
      modified_by: SYSTEM_USER_ID
    })
    .where(and(eq(leads.id, leadId), eq(leads.is_deleted, false)));

  if (triage.action === "pause_ai") {
    await pauseLeadFollowUp(leadId);
    await clearConversationBuffer(conversationId);
  }

  if (!conversation) {
    const [current] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.is_deleted, false)))
      .limit(1);

    if (!current) {
      throw new Error("Conversa nao encontrada apos triagem.");
    }

    return { conversation: current };
  }

  console.info("[conversation-service] initial triage applied", {
    conversationId,
    leadId,
    action: triage.action,
    type: triage.type
  });

  return { conversation };
}

async function upsertConversation(leadId: string, externalChatId: string) {
  const [existing] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.external_chat_id, externalChatId), eq(conversations.is_deleted, false)))
    .limit(1);

  if (existing) {
    return { conversation: existing, created: false };
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

  return { conversation: created, created: true };
}
