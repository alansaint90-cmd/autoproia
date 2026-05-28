import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { env } from "@/lib/env";
import { getAiBusinessSettings } from "@/lib/services/ai-business-settings-service";

type GenerateAiReplyInput = {
  leadName?: string | null;
  contextSummary?: string | null;
  messages: Array<{
    role: "lead" | "ai" | "human" | "system";
    content: string;
  }>;
};

export async function generateAiReply(input: GenerateAiReplyInput) {
  console.info("[ai-agent] request started", { model: env.OPENAI_MODEL, messages: input.messages.length });
  const businessSettings = await getAiBusinessSettings();

  const conversationText = input.messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");

  const { text } = await generateText({
    model: openai(env.OPENAI_MODEL),
    system: [
      `Voce e ${businessSettings.agentName}, agente comercial da Auto Pro IA para uma autoescola.`,
      "Objetivo: responder rapido, qualificar interesse, coletar nome, telefone, categoria desejada e melhor horario.",
      `Precos e regras comerciais cadastradas: ${businessSettings.prices}`,
      `Endereco da unidade: ${businessSettings.address}`,
      `Horario de atendimento: ${businessSettings.hours}`,
      "Nao invente precos fora do cadastro. Quando faltar informacao comercial, ofereca encaminhar para um atendente.",
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

  console.info("[ai-agent] response generated", { length: text.length });
  return text.trim();
}
