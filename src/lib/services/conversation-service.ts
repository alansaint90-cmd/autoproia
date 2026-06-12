import { and, desc, eq, notInArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { conversations, handoffEvents, leads, messages, users } from "@/lib/db/schema";
import { SYSTEM_USER_ID } from "@/lib/constants";
import { env } from "@/lib/env";
import { generateAiReply, triageInitialConversation, type AiTriageResult } from "@/lib/services/ai-agent";
import { logAiDecision } from "@/lib/services/ai-decision-log-service";
import { transcribeInboundAudio, type AudioTranscriptionResult } from "@/lib/services/audio-transcription-service";
import { classifyCommercialSignal, type CommercialSignal } from "@/lib/services/commercial-status-service";
import { createCrmNotification } from "@/lib/services/crm-notification-service";
import { fetchWhatsAppProfilePicture, sanitizeWhatsAppText, sendWhatsAppText } from "@/lib/services/evolution-api";
import { analyzeAndSavePaymentReceipt, isPotentialPixReceipt } from "@/lib/services/payment-receipt-service";
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

  const mediaProcessing = await processInboundMedia(input);
  const inbound = mediaProcessing.textForAi
    ? { ...input, text: mediaProcessing.textForAi }
    : input;

  let leadSignal = classifyLeadSignal(inbound.text);
  const lead = await upsertLead(inbound, leadSignal);
  const conversationState = await upsertConversation(lead.id, inbound.externalChatId);
  let conversation = conversationState.conversation;
  let triage: AiTriageResult | null = null;
  const shouldStartAiFlow = isAiEligibleInbound(inbound);

  if (!inbound.fromMe && !conversationState.created && conversation.status !== "ai") {
    leadSignal = { ...leadSignal, pipelineStage: "atendimento" };
    await db
      .update(leads)
      .set({
        pipeline_stage: "atendimento",
        last_message_preview: inbound.text.slice(0, 280),
        last_interaction_at: new Date(),
        updated_at: new Date(),
        modified_by: SYSTEM_USER_ID
      })
      .where(and(eq(leads.id, lead.id), eq(leads.is_deleted, false), notInArray(leads.pipeline_stage, ["fechado", "perdido", "matricula_pendente"])));
  }

  if (!inbound.fromMe && conversationState.created && shouldStartAiFlow) {
    triage = await triageInitialConversation({
      leadName: inbound.leadName,
      messages: [{ role: "lead", content: inbound.text }]
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
  } else if (!inbound.fromMe && conversationState.created && !shouldStartAiFlow) {
    const manualQueue = await applyInitialManualQueue(conversation.id, lead.id, inbound);
    conversation = manualQueue.conversation;
    leadSignal = { ...leadSignal, pipelineStage: "atendimento" };
    await logAiDecision({
      conversationId: conversation.id,
      leadId: lead.id,
      action: "ai_mode_skipped",
      reason: "Lead novo sem origem de anuncio. Conversa registrada com IA pausada para triagem humana.",
      mode: "human",
      safetyStatus: "ok",
      metadata: {
        sourcePolicy: "ads_only",
        marketing: inbound.marketing
      }
    });
  }

  if (!inbound.fromMe) {
    await resetLeadFollowUpOnCustomerReply(lead.id);
    if (conversationState.created && !shouldStartAiFlow) {
      await pauseLeadFollowUp(lead.id);
    }
  }

  const [message] = await db
    .insert(messages)
    .values({
      conversation_id: conversation.id,
      external_message_id: inbound.externalMessageId,
      role: inbound.fromMe ? "human" : "lead",
      content: inbound.text,
      metadata: {
        source: "evolution",
        marketing: inbound.marketing,
        autoStartPolicy: {
          mode: "ads_only",
          eligibleForAi: shouldStartAiFlow
        },
        leadSignal: serializeLeadSignalForMetadata(leadSignal),
        triage,
        messageType: inbound.messageType,
        media: inbound.media
          ? {
            ...inbound.media,
            transcription: mediaProcessing.audioTranscription?.text || undefined,
            transcriptionStatus: mediaProcessing.audioTranscription?.status,
            transcriptionReason: mediaProcessing.audioTranscription?.reason
          }
          : undefined,
        originalContent: mediaProcessing.originalText !== inbound.text ? mediaProcessing.originalText : undefined
      },
      modified_by: SYSTEM_USER_ID
    })
    .onConflictDoNothing({ target: messages.external_message_id })
    .returning();

  if (!message && inbound.externalMessageId) {
    const duplicatedAfterRace = await findDuplicatedEvolutionMessage(inbound.externalMessageId);
    if (duplicatedAfterRace) {
      console.info("[conversation-service] duplicated evolution message ignored after insert race", {
        conversationId: duplicatedAfterRace.conversation.id,
        externalMessageId: inbound.externalMessageId
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
      context_summary: buildContextSummary(inbound.text, leadSignal, triage),
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

  if (!inbound.fromMe) {
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

  if (!inbound.fromMe) {
    const receiptCandidate = isPotentialPixReceipt(inbound);
    const commercialSignal = classifyCommercialSignal(inbound, receiptCandidate);
    let paymentReceipt: Awaited<ReturnType<typeof analyzeAndSavePaymentReceipt>> | null = null;

    if (receiptCandidate) {
      paymentReceipt = await analyzeAndSavePaymentReceipt({
        leadId: lead.id,
        conversationId: conversation.id,
        messageId: message.id,
        inbound
      });
    }

    conversation = await applyCommercialSignal({
      leadId: lead.id,
      leadName: lead.name ?? inbound.leadName,
      leadPhone: lead.phone,
      conversation,
      messageId: message.id,
      signal: commercialSignal,
      lastMessage: inbound.text,
      marketing: inbound.marketing,
      paymentReceipt
    });
  }

  await publishRealtimeEvent({
    type: "message.created",
    conversationId: conversation.id,
    payload: { message }
  });

  if (!inbound.fromMe && conversation.status === "ai") {
    await pushToConversationBuffer({
      conversationId: conversation.id,
      messageId: message.id,
      content: inbound.text,
      receivedAt: new Date().toISOString()
    });
    await scheduleBufferProcessing(conversation.id);
  }

  return { lead, conversation, message, duplicated: false };
}

async function processInboundMedia(input: NormalizedInboundMessage): Promise<{
  originalText: string;
  textForAi?: string;
  audioTranscription?: AudioTranscriptionResult;
}> {
  if (input.fromMe || input.media?.type !== "audio") {
    return { originalText: input.text };
  }

  const audioTranscription = await transcribeInboundAudio(input.media, {
    remoteJid: input.externalChatId,
    messageId: input.externalMessageId,
    fromMe: input.fromMe
  });
  if (audioTranscription.status === "transcribed") {
    return {
      originalText: input.text,
      textForAi: `Audio transcrito do cliente: ${audioTranscription.text}`,
      audioTranscription
    };
  }

  return {
    originalText: input.text,
    textForAi: [
      "Cliente enviou um audio, mas nao foi possivel transcrever automaticamente.",
      "Nao invente o conteudo do audio.",
      "Peca para o cliente enviar a informacao por texto ou acione atendimento humano se for necessario."
    ].join(" "),
    audioTranscription
  };
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

async function applyCommercialSignal(input: {
  leadId: string;
  leadName?: string | null;
  leadPhone: string;
  conversation: typeof conversations.$inferSelect;
  messageId: string;
  signal: CommercialSignal;
  lastMessage: string;
  marketing?: NormalizedInboundMessage["marketing"];
  paymentReceipt?: Awaited<ReturnType<typeof analyzeAndSavePaymentReceipt>> | null;
}) {
  const now = new Date();
  const shouldMoveToHuman =
    input.signal.status === "aguardando_validacao_pagamento"
    || input.signal.status === "atendimento_humano_necessario";

  await db
    .update(leads)
    .set({
      commercial_status: input.signal.status,
      pipeline_stage: input.signal.pipelineStage ?? undefined,
      temperature: input.signal.temperature ?? undefined,
      last_message_preview: input.lastMessage.slice(0, 280),
      last_interaction_at: now,
      enrollment_closed_at: input.signal.status === "venda" ? now : undefined,
      updated_at: now,
      modified_by: SYSTEM_USER_ID
    })
    .where(and(eq(leads.id, input.leadId), eq(leads.is_deleted, false)));

  let conversation = input.conversation;

  if (shouldMoveToHuman) {
    const [updated] = await db
      .update(conversations)
      .set({
        status: "human",
        ai_paused_reason: input.signal.reason,
        context_summary: [
          input.conversation.context_summary,
          `Status comercial: ${input.signal.status}. ${input.signal.reason}`
        ].filter(Boolean).join(" "),
        updated_at: now,
        modified_by: SYSTEM_USER_ID
      })
      .where(and(eq(conversations.id, input.conversation.id), eq(conversations.is_deleted, false)))
      .returning();

    if (updated) conversation = updated;
    await clearConversationBuffer(input.conversation.id);
    await pauseLeadFollowUp(input.leadId);
  }

  if (input.signal.shouldNotify) {
    await createCrmNotification({
      leadId: input.leadId,
      conversationId: input.conversation.id,
      messageId: input.messageId,
      type: input.signal.notificationType ?? "human_required",
      title: getCommercialNotificationTitle(input.signal.status),
      body: [
        input.leadName || "Lead sem nome",
        input.leadPhone,
        input.marketing?.origin ? `Origem: ${input.marketing.origin}` : null,
        `Status: ${input.signal.status}`,
        `Ultima mensagem: ${input.lastMessage.slice(0, 180)}`
      ].filter(Boolean).join(" | "),
      payload: {
        origin: input.marketing?.origin,
        marketing: input.marketing,
        reason: input.signal.reason,
        lastMessage: input.lastMessage,
        conversationUrl: `/conversas?conversationId=${input.conversation.id}`,
        paymentReceipt: input.paymentReceipt
          ? {
            id: input.paymentReceipt.receipt.id,
            fileUrl: input.paymentReceipt.receipt.file_url,
            amountText: input.paymentReceipt.receipt.amount_text,
            paidAtText: input.paymentReceipt.receipt.paid_at_text,
            payerName: input.paymentReceipt.receipt.payer_name,
            receiverName: input.paymentReceipt.receipt.receiver_name,
            transactionId: input.paymentReceipt.receipt.transaction_id,
            detected: input.paymentReceipt.receipt.detected
          }
          : undefined
      }
    });
  }

  if (input.signal.status === "aguardando_validacao_pagamento") {
    await sendPaymentReceiptAck({
      leadId: input.leadId,
      conversationId: input.conversation.id,
      phone: input.leadPhone,
      sourceMessageId: input.messageId
    });
  }

  await logAiDecision({
    conversationId: input.conversation.id,
    leadId: input.leadId,
    messageId: input.messageId,
    action: input.signal.status === "atendimento_humano_necessario" ? "human_handoff_triggered" : "ai_qualified_lead",
    reason: input.signal.reason,
    mode: conversation.status,
    safetyStatus: "ok",
    metadata: {
      commercialStatus: input.signal.status,
      pipelineStage: input.signal.pipelineStage,
      notificationType: input.signal.notificationType,
      paymentReceiptId: input.paymentReceipt?.receipt.id
    }
  });

  return conversation;
}

async function sendPaymentReceiptAck(input: {
  leadId: string;
  conversationId: string;
  phone: string;
  sourceMessageId: string;
}) {
  const text = "Recebi seu comprovante e encaminhei para conferencia. Ja vamos validar para dar continuidade.";

  try {
    await sendWhatsAppText({ phone: input.phone, text });
    const [aiMessage] = await db
      .insert(messages)
      .values({
        conversation_id: input.conversationId,
        role: "ai",
        content: text,
        metadata: { source: "payment_receipt_ack", sourceMessageId: input.sourceMessageId },
        modified_by: SYSTEM_USER_ID
      })
      .returning();

    await appendRecentConversationContext({
      conversationId: input.conversationId,
      messageId: aiMessage.id,
      role: aiMessage.role,
      content: aiMessage.content,
      createdAt: new Date().toISOString()
    });

    await publishRealtimeEvent({
      type: "message.created",
      conversationId: input.conversationId,
      payload: { message: aiMessage }
    });
  } catch (error) {
    console.warn("[conversation-service] failed to send payment receipt acknowledgement", error);
  }
}

function getCommercialNotificationTitle(status: string) {
  const titles: Record<string, string> = {
    aguardando_validacao_pagamento: "Comprovante PIX recebido",
    aguardando_comprovante: "Lead com intencao de compra",
    atendimento_humano_necessario: "Atendimento humano necessario"
  };

  return titles[status] ?? "Atualizacao comercial do lead";
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

  console.info("[conversation-service] buffered messages grouped for ai reply", {
    conversationId,
    count: buffered.length,
    messageIds: buffered.map((item) => item.messageId)
  });

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

  if (!updated) {
    throw new Error("Nao foi possivel atualizar o status da conversa.");
  }

  if (toStatus === "human" || toStatus === "ai") {
    if (toStatus === "human") {
      try {
        await clearConversationBuffer(conversationId);
      } catch (error) {
        console.warn("[conversation-service] failed to clear buffer after human handoff", error);
      }
      try {
        await pauseLeadFollowUp(current.lead_id, userId);
      } catch (error) {
        console.warn("[conversation-service] failed to pause follow-up after handoff", error);
      }
    } else {
      try {
        await resumeLeadFollowUp(current.lead_id, userId);
      } catch (error) {
        console.warn("[conversation-service] failed to resume follow-up after return to ai", error);
      }
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

  try {
    await db.insert(handoffEvents).values({
      conversation_id: conversationId,
      from_status: current.status,
      to_status: toStatus,
      reason,
      modified_by: userId
    });
  } catch (error) {
    console.warn("[conversation-service] failed to write handoff event", error);
  }

  try {
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
  } catch (error) {
    console.warn("[conversation-service] failed to log handoff decision", error);
  }

  try {
    await publishRealtimeEvent({
      type: "handoff.changed",
      conversationId,
      payload: { conversation: updated }
    });
  } catch (error) {
    console.warn("[conversation-service] failed to publish handoff event", error);
  }

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
  commercialStatus?: string;
  interest?: string;
  enrollmentClosedAt?: Date;
};

async function upsertLead(input: NormalizedInboundMessage, signal: LeadSignal) {
  const now = new Date();
  const name = input.leadName?.trim() || undefined;
  const avatarUrl = input.avatarUrl ?? await fetchWhatsAppProfilePicture(input.phone);
  const origin = input.marketing?.origin ?? "WhatsApp";
  const tags = input.marketing?.isAdLead ? ["anuncio", input.marketing.platform ?? "meta"].filter(Boolean) : undefined;

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
        origin: input.marketing?.isAdLead ? origin : existing.origin,
        tags: tags ?? existing.tags,
        interest: signal.interest ?? existing.interest,
        temperature: signal.temperature,
        sentiment: signal.sentiment,
        commercial_status: signal.commercialStatus ?? existing.commercial_status ?? "em_atendimento",
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
      origin,
      interest: signal.interest,
      temperature: signal.temperature,
      sentiment: signal.sentiment,
      commercial_status: signal.commercialStatus ?? "em_atendimento",
      pipeline_stage: signal.pipelineStage,
      last_message_preview: input.text.slice(0, 280),
      last_interaction_at: now,
      enrollment_closed_at: signal.enrollmentClosedAt,
      tags: tags ?? [],
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

function isAiEligibleInbound(input: NormalizedInboundMessage) {
  if (input.fromMe) return false;
  return Boolean(input.marketing?.isAdLead);
}

function serializeLeadSignalForMetadata(signal: LeadSignal) {
  return {
    ...signal,
    enrollmentClosedAt: signal.enrollmentClosedAt?.toISOString()
  };
}

async function applyInitialTriage(conversationId: string, leadId: string, triage: AiTriageResult) {
  const toStatus = triage.action === "pause_ai" ? "human" : "ai";
  const now = new Date();

  const [conversation] = await db
    .update(conversations)
    .set({
      status: toStatus,
      assigned_to: null,
      ai_paused_reason: triage.action === "pause_ai" ? `Triagem: ${triage.reason}` : null,
      context_summary: `Triagem: ${triage.type}. Acao: ${triage.action}. Motivo: ${triage.reason}`,
      last_message_at: now,
      updated_at: now,
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
      last_interaction_at: now,
      updated_at: now,
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

async function applyInitialManualQueue(conversationId: string, leadId: string, input: NormalizedInboundMessage) {
  const now = new Date();

  const [conversation] = await db
    .update(conversations)
    .set({
      status: "human",
      assigned_to: null,
      ai_paused_reason: "Lead novo sem origem de anuncio. IA pausada pela politica inicial ads_only.",
      context_summary: [
        "Entrada registrada sem sinal de anuncio.",
        "Politica atual: somente leads de anuncios entram no fluxo automatico da IA.",
        `Origem detectada: ${input.marketing?.origin ?? "WhatsApp"}.`
      ].join(" "),
      last_message_at: now,
      updated_at: now,
      modified_by: SYSTEM_USER_ID
    })
    .where(and(eq(conversations.id, conversationId), eq(conversations.is_deleted, false)))
    .returning();

  await db
    .update(leads)
    .set({
      pipeline_stage: "atendimento",
      last_interaction_at: now,
      updated_at: now,
      modified_by: SYSTEM_USER_ID
    })
    .where(and(eq(leads.id, leadId), eq(leads.is_deleted, false)));

  await pauseLeadFollowUp(leadId);
  await clearConversationBuffer(conversationId);

  if (!conversation) {
    const [current] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.is_deleted, false)))
      .limit(1);

    if (!current) {
      throw new Error("Conversa nao encontrada apos pausa inicial.");
    }

    return { conversation: current };
  }

  console.info("[conversation-service] non-ad lead routed to human queue", {
    conversationId,
    leadId,
    origin: input.marketing?.origin
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
