import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { appendRecentConversationContext } from "@/lib/services/message-buffer";
import { assertPermission } from "@/lib/services/permission-service";
import { pauseLeadFollowUp } from "@/lib/services/follow-up-service";
import { publishRealtimeEvent } from "@/lib/services/realtime";
import { sanitizeWhatsAppText, sendWhatsAppText } from "@/lib/services/evolution-api";

export const runtime = "nodejs";

type ConversationTarget = {
  conversation_id: string;
  lead_id: string;
  lead_name: string | null;
  phone: string;
};

type CreatedMessage = {
  id: string;
  created_at: Date | string;
};

function formatMessageTime(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "agora";

  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? "ontem" : `${diffDays} dias`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    await assertPermission(session.role, "replyConversations");

    const body = (await request.json().catch(() => ({}))) as { leadId?: unknown; text?: unknown };
    const leadId = typeof body.leadId === "string" ? body.leadId.trim() : "";
    const text = sanitizeWhatsAppText(typeof body.text === "string" ? body.text : "");

    if (!leadId || !text) {
      return NextResponse.json({ error: "Informe o lead e a mensagem para envio." }, { status: 400 });
    }

    const [target] = await db.execute<ConversationTarget>(sql`
      select
        c.id as conversation_id,
        l.id as lead_id,
        l.name as lead_name,
        l.phone
      from conversations c
      inner join leads l on l.id = c.lead_id and l.is_deleted = false
      where c.lead_id = ${leadId}
        and c.is_deleted = false
      order by c.last_message_at desc
      limit 1
    `);

    if (!target) {
      return NextResponse.json({ error: "Conversa nao encontrada para este lead." }, { status: 404 });
    }

    await sendWhatsAppText({ phone: target.phone, text });

    const [createdMessage] = await db.execute<CreatedMessage>(sql`
      insert into messages (conversation_id, role, content, metadata, modified_by)
      values (
        ${target.conversation_id},
        'human',
        ${text},
        ${JSON.stringify({ source: "manual", userId: session.userId, sender: session.name })}::jsonb,
        ${session.userId}
      )
      returning id, created_at
    `);

    await db.execute(sql`
      update conversations
      set
        status = 'human',
        assigned_to = ${session.userId},
        last_message_at = now(),
        updated_at = now(),
        modified_by = ${session.userId}
      where id = ${target.conversation_id}
    `);

    await db.execute(sql`
      update leads
      set
        last_message_preview = ${text},
        last_interaction_at = now(),
        next_follow_up_at = null,
        follow_up_paused_at = now(),
        pipeline_stage = case
          when pipeline_stage in ('fechado', 'perdido', 'matricula_pendente') then pipeline_stage
          else 'atendimento'
        end,
        updated_at = now(),
        modified_by = ${session.userId}
      where id = ${target.lead_id}
    `);
    await pauseLeadFollowUp(target.lead_id, session.userId);

    const message = {
      id: createdMessage?.id ?? randomUUID(),
      from: "human" as const,
      text,
      time: createdMessage?.created_at ? formatMessageTime(createdMessage.created_at) : "agora"
    };

    await appendRecentConversationContext({
      conversationId: target.conversation_id,
      messageId: message.id,
      role: "human",
      content: text,
      createdAt: new Date().toISOString()
    });

    await publishRealtimeEvent({
      type: "message.created",
      conversationId: target.conversation_id,
      payload: {
        message,
        leadId: target.lead_id
      }
    });

    return NextResponse.json({ ok: true, message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel enviar a mensagem.";
    const status = message.toLowerCase().includes("permiss") || message.toLowerCase().includes("sessao") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
