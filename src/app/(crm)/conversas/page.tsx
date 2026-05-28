"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  Bot,
  Camera,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Gauge,
  ImageIcon,
  MessageSquareText,
  Mic,
  Music2,
  Pencil,
  Pause,
  Phone,
  Plus,
  Search,
  Send,
  Smile,
  Sparkles,
  Target,
  Trash2,
  UserCheck,
  Video,
  WandSparkles,
  X,
  Zap
} from "lucide-react";
import type { ChangeEvent } from "react";
import { Topbar } from "@/components/topbar";
import { conversations } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type QuickReply = {
  id: string;
  name: string;
  message: string;
  attachment?: QuickReplyAttachment;
};

type QuickReplyAttachment = {
  name: string;
  type: "audio" | "image" | "video";
  dataUrl: string;
};

type Conversation = (typeof conversations)[number];
type KanbanStoredLead = {
  id: string;
  name: string;
  phone: string;
  origin: string;
  status?: string;
  temperature?: string;
  sentiment?: string;
  lastMessage?: string;
  lastInteraction?: string;
  responsible?: string;
  notes?: string;
};

const quickReplyStorageKey = "auto-pro-ia:quick-replies";
const kanbanLeadStorageKey = "auto-pro-ia:kanban-leads";

const temperatureEmoji: Record<Conversation["lead"]["temperature"], string> = {
  quente: "🔥",
  morno: "🌤️",
  frio: "❄️",
  urgente: "🚨"
};

const temperatureClasses: Record<Conversation["lead"]["temperature"], string> = {
  quente: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  morno: "border-yellow-500/30 bg-yellow-500/15 text-yellow-300",
  frio: "border-sky-500/30 bg-sky-500/15 text-sky-300",
  urgente: "border-red-500/30 bg-red-500/15 text-red-300"
};

const temperatureBar: Record<Conversation["lead"]["temperature"], { width: string; gradient: string; label: string }> = {
  frio: { width: "32%", gradient: "from-sky-500 to-cyan-300", label: "Baixo interesse" },
  morno: { width: "58%", gradient: "from-yellow-500 to-amber-300", label: "Interesse em evolucao" },
  quente: { width: "82%", gradient: "from-emerald-500 to-lime-300", label: "Alta chance de conversao" },
  urgente: { width: "96%", gradient: "from-red-500 to-orange-300", label: "Atencao imediata" }
};

type LeadSentiment = "positivo" | "neutro" | "duvida" | "negativo";

const sentimentEmoji: Record<LeadSentiment, string> = {
  positivo: "😊",
  neutro: "😐",
  duvida: "🤔",
  negativo: "😟"
};

const sentimentClasses: Record<LeadSentiment, string> = {
  positivo: "border-cyan-400/30 bg-cyan-400/15 text-cyan-200",
  neutro: "border-slate-400/30 bg-slate-400/[0.12] text-slate-200",
  duvida: "border-violet-400/30 bg-violet-400/15 text-violet-200",
  negativo: "border-red-400/30 bg-red-400/15 text-red-200"
};

const sentimentBar: Record<LeadSentiment, { width: string; gradient: string; label: string }> = {
  positivo: { width: "88%", gradient: "from-cyan-400 to-emerald-300", label: "Animado para avancar" },
  neutro: { width: "54%", gradient: "from-slate-400 to-slate-200", label: "Aguardando estimulo" },
  duvida: { width: "42%", gradient: "from-violet-500 to-fuchsia-300", label: "Precisa de clareza" },
  negativo: { width: "22%", gradient: "from-red-500 to-orange-300", label: "Risco de perda" }
};

const originEmoji: Record<string, string> = {
  "Meta Ads": "🎯",
  "Google Ads": "🔎",
  WhatsApp: "🟢",
  Instagram: "📸",
  Indicacao: "🤝",
  Site: "🌐"
};

const stageLabels: Partial<Record<Conversation["lead"]["stage"], string>> = {
  novo: "Novo lead",
  ia: "IA atendendo",
  qualificado: "Qualificado",
  interessado: "Interessado",
  negociacao: "Negociacao",
  followup: "Follow up",
  fechado: "Fechado",
  perdido: "Perdido"
};

const stageEmoji: Partial<Record<Conversation["lead"]["stage"], string>> = {
  novo: "✨",
  ia: "🤖",
  qualificado: "✅",
  interessado: "⭐",
  negociacao: "🤝",
  followup: "⏱️",
  fechado: "🏁",
  perdido: "📌"
};

const closingChanceByTemperature: Record<Conversation["lead"]["temperature"], number> = {
  quente: 82,
  morno: 57,
  frio: 31,
  urgente: 91
};

const aiSuggestion = {
  hint: "Pergunte o melhor horario antes de falar de desconto.",
  message:
    "Perfeito. Para eu te passar uma proposta mais certinha, qual horario fica melhor para voce fazer as aulas teoricas: manha, tarde ou noite?"
};

const operationalTimeline = [
  { title: "IA qualificou o interesse", detail: "CNH B, periodo noturno", time: "agora", icon: Bot },
  { title: "Cliente pediu valores", detail: "Comparando formas de pagamento", time: "8 min", icon: MessageSquareText },
  { title: "Proxima acao recomendada", detail: "Enviar proposta e sugerir visita", time: "15 min", icon: Target }
];

const defaultQuickReplies: QuickReply[] = [
  {
    id: "valores",
    name: "Valores",
    message: "Claro. Vou te passar as opcoes de valores e formas de pagamento para sua CNH. Voce pretende fazer categoria A, B ou AB?"
  },
  {
    id: "agendar-visita",
    name: "Agendar visita",
    message: "Podemos agendar uma visita na autoescola para voce conhecer a estrutura e tirar suas duvidas. Qual melhor horario para voce?"
  },
  {
    id: "endereco",
    name: "Endereco",
    message: "Nosso endereco e Av. Paulista, 1000. Posso te enviar a localizacao e verificar o melhor horario para atendimento."
  },
  {
    id: "confirmar-matricula",
    name: "Confirmar matricula",
    message: "Perfeito. Para confirmar sua matricula, preciso validar seus dados e a categoria desejada. Podemos seguir agora?"
  }
];

function normalizeTemperature(value?: string): Conversation["lead"]["temperature"] {
  return value === "morno" || value === "frio" || value === "urgente" ? value : "quente";
}

function normalizeSentiment(value?: string): LeadSentiment {
  return value === "positivo" || value === "duvida" || value === "negativo" ? value : "neutro";
}

function attachmentTypeFromMime(mimeType: string): QuickReplyAttachment["type"] | null {
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return null;
}

function attachmentLabel(type: QuickReplyAttachment["type"]) {
  if (type === "audio") return "Audio";
  if (type === "image") return "Imagem";
  return "Video";
}

function AttachmentIcon({ type, className }: { type: QuickReplyAttachment["type"]; className?: string }) {
  if (type === "audio") return <Music2 className={className} />;
  if (type === "image") return <ImageIcon className={className} />;
  return <Video className={className} />;
}

function normalizeStage(value?: string): Conversation["lead"]["stage"] {
  if (value === "ia" || value === "qualificado" || value === "interessado" || value === "negociacao" || value === "followup" || value === "perdido") {
    return value;
  }

  if (value === "matricula_realizada") {
    return "fechado";
  }

  return "novo";
}

function getLeadSentiment(conversation: Conversation): LeadSentiment {
  const leadWithSentiment = conversation.lead as Conversation["lead"] & { sentiment?: string };
  return normalizeSentiment(leadWithSentiment.sentiment);
}

function createConversationFromKanbanLead(lead: KanbanStoredLead): Conversation {
  const preview = lead.lastMessage?.trim() || lead.notes?.trim() || "Lead criado no funil Kanban.";

  return {
    lead: {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      origin: lead.origin,
      temperature: normalizeTemperature(lead.temperature),
      lastInteraction: lead.lastInteraction || "agora",
      responsible: lead.responsible || "Equipe comercial",
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(lead.name)}`,
      stage: normalizeStage(lead.status),
      interest: "carro",
      notes: lead.notes,
      sentiment: normalizeSentiment(lead.sentiment)
    } as Conversation["lead"] & { sentiment: LeadSentiment },
    online: false,
    unread: 0,
    preview,
    status: lead.status === "ia" ? "ai" : "human",
    messages: [
      {
        id: `${lead.id}-kanban-1`,
        from: "lead",
        text: preview,
        time: lead.lastInteraction || "agora"
      },
      {
        id: `${lead.id}-kanban-2`,
        from: "human",
        text: "Lead aberto pelo funil Kanban para continuidade do atendimento.",
        time: "agora"
      }
    ]
  } satisfies Conversation;
}

export default function ConversasPage() {
  const [activeId, setActiveId] = useState(conversations[0].lead.id);
  const [availableConversations, setAvailableConversations] = useState<Conversation[]>(conversations);
  const [manualConversationIds, setManualConversationIds] = useState<string[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>(defaultQuickReplies);
  const [conversationQuery, setConversationQuery] = useState("");
  const [manageReplies, setManageReplies] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [replyName, setReplyName] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replyAttachment, setReplyAttachment] = useState<QuickReplyAttachment | undefined>();
  const [draftMessage, setDraftMessage] = useState("");
  const [draftAttachment, setDraftAttachment] = useState<QuickReplyAttachment | undefined>();
  const [showLeadProfile, setShowLeadProfile] = useState(false);
  const [deleteReplyId, setDeleteReplyId] = useState<string | null>(null);
  const [replyFeedback, setReplyFeedback] = useState("");
  const draftTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const filteredConversations = useMemo(() => {
    const normalized = conversationQuery.trim().toLowerCase();
    if (!normalized) {
      return availableConversations;
    }

    return availableConversations.filter((conversation) =>
      [
        conversation.lead.name,
        conversation.lead.phone,
        conversation.lead.origin,
        conversation.lead.responsible,
        conversation.preview,
        conversation.lead.notes ?? "",
        conversation.messages.map((message) => message.text).join(" ")
      ].some((value) => value.toLowerCase().includes(normalized))
    );
  }, [availableConversations, conversationQuery]);
  const active = availableConversations.find((conversation) => conversation.lead.id === activeId) ?? availableConversations[0] ?? conversations[0];
  const editingReply = quickReplies.find((reply) => reply.id === editingReplyId);
  const canSendDraft = draftMessage.trim().length > 0 || Boolean(draftAttachment);
  const isManualAttendance = manualConversationIds.includes(active.lead.id) || active.status === "human";
  const currentAgent = "Carla Vendas";

  useEffect(() => {
    let mergedConversations = conversations;

    try {
      const stored = window.localStorage.getItem(kanbanLeadStorageKey);
      const parsed = stored ? (JSON.parse(stored) as KanbanStoredLead[]) : [];

      if (Array.isArray(parsed) && parsed.length > 0) {
        const kanbanConversations = parsed
          .filter((lead) => lead?.id && lead?.name && !("archived" in lead && lead.archived))
          .map(createConversationFromKanbanLead);
        const kanbanIds = new Set(kanbanConversations.map((conversation) => conversation.lead.id));
        mergedConversations = [
          ...kanbanConversations,
          ...conversations.filter((conversation) => !kanbanIds.has(conversation.lead.id))
        ];
      }
    } catch {
      mergedConversations = conversations;
    }

    setAvailableConversations(mergedConversations);

    const leadId = new URLSearchParams(window.location.search).get("lead");
    if (leadId && mergedConversations.some((conversation) => conversation.lead.id === leadId)) {
      setActiveId(leadId);
    }
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(quickReplyStorageKey);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as QuickReply[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setQuickReplies(parsed);
      }
    } catch {
      setQuickReplies(defaultQuickReplies);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(quickReplyStorageKey, JSON.stringify(quickReplies));
  }, [quickReplies]);

  useEffect(() => {
    const textarea = draftTextareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 72)}px`;
  }, [draftMessage]);

  function startNewReply() {
    setEditingReplyId(null);
    setReplyName("");
    setReplyMessage("");
    setReplyAttachment(undefined);
    setManageReplies(true);
  }

  function startEditReply(reply: QuickReply) {
    setEditingReplyId(reply.id);
    setReplyName(reply.name);
    setReplyMessage(reply.message);
    setReplyAttachment(reply.attachment);
    setManageReplies(true);
  }

  function closeReplyManager() {
    setEditingReplyId(null);
    setReplyName("");
    setReplyMessage("");
    setReplyAttachment(undefined);
    setManageReplies(false);
  }

  function saveQuickReply() {
    const trimmedName = replyName.trim();
    const trimmedMessage = replyMessage.trim();
    if (!trimmedName || (!trimmedMessage && !replyAttachment)) return;

    if (editingReplyId) {
      setQuickReplies((items) =>
        items.map((item) =>
          item.id === editingReplyId ? { ...item, name: trimmedName, message: trimmedMessage, attachment: replyAttachment } : item
        )
      );
    } else {
      setQuickReplies((items) => [
        ...items,
        {
          id: crypto.randomUUID(),
          name: trimmedName,
          message: trimmedMessage,
          attachment: replyAttachment
        }
      ]);
    }

    setEditingReplyId(null);
    setReplyName("");
    setReplyMessage("");
    setReplyAttachment(undefined);
    setManageReplies(false);
  }

  function deleteQuickReply(replyId: string) {
    setQuickReplies((items) => items.filter((item) => item.id !== replyId));
    if (editingReplyId === replyId) {
      setEditingReplyId(null);
      setReplyName("");
      setReplyMessage("");
      setReplyAttachment(undefined);
    }
  }

  function confirmDeleteQuickReply() {
    if (!deleteReplyId) return;

    deleteQuickReply(deleteReplyId);
    setDeleteReplyId(null);
    setReplyFeedback("Mensagem excluida com sucesso.");
    window.setTimeout(() => setReplyFeedback(""), 2600);
  }

  function sendDraftMessage() {
    setDraftMessage("");
    setDraftAttachment(undefined);
  }

  function assumeConversation() {
    setManualConversationIds((ids) => (ids.includes(active.lead.id) ? ids : [...ids, active.lead.id]));
    setAvailableConversations((items) =>
      items.map((conversation) =>
        conversation.lead.id === active.lead.id
          ? {
              ...conversation,
              status: "human",
              lead: {
                ...conversation.lead,
                responsible: currentAgent
              },
              preview: "Atendimento assumido por Carla Vendas."
            }
          : conversation
      )
    );
  }

  function returnConversationToAi() {
    setManualConversationIds((ids) => ids.filter((id) => id !== active.lead.id));
    setAvailableConversations((items) =>
      items.map((conversation) =>
        conversation.lead.id === active.lead.id
          ? {
              ...conversation,
              status: "ai",
              preview: "IA retomou o atendimento automatico."
            }
          : conversation
      )
    );
  }

  function applyQuickReply(reply: QuickReply) {
    setDraftMessage(reply.message);
    setDraftAttachment(reply.attachment);
  }

  function uploadReplyAttachment(file?: File) {
    if (!file) return;

    const type = attachmentTypeFromMime(file.type);
    if (!type) return;

    const reader = new FileReader();
    reader.onload = () => {
      setReplyAttachment({
        name: file.name,
        type,
        dataUrl: String(reader.result)
      });
    };
    reader.readAsDataURL(file);
  }

  function updateDraftMessage(event: ChangeEvent<HTMLTextAreaElement>) {
    setDraftMessage(event.target.value);
    event.target.style.height = "auto";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 72)}px`;
  }

  return (
    <>
      <Topbar title="Central de Atendimento" subtitle="WhatsApp + IA com intervencao humana sem perda de contexto" />
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden bg-[radial-gradient(circle_at_45%_0%,rgba(82,39,255,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.018),transparent_28%),var(--background)] md:grid-cols-[320px_1fr] xl:grid-cols-[320px_minmax(560px,0.9fr)_340px]">
        <aside className="flex min-h-0 flex-col overflow-hidden border-r border-white/[0.08] bg-card/45 backdrop-blur-xl">
          <div className="border-b border-white/[0.08] p-3">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold">Inbox inteligente</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Conversas priorizadas pela IA</p>
              </div>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                {availableConversations.length} ativos
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={conversationQuery}
                onChange={(event) => setConversationQuery(event.target.value)}
                placeholder="Buscar conversa..."
                className="h-10 w-full rounded-2xl border border-white/10 bg-white/[0.045] pl-10 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/70 hover:border-white/[0.16] focus:border-primary/55 focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>
          <div className="min-h-0 max-h-[calc(100vh-238px)] flex-1 space-y-1.5 overflow-y-auto overscroll-contain p-2.5 pr-3 scrollbar-thin">
            {filteredConversations.map((conversation) => {
              const selected = conversation.lead.id === activeId;
              const chance = closingChanceByTemperature[conversation.lead.temperature];

              return (
                <button
                  key={conversation.lead.id}
                  onClick={() => setActiveId(conversation.lead.id)}
                  className={cn(
                    "group flex w-full items-start gap-2.5 rounded-2xl border border-sky-400/[0.10] bg-[#132235]/80 p-2.5 text-left shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-[#172b42]",
                    selected && "border-primary/45 bg-[linear-gradient(135deg,rgba(250,204,21,0.16),rgba(19,34,53,0.92))] shadow-[0_18px_42px_rgba(250,204,21,0.13)]"
                  )}
                >
                  <div className="relative shrink-0">
                    <img src={conversation.lead.avatar} alt="" className="size-9 rounded-xl" />
                    {conversation.online ? (
                      <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-success ring-2 ring-card" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-extrabold">{conversation.lead.name}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{conversation.lead.lastInteraction}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <p className="flex-1 truncate text-[11px] text-muted-foreground">{conversation.preview}</p>
                      {conversation.unread > 0 ? (
                        <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          {conversation.unread}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-bold capitalize", temperatureClasses[conversation.lead.temperature])}>
                        {temperatureEmoji[conversation.lead.temperature]} {conversation.lead.temperature}
                      </span>
                      <span className="rounded-full border border-sky-400/20 bg-sky-500/[0.10] px-1.5 py-0.5 text-[9px] font-bold text-sky-200">
                        {originEmoji[conversation.lead.origin] ?? "📍"} {conversation.lead.origin}
                      </span>
                      <span className="ml-auto rounded-full border border-white/10 bg-white/[0.045] px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                        {chance}%
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredConversations.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-center text-xs font-semibold text-muted-foreground">
                Nenhuma conversa encontrada.
              </div>
            ) : null}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-background/55">
          <div className="border-b border-white/[0.08] bg-card/45 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-3">
            <img src={active.lead.avatar} alt="" className="size-12 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-base font-extrabold">{active.lead.name}</span>
                {active.online ? (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">online</span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3" />
                  {active.lead.phone}
                </span>
                <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-bold capitalize", temperatureClasses[active.lead.temperature])}>
                  {temperatureEmoji[active.lead.temperature]} {active.lead.temperature}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.045] px-2 py-0.5 font-bold text-foreground/80">
                  <Gauge className="size-3 text-primary" />
                  {closingChanceByTemperature[active.lead.temperature]}% fechamento
                </span>
              </div>
            </div>
            <span
              className={cn(
                "hidden items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shadow-[0_0_24px_rgba(250,204,21,0.08)] sm:inline-flex",
                isManualAttendance
                  ? "border-success/30 bg-success/15 text-success"
                  : "border-primary/30 bg-primary/15 text-primary"
              )}
            >
              {isManualAttendance ? <UserCheck className="size-3" /> : <Sparkles className="size-3" />}
              {isManualAttendance ? `Humano: ${currentAgent}` : "IA conduzindo"}
            </span>
            <button
              onClick={isManualAttendance ? returnConversationToAi : assumeConversation}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-xs font-bold transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/10"
            >
              {isManualAttendance ? <Sparkles className="size-3.5" /> : <Pause className="size-3.5" />}
              {isManualAttendance ? "Devolver para IA" : "Pausar IA"}
            </button>
            <button
              onClick={assumeConversation}
              disabled={isManualAttendance}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0",
                isManualAttendance ? "bg-success text-background" : "bg-primary text-primary-foreground"
              )}
            >
              <UserCheck className="size-3.5" />
              {isManualAttendance ? "Assumido" : "Assumir"}
            </button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <InsightPill icon={WandSparkles} label="Insight IA" value="Prioridade alta" />
              <InsightPill icon={Clock3} label="SLA" value="Responder em 4 min" />
              <InsightPill icon={Target} label="Proxima acao" value="Enviar proposta" />
            </div>
          </div>

          <div className="whatsapp-chat-bg flex-1 overflow-y-auto p-4 scrollbar-thin">
            <div className="flex w-full flex-col space-y-4">
            <div className="rounded-2xl border border-sky-300/25 bg-sky-300/[0.08] p-4 shadow-[0_18px_45px_rgba(56,189,248,0.10),0_0_36px_rgba(56,189,248,0.08)]">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl border border-sky-300/25 bg-sky-300/12 text-sky-200 shadow-[0_0_22px_rgba(56,189,248,0.16)]">
                  <Bot className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-sky-100">Sugestao da IA para este atendimento</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{aiSuggestion.hint}</p>
                </div>
              </div>
            </div>
            {active.messages.map((message) => {
              const isCompany = message.from !== "lead";

              return (
                <div key={message.id} className={cn("flex", isCompany ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "min-w-[300px] max-w-[78%] rounded-2xl border px-4 py-3 text-sm shadow-[0_14px_34px_rgba(0,0,0,0.16)] backdrop-blur transition hover:-translate-y-0.5 md:min-w-[460px]",
                      message.from === "ia" && "border-primary/30 bg-primary/[0.12]",
                      message.from === "human" && "border-success/30 bg-success/[0.12]",
                      message.from === "lead" && "border-white/10 bg-card/82"
                    )}
                  >
                    {message.from === "ia" ? (
                      <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        <Bot className="size-3" />
                        IA Copiloto
                      </div>
                    ) : null}
                    {message.from === "human" ? (
                      <div className="mb-1.5 inline-flex rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                        Atendente
                      </div>
                    ) : null}
                    <p className="leading-6">{message.text}</p>
                    <div className="mt-1 text-right text-[10px] text-muted-foreground">{message.time}</div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>

          <div className="border-t border-white/[0.06] bg-[#080808] p-4 backdrop-blur-xl">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              {[aiSuggestion].map((suggestion) => (
                <button
                  key={suggestion.hint}
                  onClick={() => setDraftMessage(suggestion.message)}
                  className="group/ai-hint relative inline-flex shrink-0 items-center gap-2 overflow-visible rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1.5 text-xs font-black text-sky-100 shadow-[0_0_20px_rgba(56,189,248,0.08)] transition hover:-translate-y-0.5 hover:border-sky-300/45 hover:bg-sky-300/15"
                  title="Clique para inserir a mensagem sugerida no campo do chat."
                >
                  <WandSparkles className="size-3.5 text-sky-300" />
                  Sugestao de IA
                  <span className="pointer-events-none absolute bottom-full left-0 z-40 mb-2 w-[min(420px,calc(100vw-2rem))] translate-y-1 rounded-2xl border border-sky-300/18 bg-[#07111f]/98 p-3 text-left text-xs font-semibold leading-5 text-sky-50 opacity-0 shadow-[0_22px_60px_rgba(0,0,0,0.45),0_0_28px_rgba(56,189,248,0.10)] backdrop-blur-xl transition-all duration-200 group-hover/ai-hint:translate-y-0 group-hover/ai-hint:opacity-100">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.16em] text-sky-300">
                      Sugestao atual
                    </span>
                    {suggestion.hint}
                  </span>
                </button>
              ))}

              <div className="flex items-center gap-2">
                {replyFeedback ? (
                  <span className="rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">
                    {replyFeedback}
                  </span>
                ) : null}
                <button
                  onClick={startNewReply}
                  className={cn(
                    "shrink-0 rounded-full border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-accent hover:text-white",
                    manageReplies && "border-primary/50 bg-primary/10 text-primary"
                  )}
                >
                  Gerenciar respostas rapidas
                </button>
              </div>
            </div>
            <div className="mb-2 flex items-center gap-2 overflow-x-auto scrollbar-thin">
              {quickReplies.map((quickReply) => (
                <div key={quickReply.id} className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] pr-1">
                  <button
                    onClick={() => applyQuickReply(quickReply)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold hover:text-primary"
                    title={quickReply.message || quickReply.attachment?.name}
                  >
                    {quickReply.attachment ? <AttachmentIcon type={quickReply.attachment.type} className="size-3" /> : null}
                    {quickReply.name}
                  </button>
                  <div className="flex items-center border-l border-border pl-1">
                    <button
                      onClick={() => startEditReply(quickReply)}
                      className="grid size-6 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                      title="Editar resposta rapida"
                      aria-label={`Editar resposta rapida ${quickReply.name}`}
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      onClick={() => setDeleteReplyId(quickReply.id)}
                      className="grid size-6 place-items-center rounded-full text-muted-foreground transition hover:bg-danger/10 hover:text-danger"
                      title="Excluir resposta rapida"
                      aria-label={`Excluir resposta rapida ${quickReply.name}`}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {draftAttachment ? (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <AttachmentIcon type={draftAttachment.type} className="size-4 shrink-0" />
                  <span className="truncate">
                    {attachmentLabel(draftAttachment.type)} pronto para envio: {draftAttachment.name}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setDraftAttachment(undefined)}
                  className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-white/10"
                  aria-label="Remover anexo da mensagem"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : null}
            <div className="flex min-h-14 items-end gap-4">
              <button className="grid size-10 shrink-0 place-items-center text-white/90 transition hover:text-white">
                <Plus className="size-8 stroke-[1.8]" />
              </button>
              <div className="flex min-h-12 min-w-0 flex-1 items-end rounded-[24px] bg-[#242424] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <textarea
                  ref={draftTextareaRef}
                  value={draftMessage}
                  onChange={updateDraftMessage}
                  placeholder="Digite sua mensagem..."
                  rows={1}
                  className="max-h-[72px] min-h-8 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-1 text-sm leading-6 text-white outline-none placeholder:text-white/45 scrollbar-thin"
                />
                <button className="grid size-9 shrink-0 place-items-center text-white/90 transition hover:text-white">
                  <Smile className="size-6 stroke-[1.8]" />
                </button>
              </div>
              <button className="grid size-10 shrink-0 place-items-center text-white/90 transition hover:text-white">
                <Camera className="size-7 stroke-[1.8]" />
              </button>
              <button
                onClick={sendDraftMessage}
                className="grid size-10 shrink-0 place-items-center text-white/90 transition hover:text-white"
              >
                {canSendDraft ? <Send className="size-7 stroke-[1.8]" /> : <Mic className="size-8 stroke-[1.8]" />}
              </button>
            </div>
          </div>
        </section>

        <aside className="hidden min-h-0 flex-col gap-3 overflow-y-auto border-l border-white/[0.08] bg-card/45 p-4 backdrop-blur-xl scrollbar-thin xl:flex">
          <section className="rounded-2xl border border-cyan-300/14 bg-gradient-to-br from-cyan-400/[0.08] via-white/[0.035] to-violet-500/[0.06] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
            <div className="flex items-center gap-3">
              <img src={active.lead.avatar} alt="" className="size-12 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold">{active.lead.name}</div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{active.lead.phone}</div>
              </div>
              <span className={cn("rounded-full border px-2 py-1 text-[10px] font-black", isManualAttendance ? "border-primary/30 bg-primary/10 text-primary" : "border-emerald-400/25 bg-emerald-400/10 text-emerald-300")}>
                {isManualAttendance ? "Humano" : "IA ativa"}
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-white/[0.08] bg-background/35 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/75">Direcionamento</div>
                  <p className="mt-1 text-sm font-extrabold">Enviar proposta objetiva</p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-black text-primary">{closingChanceByTemperature[active.lead.temperature]}%</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">fechamento</div>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Priorize uma resposta curta com horario disponivel e proximo passo claro.
              </p>
            </div>
          </section>

          <ExpandableSection
            title="Inteligencia do lead"
            subtitle="Contexto aberto so quando precisar"
            icon={Gauge}
            defaultOpen
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Info label="Origem" value={`${originEmoji[active.lead.origin] ?? "📍"} ${active.lead.origin}`} compact />
                <Info label="Etapa" value={`${stageEmoji[active.lead.stage] ?? "📌"} ${stageLabels[active.lead.stage] ?? active.lead.stage}`} compact />
                <Info label="Interesse" value={`🚗 CNH ${active.lead.interest}`} compact />
                <Info label="Responsavel" value={active.lead.responsible} compact />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Termometro do cliente</div>
                <div className="mt-1.5 rounded-2xl border border-white/[0.08] bg-background/35 p-2.5">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize", temperatureClasses[active.lead.temperature])}>
                      <span aria-hidden="true">{temperatureEmoji[active.lead.temperature]}</span>
                      {active.lead.temperature}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {temperatureBar[active.lead.temperature].label}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className={cn("h-full rounded-full bg-gradient-to-r shadow-[0_0_18px_rgba(255,255,255,0.14)]", temperatureBar[active.lead.temperature].gradient)}
                      style={{ width: temperatureBar[active.lead.temperature].width }}
                    />
                  </div>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sentimento do cliente</div>
                <div className="mt-1.5 rounded-2xl border border-white/[0.08] bg-background/35 p-2.5">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize", sentimentClasses[getLeadSentiment(active)])}>
                      <span aria-hidden="true">{sentimentEmoji[getLeadSentiment(active)]}</span>
                      {getLeadSentiment(active)}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {sentimentBar[getLeadSentiment(active)].label}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className={cn("h-full rounded-full bg-gradient-to-r shadow-[0_0_18px_rgba(255,255,255,0.14)]", sentimentBar[getLeadSentiment(active)].gradient)}
                      style={{ width: sentimentBar[getLeadSentiment(active)].width }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ExpandableSection>

          <ExpandableSection
            title="Timeline operacional"
            subtitle="Historico resumido para auditoria rapida"
            icon={CalendarClock}
          >
            <div className="space-y-3">
              {operationalTimeline.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.title} className="flex gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold">{item.title}</p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{item.time}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ExpandableSection>

          <button
            onClick={() => setShowLeadProfile(true)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl border border-primary/25 bg-primary/10 text-xs font-bold text-primary transition hover:-translate-y-0.5 hover:bg-primary/15"
          >
            <Zap className="size-3.5 text-primary" />
            Ver perfil completo
          </button>
        </aside>
      </div>

      {deleteReplyId ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <section className="w-full max-w-sm rounded-2xl border border-white/10 bg-card p-5 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
            <h2 className="text-base font-extrabold">Excluir resposta rapida?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Tem certeza que deseja excluir esta mensagem rapida?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteReplyId(null)}
                className="h-10 rounded-xl border border-white/10 px-4 text-sm font-bold text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
              >
                Nao
              </button>
              <button
                type="button"
                onClick={confirmDeleteQuickReply}
                className="h-10 rounded-xl bg-danger px-4 text-sm font-bold text-white transition hover:brightness-110"
              >
                Sim
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {manageReplies ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xl">
          <section className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#08111f] shadow-[0_28px_90px_rgba(0,0,0,0.52)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Respostas rapidas</p>
                <h2 className="mt-1 text-xl font-extrabold">
                  {editingReply ? "Editar resposta rapida" : "Cadastrar resposta rapida"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configure texto, audio, imagem ou video para usar durante o atendimento.
                </p>
              </div>
              <button
                onClick={closeReplyManager}
                className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/10 text-muted-foreground transition hover:bg-white/[0.08] hover:text-foreground"
                title="Fechar gerenciamento"
                aria-label="Fechar gerenciamento"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid gap-4 p-5">
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Nome do botao</span>
                  <input
                    value={replyName}
                    onChange={(event) => setReplyName(event.target.value)}
                    placeholder="Ex: Valores"
                    className="h-12 rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-sm font-semibold outline-none transition placeholder:text-muted-foreground/70 hover:border-white/[0.16] focus:border-primary/55 focus:ring-4 focus:ring-primary/10"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Mensagem completa</span>
                  <textarea
                    value={replyMessage}
                    onChange={(event) => setReplyMessage(event.target.value)}
                    placeholder="Digite o texto completo que sera inserido no chat..."
                    rows={4}
                    className="min-h-28 resize-none rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-semibold leading-6 outline-none transition placeholder:text-muted-foreground/70 hover:border-white/[0.16] focus:border-primary/55 focus:ring-4 focus:ring-primary/10"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold">Midia da resposta</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Opcional. A resposta pode ser salva mesmo sem texto se tiver anexo.
                    </p>
                  </div>
                  <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-4 text-xs font-bold text-muted-foreground transition hover:bg-white/[0.07] hover:text-foreground">
                    <ImageIcon className="size-4" />
                    Anexar audio, imagem ou video
                    <input
                      type="file"
                      accept="audio/*,image/*,video/*"
                      onChange={(event) => uploadReplyAttachment(event.target.files?.[0])}
                      className="sr-only"
                    />
                  </label>
                </div>

                {replyAttachment ? (
                  <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
                    <AttachmentIcon type={replyAttachment.type} className="size-4 shrink-0" />
                    <span className="truncate">
                      {attachmentLabel(replyAttachment.type)}: {replyAttachment.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplyAttachment(undefined)}
                      className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-white/10"
                      aria-label="Remover anexo"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-5">
              <button
                onClick={() => {
                  setEditingReplyId(null);
                  setReplyName("");
                  setReplyMessage("");
                  setReplyAttachment(undefined);
                }}
                className="h-10 rounded-xl border border-white/10 px-4 text-sm font-bold text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
              >
                Limpar
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeReplyManager}
                  className="h-10 rounded-xl border border-white/10 px-4 text-sm font-bold text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveQuickReply}
                  className="h-10 rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-glow transition hover:-translate-y-0.5"
                >
                  Salvar resposta
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {showLeadProfile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <section className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-card shadow-[0_28px_90px_rgba(0,0,0,0.48)]">
            <div className="flex items-start gap-4 border-b border-white/10 p-5">
              <img src={active.lead.avatar} alt="" className="size-14 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-extrabold">{active.lead.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3.5" />
                    {active.lead.phone}
                  </span>
                  <span>•</span>
                  <span>{originEmoji[active.lead.origin] ?? "📍"} {active.lead.origin}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLeadProfile(false)}
                className="grid size-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
                aria-label="Fechar perfil do cliente"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid max-h-[72vh] gap-5 overflow-y-auto p-5 scrollbar-thin lg:grid-cols-[1fr_1.1fr]">
              <div className="space-y-4">
                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                  <h3 className="text-sm font-extrabold">Resumo comercial</h3>
                  <div className="mt-4 grid gap-3">
                    <ProfileRow label="Termometro" value={`${temperatureEmoji[active.lead.temperature]} ${active.lead.temperature}`} />
                    <ProfileRow label="Etapa" value={`${stageEmoji[active.lead.stage] ?? "📌"} ${stageLabels[active.lead.stage] ?? active.lead.stage}`} />
                    <ProfileRow label="Interesse" value={`🚗 CNH ${active.lead.interest}`} />
                    <ProfileRow label="Responsavel" value={active.lead.responsible} />
                    <ProfileRow label="Ultima interacao" value={active.lead.lastInteraction} />
                  </div>
                </section>

                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                  <h3 className="text-sm font-extrabold">Observacoes</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {active.lead.notes ?? active.preview}
                  </p>
                </section>
              </div>

              <section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                <h3 className="text-sm font-extrabold">Historico da conversa</h3>
                <div className="mt-4 space-y-3">
                  {active.messages.map((message) => (
                    <div key={message.id} className="rounded-2xl border border-white/[0.08] bg-background/35 p-3">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-primary">
                          {message.from === "lead" ? "Cliente" : message.from === "ia" ? "IA" : "Atendente"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{message.time}</span>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">{message.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function Info({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={cn(compact && "rounded-xl border border-white/[0.06] bg-background/25 px-2.5 py-2")}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 font-medium capitalize", compact ? "truncate text-xs" : "text-sm")}>{value}</div>
    </div>
  );
}

function ExpandableSection({
  title,
  subtitle,
  icon: Icon,
  defaultOpen = false,
  children
}: {
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 transition hover:border-cyan-300/16 hover:bg-white/[0.05]"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
        <span className="grid size-9 shrink-0 place-items-center rounded-2xl border border-cyan-300/12 bg-cyan-300/10 text-cyan-200">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold">{title}</span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{subtitle}</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="mt-3 border-t border-white/[0.06] pt-3">{children}</div>
    </details>
  );
}

function InsightPill({
  icon: Icon,
  label,
  value
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-2">
      <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate text-xs font-extrabold">{value}</div>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-white/[0.035] px-3 py-2.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-bold capitalize">{value}</span>
    </div>
  );
}
