import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { assertPermission } from "@/lib/services/permission-service";
import { fetchWhatsAppProfilePicture } from "@/lib/services/evolution-api";

export const runtime = "nodejs";

type ConversationRow = {
  conversation_id: string;
  status: "ai" | "human" | "paused" | "closed";
  last_message_at: Date | string | null;
  archived_at: Date | string | null;
  muted_at: Date | string | null;
  pinned_at: Date | string | null;
  blocked_at: Date | string | null;
  cleared_at: Date | string | null;
  lead_id: string;
  lead_name: string | null;
  phone: string;
  avatar_url: string | null;
  origin: string;
  temperature: string;
  sentiment: string;
  commercial_status: string;
  pipeline_stage: string;
  last_message_preview: string | null;
  last_interaction_at: Date | string | null;
  follow_up_count: string | number | bigint;
  last_follow_up_at: Date | string | null;
  next_follow_up_at: Date | string | null;
  follow_up_paused_at: Date | string | null;
  interest: string | null;
  responsible_name: string | null;
  messages: Array<{
    id: string;
    role: "lead" | "ai" | "human" | "system";
    content: string;
    created_at: string;
    metadata?: Record<string, unknown> | null;
  }> | null;
};

function formatTime(value: Date | string | null) {
  if (!value) return "agora";

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

function initialsFromName(name: string) {
  return name
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function normalizePipelineStage(stage: string | null | undefined) {
  const value = stage ?? "novo";
  if (value === "qualificado" || value === "orcamento") return "atendimento";
  if (value === "negociacao" || value === "interessado" || value === "interessado_followup") return "followup";
  if (value === "matricula_realizada") return "fechado";
  if (["novo", "ia", "atendimento", "followup", "matricula_pendente", "fechado", "perdido"].includes(value)) return value;
  return "novo";
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    await assertPermission(session.role, "viewLeads");

    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 80), 1), 200);

    const rows = await db.execute<ConversationRow>(sql`
      select
        c.id as conversation_id,
        c.status,
        c.last_message_at,
        c.archived_at,
        c.muted_at,
        c.pinned_at,
        c.blocked_at,
        c.cleared_at,
        l.id as lead_id,
        l.name as lead_name,
        l.phone,
        l.avatar_url,
        l.origin,
        l.temperature,
        l.sentiment,
        l.commercial_status,
        l.pipeline_stage,
        l.last_message_preview,
        l.last_interaction_at,
        l.follow_up_count,
        l.last_follow_up_at,
        l.next_follow_up_at,
        l.follow_up_paused_at,
        l.interest,
        u.name as responsible_name,
        coalesce(
          (
            select json_agg(
              json_build_object(
                'id', ordered_messages.id,
                'role', ordered_messages.role,
                'content', ordered_messages.content,
                'created_at', ordered_messages.created_at,
                'metadata', ordered_messages.metadata
              )
              order by ordered_messages.created_at asc
            )
            from (
              select m.id, m.role, m.content, m.created_at, m.metadata
              from messages m
              where m.conversation_id = c.id
                and m.is_deleted = false
                and (c.cleared_at is null or m.created_at > c.cleared_at)
              order by m.created_at desc
              limit 40
            ) ordered_messages
          ),
          '[]'::json
        ) as messages
      from conversations c
      inner join leads l on l.id = c.lead_id and l.is_deleted = false
      left join users u on u.id = c.assigned_to and u.is_deleted = false
      where c.is_deleted = false
      order by c.last_message_at desc
      limit ${limit}
    `);

    const missingAvatarRows = rows.filter((row) => !row.avatar_url).slice(0, 8);
    if (missingAvatarRows.length > 0) {
      await Promise.all(
        missingAvatarRows.map(async (row) => {
          const avatarUrl = await fetchWhatsAppProfilePicture(row.phone);
          if (!avatarUrl) return;

          row.avatar_url = avatarUrl;
          await db.execute(sql`
            update leads
            set avatar_url = ${avatarUrl}, updated_at = now()
            where id = ${row.lead_id}
              and is_deleted = false
          `);
        })
      );
    }

    const conversations = rows.map((row) => {
      const name = row.lead_name?.trim() || row.phone;
      const lastMessage = row.messages?.at(-1)?.content ?? row.last_message_preview ?? "";

      return {
        id: row.conversation_id,
        archived: Boolean(row.archived_at),
        muted: Boolean(row.muted_at),
        pinned: Boolean(row.pinned_at),
        blocked: Boolean(row.blocked_at),
        cleared: Boolean(row.cleared_at),
        lead: {
          id: row.lead_id,
          name,
          phone: row.phone,
          origin: row.origin,
          temperature: row.temperature,
          commercialStatus: row.commercial_status,
          lastInteraction: formatTime(row.last_interaction_at ?? row.last_message_at),
          responsible: row.responsible_name ?? "Equipe comercial",
          avatar: row.avatar_url ?? "",
          stage: normalizePipelineStage(row.pipeline_stage),
          interest: row.interest ?? "carro",
          notes: row.last_message_preview ?? "",
          sentiment: row.sentiment,
          followUpCount: Number(row.follow_up_count ?? 0),
          lastFollowUpAt: row.last_follow_up_at ? new Date(row.last_follow_up_at).toISOString() : null,
          nextFollowUpAt: row.next_follow_up_at ? new Date(row.next_follow_up_at).toISOString() : null,
          followUpPausedAt: row.follow_up_paused_at ? new Date(row.follow_up_paused_at).toISOString() : null
        },
        online: false,
        unread: 0,
        preview: lastMessage,
        status: row.status,
        messages: (row.messages ?? []).map((message) => ({
          id: message.id,
          from: message.role === "ai" ? "ia" : message.role === "human" ? "human" : "lead",
          text: message.content,
          time: formatTime(message.created_at),
          media: normalizeMessageMedia(message.metadata)
        })),
        initials: initialsFromName(name)
      };
    });

    return NextResponse.json({ ok: true, conversations, count: conversations.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel carregar conversas." },
      { status: 403 }
    );
  }
}

function normalizeMessageMedia(metadata: Record<string, unknown> | null | undefined) {
  const media = metadata && typeof metadata === "object" && typeof metadata.media === "object" && metadata.media !== null
    ? metadata.media as Record<string, unknown>
    : metadata && typeof metadata === "object" && typeof metadata.attachment === "object" && metadata.attachment !== null
      ? metadata.attachment as Record<string, unknown>
      : null;

  if (!media) return undefined;

  const type = typeof media.type === "string" ? media.type : "";
  if (!["audio", "image", "video", "document"].includes(type)) return undefined;

  const mimeType = typeof media.mimeType === "string" ? media.mimeType : undefined;
  const base64 = typeof media.base64 === "string" ? media.base64 : undefined;
  const dataUrl = base64 ? toDataUrl(base64, mimeType) : undefined;
  const sourceUrl = typeof media.url === "string" ? media.url : undefined;

  return {
    type,
    sourceUrl,
    dataUrl,
    fileName: typeof media.fileName === "string" ? media.fileName : undefined,
    mimeType,
    caption: typeof media.caption === "string" ? media.caption : undefined,
    transcription: typeof media.transcription === "string" ? media.transcription : undefined,
    transcriptionStatus: typeof media.transcriptionStatus === "string" ? media.transcriptionStatus : undefined
  };
}

function toDataUrl(value: string, mimeType?: string) {
  if (value.startsWith("data:")) return value;
  return `data:${mimeType || "application/octet-stream"};base64,${value}`;
}
