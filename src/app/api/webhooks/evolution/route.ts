import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { processBufferedConversation, registerInboundMessage } from "@/lib/services/conversation-service";
import { evolutionWebhookSchema } from "@/lib/validators/evolution";
import { normalizeEvolutionMessage } from "@/lib/whatsapp/normalizer";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/webhooks/evolution",
    message: "Webhook Evolution ativo. Configure esta URL na Evolution usando POST."
  });
}

export async function POST(request: NextRequest) {
  if (env.EVOLUTION_WEBHOOK_SECRET) {
    const secret = request.headers.get("x-webhook-secret");
    if (secret !== env.EVOLUTION_WEBHOOK_SECRET) {
      console.warn("[evolution-webhook] unauthorized webhook request");
      return NextResponse.json({ error: "Webhook nao autorizado." }, { status: 401 });
    }
  }

  const body = await request.json();
  console.info("[evolution-webhook] payload received", {
    event: body?.event,
    instance: body?.instance,
    messageType: body?.data?.messageType,
    fromMe: body?.data?.key?.fromMe
  });

  const parsed = evolutionWebhookSchema.safeParse(body);

  if (!parsed.success) {
    console.warn("[evolution-webhook] invalid payload", parsed.error.flatten());
    return NextResponse.json({ error: "Payload invalido.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const inbound = normalizeEvolutionMessage(parsed.data);
  if (!inbound) {
    console.info("[evolution-webhook] ignored non-text message");
    return NextResponse.json({ ignored: true });
  }

  try {
    const result = await registerInboundMessage(inbound);

    if (!inbound.fromMe && result.conversation.status === "ai") {
      setTimeout(() => {
        processBufferedConversation(result.conversation.id).catch((error) => {
          console.error("[evolution-webhook] buffer processing failed", error);
        });
      }, 8_000);
    }

    console.info("[evolution-webhook] message registered", {
      conversationId: result.conversation.id,
      leadId: result.lead.id
    });

    return NextResponse.json({ ok: true, conversationId: result.conversation.id });
  } catch (error) {
    console.error("[evolution-webhook] failed to register inbound message", error);
    return NextResponse.json(
      { error: "Falha ao registrar mensagem recebida." },
      { status: 500 }
    );
  }
}
