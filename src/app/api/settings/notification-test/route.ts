import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { sendWhatsAppText } from "@/lib/services/evolution-api";
import { assertPermission } from "@/lib/services/permission-service";

const fallbackRecipients = ["5571988480222", "5571996729683"];

function errorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("Sessao invalida") || message.includes("expirada")) return 401;
  if (message.includes("Sem permissao")) return 403;

  return 500;
}

export async function POST() {
  try {
    const session = await getSession();
    await assertPermission(session.role, "manageAi");

    const recipients = getRecipients();
    if (recipients.length === 0) {
      return NextResponse.json({ error: "Nenhum numero de notificacao configurado." }, { status: 400 });
    }

    const text = [
      "[TESTE AUTO PRO IA]",
      "",
      "Mensagem de teste enviada pelo painel IA Comercial.",
      "Se voce recebeu esta mensagem, o canal de notificacao do WhatsApp esta funcionando."
    ].join("\n");

    const results = await Promise.allSettled(
      recipients.map(async (phone) => {
        await sendWhatsAppText({ phone, text });
        return phone;
      })
    );

    const sent = results
      .map((result, index) => ({ result, phone: recipients[index] }))
      .filter((item): item is { result: PromiseFulfilledResult<string>; phone: string } => item.result.status === "fulfilled")
      .map((item) => item.phone);
    const failed = results
      .map((result, index) => ({ result, phone: recipients[index] }))
      .filter((item): item is { result: PromiseRejectedResult; phone: string } => item.result.status === "rejected")
      .map((item) => ({
        phone: item.phone,
        error: item.result.reason instanceof Error ? item.result.reason.message : "Falha desconhecida"
      }));

    return NextResponse.json({ sent, failed });
  } catch (error) {
    console.error("[notification-test] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel testar as notificacoes." },
      { status: errorStatus(error) }
    );
  }
}

function getRecipients() {
  const configured = (env.NOTIFICATION_WHATSAPP_NUMBERS ?? "")
    .split(",")
    .map((phone) => phone.replace(/\D/g, ""))
    .filter((phone) => phone.length >= 12);

  return Array.from(new Set(configured.length > 0 ? configured : fallbackRecipients));
}
