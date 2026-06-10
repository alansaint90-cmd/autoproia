import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { processBufferedConversation, registerInboundMessage } from "@/lib/services/conversation-service";
import { getMessageBufferWindowMs } from "@/lib/services/message-buffer";
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
    const secret = getWebhookSecret(request);
    if (secret !== env.EVOLUTION_WEBHOOK_SECRET) {
      console.warn("[evolution-webhook] unauthorized webhook request");
      return NextResponse.json({ error: "Webhook nao autorizado." }, { status: 401 });
    }
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }
  console.info("[evolution-webhook] payload received", {
    event: body?.event,
    instance: body?.instance,
    messageType: body?.data?.messageType,
    fromMe: body?.data?.key?.fromMe
  });

  if (body?.event !== "messages.upsert") {
    console.info("[evolution-webhook] ignored non inbound-message event", {
      event: body?.event,
      instance: body?.instance
    });
    return NextResponse.json({ ignored: true, event: body?.event ?? null });
  }

  const parsed = evolutionWebhookSchema.safeParse(body);

  if (!parsed.success) {
    console.warn("[evolution-webhook] invalid payload", parsed.error.flatten());
    return NextResponse.json({ error: "Payload invalido.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const inbound = normalizeEvolutionMessage(parsed.data);
  if (!inbound) {
    console.info("[evolution-webhook] ignored unsupported or empty message");
    return NextResponse.json({ ignored: true });
  }

  try {
    const result = await registerInboundMessage(inbound);

    if (!result.duplicated && !inbound.fromMe && result.conversation.status === "ai") {
      const bufferWindowMs = getMessageBufferWindowMs();
      setTimeout(() => {
        processBufferedConversation(result.conversation.id).catch((error) => {
          console.error("[evolution-webhook] buffer processing failed", error);
        });
      }, bufferWindowMs);
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

function getWebhookSecret(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  return (
    request.headers.get("x-webhook-secret") ??
    request.headers.get("x-evolution-webhook-secret") ??
    request.headers.get("x-api-key") ??
    request.headers.get("apikey") ??
    bearer ??
    request.nextUrl.searchParams.get("secret")
  );
}
