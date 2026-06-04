export type Temperature = "quente" | "morno" | "frio" | "urgente";
export type Stage =
  | "novo"
  | "ia"
  | "qualificado"
  | "followup"
  | "fechado"
  | "perdido";

export type Lead = {
  id: string;
  name: string;
  phone: string;
  origin: string;
  temperature: Temperature;
  lastInteraction: string;
  responsible: string;
  avatar: string;
  stage: Stage;
  interest: "carro" | "moto" | "adicao" | "mudanca";
  notes?: string;
};

export const stages: Array<{ id: Stage; title: string; tone: string }> = [
  { id: "novo", title: "Novo Lead", tone: "blue" },
  { id: "ia", title: "IA Atendendo", tone: "violet" },
  { id: "qualificado", title: "Qualificado", tone: "cyan" },
  { id: "followup", title: "Follow-up", tone: "orange" },
  { id: "fechado", title: "Fechado", tone: "green" },
  { id: "perdido", title: "Perdido", tone: "red" }
];

const names = [
  "Lucas Ferreira",
  "Ana Beatriz",
  "Rafael Souza",
  "Mariana Lima",
  "Pedro Henrique",
  "Juliana Costa",
  "Bruno Almeida",
  "Camila Ribeiro",
  "Diego Martins",
  "Fernanda Dias",
  "Gabriel Rocha",
  "Isabela Nunes"
];

const origins = ["Meta Ads", "Google Ads", "WhatsApp", "Instagram", "Indicacao", "Site"];
const responsibles = ["Carla Vendas", "Ricardo IA", "Julio Operador", "Marcos Closer"];
const temperatures: Temperature[] = ["quente", "morno", "frio", "urgente"];
const interests: Lead["interest"][] = ["carro", "moto", "adicao", "mudanca"];
const stageIds = stages.map((stage) => stage.id);

export const leads: Lead[] = names.map((name, index) => ({
  id: `lead-${index + 1}`,
  name,
  phone: `+55 75 9${(80000000 + index * 13371).toString().slice(0, 8)}`,
  origin: origins[index % origins.length],
  temperature: temperatures[index % temperatures.length],
  lastInteraction: ["ha 2 min", "ha 14 min", "ha 1 h", "ha 3 h", "ontem", "ha 2 dias"][index % 6],
  responsible: responsibles[index % responsibles.length],
  avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
  stage: stageIds[index % stageIds.length],
  interest: interests[index % interests.length],
  notes: "Interessado em CNH categoria B. Solicitou valores, horarios e parcelamento."
}));

export const dashboardStats = {
  leadsHoje: 47,
  conversasAtivas: 23,
  matriculasFechadas: 12,
  taxaConversao: 28.4,
  iaAtendendo: 18,
  leadsQuentes: 9,
  tempoMedioResposta: "38s",
  vendasMes: "R$ 48.700"
};

export const leadsByOrigin = [
  { label: "Meta Ads", value: 142, percent: 32 },
  { label: "Google Ads", value: 98, percent: 22 },
  { label: "WhatsApp", value: 76, percent: 17 },
  { label: "Instagram", value: 54, percent: 12 },
  { label: "Indicacao", value: 41, percent: 9 },
  { label: "Site", value: 27, percent: 6 }
];

export const campaignConversion = [
  { campaign: "CNH B - Promocao Maio", leads: 118, enrollments: 34, conversion: 28.8 },
  { campaign: "Primeira habilitacao", leads: 96, enrollments: 24, conversion: 25 },
  { campaign: "Moto + Carro AB", leads: 74, enrollments: 16, conversion: 21.6 },
  { campaign: "Aulas noturnas", leads: 63, enrollments: 11, conversion: 17.5 }
];

export const sellerClosing = [
  { seller: "Carla Vendas", closed: 34, revenue: "R$ 86.200", conversion: 38 },
  { seller: "Marcos Closer", closed: 28, revenue: "R$ 72.400", conversion: 32 },
  { seller: "Julio Operador", closed: 19, revenue: "R$ 46.900", conversion: 24 },
  { seller: "Ricardo IA", closed: 47, revenue: "R$ 104.600", conversion: 41 }
];

export const funnelData = [
  { etapa: "Novo", value: 348 },
  { etapa: "Qualificado", value: 240 },
  { etapa: "Follow-up", value: 168 },
  { etapa: "Matricula pendente", value: 96 },
  { etapa: "Fechado", value: 52 }
];

export const aiPerformance = [
  { metric: "Resolucao pela IA", value: 71, detail: "sem humano" },
  { metric: "Handoff correto", value: 94, detail: "com contexto" },
  { metric: "Resposta em ate 1 min", value: 88, detail: "SLA comercial" },
  { metric: "Leads qualificados", value: 63, detail: "com interesse" }
];

export type Message = {
  id: string;
  from: "lead" | "ia" | "human";
  text: string;
  time: string;
};

export const conversations = leads.slice(0, 8).map((lead, index) => ({
  lead,
  online: index % 3 === 0,
  unread: index < 3 ? index + 1 : 0,
  preview: [
    "Quero saber valores da CNH B",
    "Posso parcelar?",
    "Tem aula amanha?",
    "Vou pensar e retorno",
    "Manda o endereco pf",
    "Aceita pix?",
    "Quero matricular!",
    "Obrigado"
  ][index],
  status: index % 4 === 0 ? "human" : "ai",
  messages: [
    { id: "m1", from: "lead", text: "Oi, vi o anuncio sobre a CNH.", time: "09:12" },
    {
      id: "m2",
      from: "ia",
      text: "Ola. Sou a assistente da Auto Pro IA. Posso te ajudar com CNH A, B, AB e mudanca de categoria.",
      time: "09:12"
    },
    { id: "m3", from: "lead", text: "Quanto custa a CNH B?", time: "09:13" },
    {
      id: "m4",
      from: "ia",
      text: "Vou te passar as opcoes e confirmar disponibilidade com a equipe. Voce prefere atendimento de manha, tarde ou noite?",
      time: "09:13"
    },
    { id: "m5", from: "human", text: "Ola, aqui e Carla. Posso assumir e finalizar sua matricula.", time: "09:16" }
  ] satisfies Message[]
}));
