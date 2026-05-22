import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { processBufferedConversation, registerInboundMessage } from "@/lib/services/conversation-service";
import { evolutionWebhookSchema } from "@/lib/validators/evolution";
import { normalizeEvolutionMessage } from "@/lib/whatsapp/normalizer";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (env.EVOLUTION_WEBHOOK_SECRET) {
    const secret = request.headers.get("x-webhook-secret");
    if (secret !== env.EVOLUTION_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Webhook nao autorizado." }, { status: 401 });
    }
  }

  const body = await request.json();
  const parsed = evolutionWebhookSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const inbound = normalizeEvolutionMessage(parsed.data);
  if (!inbound) {
    return NextResponse.json({ ignored: true });
  }

  const result = await registerInboundMessage(inbound);

  if (!inbound.fromMe && result.conversation.status === "ai") {
    setTimeout(() => {
      processBufferedConversation(result.conversation.id).catch(console.error);
    }, 8_000);
  }

  return NextResponse.json({ ok: true, conversationId: result.conversation.id });
}
