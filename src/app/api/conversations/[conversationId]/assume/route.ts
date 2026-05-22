import { NextRequest, NextResponse } from "next/server";
import { assertCan } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";
import { assumeConversation } from "@/lib/services/conversation-service";
import { handoffSchema } from "@/lib/validators/evolution";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  const session = await getSession();
  assertCan(session.role, "operador");

  const params = await context.params;
  const body = handoffSchema.parse(await request.json().catch(() => ({})));
  const conversation = await assumeConversation(params.conversationId, session.userId, body.reason);

  return NextResponse.json({ conversation });
}
