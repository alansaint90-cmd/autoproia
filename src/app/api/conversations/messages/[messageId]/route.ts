import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { assertPermission } from "@/lib/services/permission-service";

export const runtime = "nodejs";

type MessageMutationRow = {
  id: string;
  conversation_id: string;
  content: string;
};

const editMessageSchema = z.object({
  content: z.string().trim().min(1, "A mensagem nao pode ficar vazia.")
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ messageId: string }> }) {
  try {
    const session = await getSession();
    await assertPermission(session.role, "replyConversations");

    const params = await context.params;
    const messageId = params.messageId;
    const body = editMessageSchema.parse(await request.json().catch(() => ({})));

    const [message] = await db.execute<MessageMutationRow>(sql`
      update messages
      set
        content = ${body.content},
        metadata = coalesce(metadata, '{}'::jsonb) || ${JSON.stringify({
          edited: true,
          editedAt: new Date().toISOString(),
          editedBy: session.userId
        })}::jsonb,
        updated_at = now(),
        modified_by = ${session.userId}
      where id = ${messageId}
        and is_deleted = false
        and role in ('ai', 'human')
      returning id, conversation_id, content
    `);

    if (!message) {
      return NextResponse.json({ error: "Mensagem enviada nao encontrada para edicao." }, { status: 404 });
    }

    await refreshConversationPreview(message.conversation_id, session.userId);

    return NextResponse.json({ ok: true, message });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel editar a mensagem." },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ messageId: string }> }) {
  try {
    const session = await getSession();
    await assertPermission(session.role, "replyConversations");

    const params = await context.params;
    const messageId = params.messageId;

    const [message] = await db.execute<MessageMutationRow>(sql`
      update messages
      set
        is_deleted = true,
        deleted_at = now(),
        metadata = coalesce(metadata, '{}'::jsonb) || ${JSON.stringify({
          deletedFromChat: true,
          deletedAt: new Date().toISOString(),
          deletedBy: session.userId
        })}::jsonb,
        updated_at = now(),
        modified_by = ${session.userId}
      where id = ${messageId}
        and is_deleted = false
        and role in ('ai', 'human')
      returning id, conversation_id, content
    `);

    if (!message) {
      return NextResponse.json({ error: "Mensagem enviada nao encontrada para exclusao." }, { status: 404 });
    }

    await refreshConversationPreview(message.conversation_id, session.userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel apagar a mensagem." },
      { status: 500 }
    );
  }
}

async function refreshConversationPreview(conversationId: string, userId: string) {
  await db.execute(sql`
    with target as (
      select c.id as conversation_id, c.lead_id
      from conversations c
      where c.id = ${conversationId}
        and c.is_deleted = false
      limit 1
    ),
    latest as (
      select target.lead_id, m.content, m.created_at
      from target
      left join lateral (
        select content, created_at
        from messages
        where conversation_id = target.conversation_id
          and is_deleted = false
        order by created_at desc
        limit 1
      ) m on true
    )
    update leads
    set
      last_message_preview = coalesce((select content from latest), last_message_preview),
      last_interaction_at = coalesce((select created_at from latest), last_interaction_at),
      updated_at = now(),
      modified_by = ${userId}
    where id = (select lead_id from latest)
      and is_deleted = false
  `);

  await db.execute(sql`
    update conversations
    set
      last_message_at = coalesce(
        (
          select created_at
          from messages
          where conversation_id = ${conversationId}
            and is_deleted = false
          order by created_at desc
          limit 1
        ),
        last_message_at
      ),
      updated_at = now(),
      modified_by = ${userId}
    where id = ${conversationId}
      and is_deleted = false
  `);
}
