export type AiBusinessSettings = {
  agentName: string;
  prices: string;
  address: string;
  hours: string;
  customPrompt: string;
};

export const aiBusinessSettingsKey = "ai-business-settings";

export const defaultAiBusinessSettings: AiBusinessSettings = {
  agentName: "Ana",
  prices:
    "Categoria B: informe valores somente se estiverem atualizados no sistema. Categoria A e AB: confirmar disponibilidade antes de passar proposta.",
  address: "Av. Paulista, 1000 - Sao Paulo, SP",
  hours: "Segunda a sexta, das 8h as 18h. Sabado, das 8h as 12h.",
  customPrompt:
    "Priorize respostas curtas, confirme a categoria desejada, identifique urgencia de matricula e acione atendimento humano quando o lead pedir condicoes especiais."
};
