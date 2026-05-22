import { env } from "@/lib/env";

type SendTextInput = {
  phone: string;
  text: string;
};

export async function sendWhatsAppText(input: SendTextInput) {
  const url = new URL(`/message/sendText/${env.EVOLUTION_INSTANCE_NAME}`, env.EVOLUTION_API_URL);

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
    throw new Error(`Evolution API falhou ao enviar mensagem: ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}
