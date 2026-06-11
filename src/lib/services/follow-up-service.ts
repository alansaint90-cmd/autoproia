import { desc, eq, sql } from "drizzle-orm";
import { SYSTEM_USER_ID } from "@/lib/constants";
import { db } from "@/lib/db/client";
import { conversations, leads, messages } from "@/lib/db/schema";
import { generateAiFollowUp } from "@/lib/services/ai-agent";
import { logAiDecision } from "@/lib/services/ai-decision-log-service";
import { sanitizeWhatsAppText, sendWhatsAppText } from "@/lib/services/evolution-api";
import { appendRecentConversationContext, getRecentConversationContext } from "@/lib/services/message-buffer";
import { publishRealtimeEvent } from "@/lib/services/realtime";

type DueFollowUpRow = {
  conversation_id: string;
  lead_id: string;
  lead_name: string | null;
  phone: string;
  context_summary: string | null;
  follow_up_count: number;
  last_interaction_at: Date | string | null;
  last_message_at: Date | string;
};

const followUpScheduleHours: Record<number, number> = {
  1: 2,
  2: 24,
  3: 72,
  4: 168,
  5: 360
};

export function getNextFollowUpAt(followUpCount: number, from = new Date()) {
  const nextNumber = followUpCount + 1;
  const hours = followUpScheduleHours[nextNumber];
  if (!hours) return null;
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export async function scheduleLeadFollowUp(leadId: string, from = new Date()) {
  const nextFollowUpAt = getNextFollowUpAt(0, from);

  await db.execute(sql`
    update leads
    set
      follow_up_count = 0,
      last_follow_up_at = null,
      next_follow_up_at = ${toDbTimestamp(nextFollowUpAt)},
      follow_up_paused_at = null,
      updated_at = now(),
      modified_by = ${SYSTEM_USER_ID}
    where id = ${leadId}
      and is_deleted = false
      and pipeline_stage not in ('fechado', 'perdido', 'matricula_pendente')
  `);
}

export async function pauseLeadFollowUp(leadId: string, userId = SYSTEM_USER_ID) {
  await db.execute(sql`
    update leads
    set
      next_follow_up_at = null,
      follow_up_paused_at = now(),
      updated_at = now(),
      modified_by = ${userId}
    where id = ${leadId}
      and is_deleted = false
  `);
}

export async function resumeLeadFollowUp(leadId: string, userId = SYSTEM_USER_ID) {
  const nextFollowUpAt = getNextFollowUpAt(0);

  await db.execute(sql`
    update leads
    set
      next_follow_up_at = ${toDbTimestamp(nextFollowUpAt)},
      follow_up_paused_at = null,
      updated_at = now(),
      modified_by = ${userId}
    where id = ${leadId}
      and is_deleted = false
      and pipeline_stage not in ('fechado', 'perdido', 'matricula_pendente')
  `);
}

export async function resetLeadFollowUpOnCustomerReply(leadId: string) {
  await db.execute(sql`
    update leads
    set
      follow_up_count = 0,
      last_follow_up_at = null,
      next_follow_up_at = null,
      follow_up_paused_at = null,
      updated_at = now(),
      modified_by = ${SYSTEM_USER_ID}
    where id = ${leadId}
      and is_deleted = false
  `);
}

export async function processDueFollowUps(limit = 25) {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const dueLeads = await db.execute<DueFollowUpRow>(sql`
    select
      c.id as conversation_id,
      l.id as lead_id,
      l.name as lead_name,
      l.phone,
      c.context_summary,
      l.follow_up_count,
      l.last_interaction_at,
      c.last_message_at
    from leads l
    inner join conversations c on c.lead_id = l.id and c.is_deleted = false
    where l.is_deleted = false
      and c.status = 'ai'
      and l.follow_up_paused_at is null
      and l.next_follow_up_at is not null
      and l.next_follow_up_at <= now()
      and l.follow_up_count < 5
      and l.pipeline_stage not in ('fechado', 'perdido', 'matricula_pendente')
    order by l.next_follow_up_at asc
    limit ${safeLimit}
  `);

  const results = [];
  for (const dueLead of dueLeads) {
    results.push(await sendFollowUpForConversation(dueLead));
  }

  return {
    processed: results.length,
    results
  };
}

export async function sendFollowUpNow(leadId: string) {
  const [target] = await db.execute<DueFollowUpRow>(sql`
    select
      c.id as conversation_id,
      l.id as lead_id,
      l.name as lead_name,
      l.phone,
      c.context_summary,
      l.follow_up_count,
      l.last_interaction_at,
      c.last_message_at
    from leads l
    inner join conversations c on c.lead_id = l.id and c.is_deleted = false
    where l.id = ${leadId}
      and l.is_deleted = false
    order by c.last_message_at desc
    limit 1
  `);

  if (!target) {
    throw new Error("Lead ou conversa nao encontrado para follow-up.");
  }

  return sendFollowUpForConversation(target);
}

async function sendFollowUpForConversation(target: DueFollowUpRow) {
  const followUpNumber = Math.min(Number(target.follow_up_count ?? 0) + 1, 5);
  const recentContext = await getContext(target.conversation_id);
  const lastContactAt = target.last_interaction_at ?? target.last_message_at;
  const hoursWithoutResponse = Math.max(0, Math.round((Date.now() - new Date(lastContactAt).getTime()) / 3_600_000));

  const reply = await generateAiFollowUp({
    leadName: target.lead_name,
    contextSummary: target.context_summary,
    followUpNumber,
    hoursWithoutResponse,
    messages: recentContext
  });
  const cleanReply = sanitizeWhatsAppText(reply);

  await sendWhatsAppText({ phone: target.phone, text: cleanReply });

  const [message] = await db
    .insert(messages)
    .values({
      conversation_id: target.conversation_id,
      role: "ai",
      content: cleanReply,
      metadata: { source: "follow_up", followUpNumber },
      modified_by: SYSTEM_USER_ID
    })
    .returning();

  const nextFollowUpAt = followUpNumber >= 5 ? null : getNextFollowUpAt(followUpNumber);
  const nextTemperature = followUpNumber >= 4 ? "frio" : followUpNumber >= 2 ? "morno" : "quente";
  const nextStage = followUpNumber >= 5 ? "perdido" : "followup";

  await logAiDecision({
    conversationId: target.conversation_id,
    leadId: target.lead_id,
    messageId: message.id,
    action: "follow_up_sent",
    reason: `Follow-up automatico ${followUpNumber} enviado apos ${hoursWithoutResponse} horas sem resposta.`,
    mode: "follow_up",
    metadata: {
      followUpNumber,
      hoursWithoutResponse,
      nextFollowUpAt: nextFollowUpAt?.toISOString() ?? null
    }
  });

  await db.execute(sql`
    update leads
    set
      follow_up_count = ${followUpNumber},
      last_follow_up_at = now(),
      next_follow_up_at = ${toDbTimestamp(nextFollowUpAt)},
      follow_up_paused_at = ${toDbTimestamp(followUpNumber >= 5 ? new Date() : null)},
      temperature = ${nextTemperature},
      pipeline_stage = ${nextStage},
      last_message_preview = ${cleanReply.slice(0, 280)},
      last_interaction_at = now(),
      updated_at = now(),
      modified_by = ${SYSTEM_USER_ID}
    where id = ${target.lead_id}
      and is_deleted = false
  `);

  await db
    .update(conversations)
    .set({
      last_message_at: new Date(),
      updated_at: new Date(),
      modified_by: SYSTEM_USER_ID
    })
    .where(eq(conversations.id, target.conversation_id));

  await appendRecentConversationContext({
    conversationId: target.conversation_id,
    messageId: message.id,
    role: "ai",
    content: cleanReply,
    createdAt: new Date().toISOString()
  });

  await publishRealtimeEvent({
    type: "message.created",
    conversationId: target.conversation_id,
    payload: { message, leadId: target.lead_id, followUpNumber }
  });

  return {
    leadId: target.lead_id,
    conversationId: target.conversation_id,
    followUpNumber,
    nextFollowUpAt,
    message: cleanReply
  };
}

function toDbTimestamp(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

async function getContext(conversationId: string) {
  const redisContext = await getRecentConversationContext(conversationId);
  if (redisContext.length > 0) {
    return redisContext.map((message) => ({ role: message.role, content: message.content }));
  }

  const recentMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversation_id, conversationId))
    .orderBy(desc(messages.created_at))
    .limit(20);

  return recentMessages.reverse().map((message) => ({
    role: message.role,
    content: message.content
  }));
}
