import { NextResponse } from "next/server";
import { processBufferedConversation } from "@/lib/services/conversation-service";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ conversationId: string }> }) {
  const params = await context.params;
  const result = await processBufferedConversation(params.conversationId);

  return NextResponse.json(result);
}
