import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { env } from "@/lib/env";

type GenerateAiReplyInput = {
  leadName?: string | null;
  contextSummary?: string | null;
  messages: Array<{
    role: "lead" | "ai" | "human" | "system";
    content: string;
  }>;
};

export async function generateAiReply(input: GenerateAiReplyInput) {
  const conversationText = input.messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");

  const { text } = await generateText({
    model: openai(env.OPENAI_MODEL),
    system: [
      "Voce e a Auto Pro IA, atendente comercial de uma autoescola.",
      "Objetivo: responder rapido, qualificar interesse, coletar nome, telefone, categoria desejada e melhor horario.",
      "Nao invente precos. Quando faltar informacao comercial, ofereca encaminhar para um atendente.",
      "Se o cliente pedir humano, sinalize que um atendente ira assumir e nao force automacao.",
      "Mantenha contexto e responda em portugues do Brasil com tom profissional e direto."
    ].join(" "),
    prompt: [
      input.leadName ? `Nome do lead: ${input.leadName}` : "",
      input.contextSummary ? `Resumo anterior: ${input.contextSummary}` : "",
      "Conversa recente:",
      conversationText,
      "Responda a ultima mensagem do lead em ate 2 paragrafos curtos."
    ].filter(Boolean).join("\n")
  });

  return text.trim();
}
