import { env } from "@/lib/env";

type SendTextInput = {
  phone: string;
  text: string;
};

export async function sendWhatsAppText(input: SendTextInput) {
  const url = new URL(`/message/sendText/${env.EVOLUTION_INSTANCE_NAME}`, env.EVOLUTION_API_URL);
  const maskedPhone = input.phone.replace(/\d(?=\d{4})/g, "*");

  console.info("[evolution-api] sending text", {
    url: url.toString(),
    phone: maskedPhone
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.EVOLUTION_API_KEY
    },
    body: JSON.stringify({
      number: input.phone,
      text: input.text
    })
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error("[evolution-api] send failed", { status: response.status, body: errorBody });
    throw new Error(`Evolution API falhou ao enviar mensagem: ${response.status}`);
  }

  console.info("[evolution-api] send success", { status: response.status });
  return response.json() as Promise<unknown>;
}
