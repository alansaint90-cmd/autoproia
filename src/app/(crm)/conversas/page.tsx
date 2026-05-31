"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType, type MouseEvent, type ReactNode } from "react";
import {
  Archive,
  Ban,
  Bot,
  Camera,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Gauge,
  ImageIcon,
  LockKeyhole,
  MessageSquareText,
  Mic,
  Music2,
  Pencil,
  Pause,
  Pin,
  Phone,
  Plus,
  Search,
  Send,
  Smile,
  Star,
  Sparkles,
  Target,
  Trash2,
  VolumeX,
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

type InboxView = "all" | "favorites" | "locked" | "archived";
type PreviewTooltip = { text: string; top: number; left: number } | null;
const inboxListsStorageKey = "auto-pro-ia:inbox-lists";

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
  avatar?: string;
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
  quente: "border-[#22C55E]/30 bg-[#22C55E]/12 text-[#22C55E]",
  morno: "border-[#FACC15]/30 bg-[#FACC15]/12 text-[#FACC15]",
  frio: "border-[#0B5FA5]/35 bg-[#0B5FA5]/16 text-blue-100",
  urgente: "border-[#FACC15]/45 bg-[#FACC15]/16 text-[#FACC15]"
};

const temperatureBar: Record<Conversation["lead"]["temperature"], { width: string; gradient: string; label: string }> = {
  frio: { width: "32%", gradient: "from-[#0B5FA5] to-blue-300", label: "Baixo interesse" },
  morno: { width: "58%", gradient: "from-[#FACC15] to-[#EAB308]", label: "Interesse em evolucao" },
  quente: { width: "82%", gradient: "from-[#22C55E] to-emerald-300", label: "Alta chance de conversao" },
  urgente: { width: "96%", gradient: "from-[#FACC15] to-[#22C55E]", label: "Atencao imediata" }
};

type LeadSentiment = "positivo" | "neutro" | "duvida" | "negativo";

const sentimentEmoji: Record<LeadSentiment, string> = {
  positivo: "😊",
  neutro: "😐",
  duvida: "🤔",
  negativo: "😟"
};

const sentimentClasses: Record<LeadSentiment, string> = {
  positivo: "border-[#22C55E]/30 bg-[#22C55E]/12 text-[#22C55E]",
  neutro: "border-slate-400/30 bg-slate-400/[0.12] text-slate-200",
  duvida: "border-[#0B5FA5]/35 bg-[#0B5FA5]/16 text-blue-100",
  negativo: "border-[#FACC15]/40 bg-[#FACC15]/14 text-[#FACC15]"
};

const sentimentBar: Record<LeadSentiment, { width: string; gradient: string; label: string }> = {
  positivo: { width: "88%", gradient: "from-[#22C55E] to-emerald-300", label: "Animado para avancar" },
  neutro: { width: "54%", gradient: "from-slate-400 to-slate-200", label: "Aguardando estimulo" },
  duvida: { width: "42%", gradient: "from-[#0B5FA5] to-blue-300", label: "Precisa de clareza" },
  negativo: { width: "22%", gradient: "from-[#FACC15] to-[#EAB308]", label: "Risco de perda" }
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

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ConversationInboxMenu({
  onArchive,
  onClose
}: {
  onArchive: () => void;
  onClose: () => void;
}) {
  const actions = [
    { label: "Arquivar conversa", icon: Archive, action: onArchive },
    { label: "Silenciar notificacoes", icon: VolumeX, action: onClose, hasSubmenu: true },
    { label: "Fixar conversa", icon: Pin, action: onClose },
    { label: "Marcar como nao lida", icon: MessageSquareText, action: onClose },
    { label: "Adicionar aos Favoritos", icon: Star, action: onClose },
    { label: "Adicionar a lista", icon: Plus, action: onClose },
    { label: "Bloquear", icon: Ban, action: onClose, danger: true },
    { label: "Limpar conversa", icon: X, action: onClose },
    { label: "Apagar conversa", icon: Trash2, action: onArchive, danger: true }
  ];

  return (
    <div className="absolute right-2 top-9 z-[90] w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1120]/98 p-1.5 shadow-[0_24px_70px_rgba(0,0,0,0.48)] backdrop-blur-xl">
      {actions.map((item, index) => {
        const Icon = item.icon;
        const separated = index === 6;

        return (
          <button
            key={item.label}
            type="button"
            onClick={item.action}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition hover:bg-white/[0.06]",
              separated && "mt-1 border-t border-white/10 pt-3",
              item.danger ? "text-red-200 hover:bg-red-500/10" : "text-slate-100"
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.hasSubmenu ? <ChevronDown className="-rotate-90 size-3.5 text-muted-foreground" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function LeadInitialAvatar({
  name,
  avatar,
  temperature,
  size = "md",
  neutral = false
}: {
  name: string;
  avatar?: string;
  temperature: Conversation["lead"]["temperature"];
  size?: "sm" | "md" | "lg" | "xl";
  neutral?: boolean;
}) {
  const avatarTones = [
    "border-[#0B5FA5]/42 bg-[linear-gradient(135deg,rgba(11,95,165,0.72),rgba(17,24,39,0.96))] text-blue-50",
    "border-[#FACC15]/34 bg-[linear-gradient(135deg,rgba(250,204,21,0.72),rgba(31,41,55,0.96))] text-[#0B1120]",
    "border-white/14 bg-[linear-gradient(135deg,rgba(31,41,55,0.98),rgba(11,17,32,0.98))] text-slate-100",
    "border-[#64748B]/34 bg-[linear-gradient(135deg,rgba(51,65,85,0.92),rgba(15,23,42,0.98))] text-slate-100",
    "border-[#38BDF8]/28 bg-[linear-gradient(135deg,rgba(14,116,144,0.62),rgba(17,24,39,0.96))] text-cyan-50"
  ];
  const seed = `${name}-${temperature}-${neutral ? "soft" : "solid"}`;
  const toneIndex = Array.from(seed).reduce((total, char) => total + char.charCodeAt(0), 0) % avatarTones.length;
  const sizes = {
    sm: "size-9 text-xs",
    md: "size-10 text-sm",
    lg: "size-12 text-base",
    xl: "size-14 text-lg"
  };

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full border font-mono font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_24px_rgba(0,0,0,0.24)]",
        avatar ? "border-white/12 bg-[#111827]" : avatarTones[toneIndex],
        sizes[size]
      )}
      aria-hidden="true"
    >
      {avatar ? (
        <img src={avatar} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span className="relative z-10">{initialsFromName(name)}</span>
      )}
    </span>
  );
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
      avatar: lead.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(lead.name)}`,
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
  const [inboxView, setInboxView] = useState<InboxView>("all");
  const [showInboxLists, setShowInboxLists] = useState(false);
  const [inboxLists, setInboxLists] = useState<string[]>(["Clientes auto escola", "Prospeccao quente", "Retorno financeiro"]);
  const [newInboxListName, setNewInboxListName] = useState("");
  const [editingInboxList, setEditingInboxList] = useState<string | null>(null);
  const [editingInboxListName, setEditingInboxListName] = useState("");
  const [activeInboxList, setActiveInboxList] = useState<string | null>(null);
  const [previewTooltip, setPreviewTooltip] = useState<PreviewTooltip>(null);
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
  const [openConversationMenuId, setOpenConversationMenuId] = useState<string | null>(null);
  const draftTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const filteredConversations = useMemo(() => {
    const normalized = conversationQuery.trim().toLowerCase();
    const visibleByView = availableConversations.filter((conversation, index) => {
      if (inboxView === "favorites") return conversation.lead.temperature === "quente" || index === 0;
      if (inboxView === "locked") return manualConversationIds.includes(conversation.lead.id) || conversation.status === "human";
      if (inboxView === "archived") return false;
      return true;
    });

    if (!normalized) {
      return visibleByView;
    }

    return visibleByView.filter((conversation) =>
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
  }, [availableConversations, conversationQuery, inboxView, manualConversationIds]);
  const active = availableConversations.find((conversation) => conversation.lead.id === activeId) ?? availableConversations[0] ?? conversations[0];
  const editingReply = quickReplies.find((reply) => reply.id === editingReplyId);
  const canSendDraft = draftMessage.trim().length > 0 || Boolean(draftAttachment);
  const isManualAttendance = manualConversationIds.includes(active.lead.id) || active.status === "human";
  const currentAgent = "Carla Vendas";
  const favoriteCount = availableConversations.filter((conversation, index) => conversation.lead.temperature === "quente" || index === 0).length;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(inboxListsStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setInboxLists(parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0));
        }
      }
    } catch {
      setInboxLists(["Clientes auto escola", "Prospeccao quente", "Retorno financeiro"]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(inboxListsStorageKey, JSON.stringify(inboxLists));
  }, [inboxLists]);

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

  function selectInboxView(view: InboxView) {
    setInboxView(view);
    setActiveInboxList(null);
  }

  function selectInboxList(listName: string) {
    setActiveInboxList(listName);
    setInboxView("all");
    setShowInboxLists(false);
  }

  function createInboxList() {
    const listName = newInboxListName.trim();
    if (!listName) return;

    setInboxLists((current) => (current.some((item) => item.toLowerCase() === listName.toLowerCase()) ? current : [listName, ...current]));
    setNewInboxListName("");
  }

  function startEditInboxList(listName: string) {
    setEditingInboxList(listName);
    setEditingInboxListName(listName);
  }

  function saveEditedInboxList() {
    const nextName = editingInboxListName.trim();
    if (!editingInboxList || !nextName) return;

    setInboxLists((current) =>
      current.map((item) => (item === editingInboxList ? nextName : item)).filter((item, index, array) => array.findIndex((value) => value.toLowerCase() === item.toLowerCase()) === index)
    );
    if (activeInboxList === editingInboxList) {
      setActiveInboxList(nextName);
    }
    setEditingInboxList(null);
    setEditingInboxListName("");
  }

  function deleteInboxList(listName: string) {
    const confirmed = window.confirm(`Deseja apagar a lista "${listName}"?`);
    if (!confirmed) return;

    setInboxLists((current) => current.filter((item) => item !== listName));
    if (activeInboxList === listName) {
      setActiveInboxList(null);
      setInboxView("all");
    }
  }

  function showPreviewTooltip(event: MouseEvent<HTMLElement>, text: string) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPreviewTooltip({
      text,
      top: Math.max(84, rect.top + rect.height / 2),
      left: Math.min(window.innerWidth - 360, rect.right + 18)
    });
  }

  return (
    <>
      <Topbar title="Central de Atendimento" subtitle="WhatsApp + IA com intervencao humana sem perda de contexto" />
      {previewTooltip ? (
        <div
          className="pointer-events-none fixed z-[220] w-[min(340px,calc(100vw-2rem))] -translate-y-1/2 rounded-xl border border-white/10 bg-[#0b1120]/98 p-3 text-xs leading-5 text-slate-100 opacity-100 shadow-[0_24px_70px_rgba(0,0,0,0.56)] backdrop-blur-xl"
          style={{ top: previewTooltip.top, left: previewTooltip.left }}
        >
          {previewTooltip.text}
        </div>
      ) : null}
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden bg-[radial-gradient(circle_at_42%_0%,rgba(11,95,165,0.10),transparent_34%),linear-gradient(180deg,rgba(250,204,21,0.035),transparent_24%),#0B1120] md:grid-cols-[380px_1fr] xl:grid-cols-[380px_minmax(460px,0.78fr)_320px]">
        <aside className="flex min-h-0 flex-col overflow-hidden border-r border-white/[0.08] bg-[#111827]/72 backdrop-blur-xl">
          <div className="border-b border-white/[0.08] p-3">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold">Caixa de entrada</h2>
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
            <div className="mt-3 flex items-center gap-1.5">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {[
                  { id: "all" as const, label: "Tudo", count: availableConversations.length },
                  { id: "favorites" as const, label: "Favoritos", count: favoriteCount }
                ].map((item) => {
                  const active = !activeInboxList && inboxView === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectInboxView(item.id)}
                      className={cn(
                        "h-8 shrink-0 rounded-full border px-3 text-xs font-bold transition",
                        active
                          ? "border-primary/45 bg-primary/18 text-primary"
                          : "border-white/10 bg-white/[0.035] text-muted-foreground hover:border-white/20 hover:text-foreground"
                      )}
                    >
                      <span>{item.label}</span>
                      <span className={cn("ml-1 rounded-full px-1.5 py-0.5 text-[10px]", active ? "bg-[#0B1120]/18" : "bg-white/[0.06]")}>{item.count}</span>
                    </button>
                  );
                })}
                {activeInboxList ? (
                  <button
                    type="button"
                    className="h-8 shrink-0 rounded-full border border-primary/45 bg-primary/18 px-3 text-xs font-bold text-primary"
                  >
                    {activeInboxList}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowInboxLists(true);
                  setEditingInboxList(null);
                }}
                className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/12 text-primary transition hover:bg-primary/20"
                aria-label="Criar nova lista"
              >
                <Plus className="size-4" />
              </button>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowInboxLists((current) => !current)}
                  className={cn(
                    "grid size-8 place-items-center rounded-full border transition",
                    showInboxLists
                      ? "border-primary/40 bg-primary/14 text-primary"
                      : "border-white/10 bg-white/[0.035] text-muted-foreground hover:border-white/20 hover:text-foreground"
                  )}
                  aria-label="Abrir listas da caixa de entrada"
                >
                  <ChevronDown className={cn("size-4 transition", showInboxLists && "rotate-180")} />
                </button>
                {showInboxLists ? (
                  <div className="absolute right-0 top-9 z-[120] w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#0B1120]/[0.98] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.52)] backdrop-blur-xl">
                    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-2">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Cadastrar lista</p>
                      <div className="flex items-center gap-2">
                        <input
                          value={newInboxListName}
                          onChange={(event) => setNewInboxListName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              createInboxList();
                            }
                          }}
                          placeholder="Nome da nova lista"
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-xs font-semibold text-white outline-none placeholder:text-muted-foreground focus:border-primary/50"
                        />
                        <button
                          type="button"
                          onClick={createInboxList}
                          className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:brightness-105"
                          aria-label="Cadastrar nova lista"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                      {inboxLists.map((listName) => (
                        <div
                          key={listName}
                          className={cn(
                            "group/list flex w-full items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-white/[0.06]",
                            activeInboxList === listName ? "text-primary" : "text-slate-100"
                          )}
                        >
                          {editingInboxList === listName ? (
                            <input
                              value={editingInboxListName}
                              onChange={(event) => setEditingInboxListName(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  saveEditedInboxList();
                                }
                                if (event.key === "Escape") {
                                  setEditingInboxList(null);
                                  setEditingInboxListName("");
                                }
                              }}
                              className="min-w-0 flex-1 rounded-lg border border-primary/30 bg-[#111827] px-2 py-1.5 text-xs font-bold text-white outline-none"
                              autoFocus
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => selectInboxList(listName)}
                              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 text-left text-xs font-bold"
                            >
                              <Star className="size-4 shrink-0 text-muted-foreground" />
                              <span className="min-w-0 flex-1 truncate">{listName}</span>
                              <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-muted-foreground">0</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => (editingInboxList === listName ? saveEditedInboxList() : startEditInboxList(listName))}
                            className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground opacity-70 transition hover:bg-primary/10 hover:text-primary group-hover/list:opacity-100"
                            aria-label={`Editar lista ${listName}`}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteInboxList(listName)}
                            className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground opacity-70 transition hover:bg-red-500/10 hover:text-red-300 group-hover/list:opacity-100"
                            aria-label={`Apagar lista ${listName}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="my-1 border-t border-white/10" />
                    <button
                      type="button"
                      onClick={() => {
                        selectInboxView("locked");
                        setShowInboxLists(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-100 transition hover:bg-white/[0.06]"
                    >
                      <LockKeyhole className="size-4 text-muted-foreground" />
                      Conversas trancadas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        selectInboxView("archived");
                        setShowInboxLists(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-100 transition hover:bg-white/[0.06]"
                    >
                      <Archive className="size-4 text-muted-foreground" />
                      Arquivadas
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="min-h-0 max-h-[calc(100vh-238px)] flex-1 space-y-1.5 overflow-x-hidden overflow-y-auto overscroll-contain p-2.5 pr-3 scrollbar-thin">
            {filteredConversations.map((conversation) => {
              const selected = conversation.lead.id === activeId;
              const chance = closingChanceByTemperature[conversation.lead.temperature];

              return (
                <div
                  key={conversation.lead.id}
                  className={cn(
                    "group relative flex w-full items-start gap-2.5 rounded-2xl border border-white/[0.08] bg-[#111827]/88 p-2.5 text-left shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition-all duration-200 hover:z-[85] hover:-translate-y-0.5 hover:border-[#0B5FA5]/45 hover:bg-[#132033]",
                    selected && "border-[#FACC15]/42 bg-[linear-gradient(135deg,rgba(250,204,21,0.12),rgba(17,24,39,0.96))] shadow-[0_18px_42px_rgba(0,0,0,0.24)]",
                    openConversationMenuId === conversation.lead.id && "z-[80]"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(conversation.lead.id);
                      setOpenConversationMenuId(null);
                    }}
                    className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                  >
                  <div className="relative shrink-0">
                    <LeadInitialAvatar name={conversation.lead.name} avatar={conversation.lead.avatar} temperature={conversation.lead.temperature} size="sm" neutral />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-extrabold">{conversation.lead.name}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{conversation.lead.lastInteraction}</span>
                    </div>
                    <div
                      className="group/preview relative mt-0.5 flex items-center gap-1.5"
                      onMouseEnter={(event) => showPreviewTooltip(event, conversation.preview)}
                      onMouseLeave={() => setPreviewTooltip(null)}
                    >
                      <p className="flex-1 truncate text-[11px] text-muted-foreground">{conversation.preview}</p>
                      {conversation.unread > 0 ? (
                        <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          {conversation.unread}
                        </span>
                      ) : null}
                    </div>
                    {false ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-bold capitalize", temperatureClasses[conversation.lead.temperature])}>
                        {temperatureEmoji[conversation.lead.temperature]} {conversation.lead.temperature}
                      </span>
                      <span className="rounded-full border border-[#0B5FA5]/35 bg-[#0B5FA5]/16 px-1.5 py-0.5 text-[9px] font-bold text-blue-100">
                        {originEmoji[conversation.lead.origin] ?? "📍"} {conversation.lead.origin}
                      </span>
                      <span className="ml-auto rounded-full border border-white/10 bg-white/[0.045] px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                        {chance}%
                      </span>
                    </div>
                    ) : null}
                  </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenConversationMenuId((current) => (current === conversation.lead.id ? null : conversation.lead.id))}
                    className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-white/[0.08] hover:text-foreground group-hover:opacity-100"
                    aria-label="Acoes da conversa"
                  >
                    <ChevronDown className={cn("size-4 transition", openConversationMenuId === conversation.lead.id && "rotate-180")} />
                  </button>
                  {openConversationMenuId === conversation.lead.id ? (
                    <ConversationInboxMenu
                      onClose={() => setOpenConversationMenuId(null)}
                      onArchive={() => {
                        setAvailableConversations((current) => current.filter((item) => item.lead.id !== conversation.lead.id));
                        if (activeId === conversation.lead.id) {
                          const next = availableConversations.find((item) => item.lead.id !== conversation.lead.id);
                          if (next) setActiveId(next.lead.id);
                        }
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
            {filteredConversations.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-center text-xs font-semibold text-muted-foreground">
                Nenhuma conversa encontrada.
              </div>
            ) : null}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-[#0B1120]/74">
          <div className="border-b border-white/[0.08] bg-[#111827]/72 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <LeadInitialAvatar name={active.lead.name} avatar={active.lead.avatar} temperature={active.lead.temperature} size="lg" />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-base font-extrabold">{active.lead.name}</span>
              </div>
              <span
                className={cn(
                  "hidden items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold sm:inline-flex",
                  isManualAttendance
                    ? "border-[#FACC15]/40 bg-[#FACC15]/14 text-[#FACC15] shadow-[0_0_20px_rgba(250,204,21,0.12)]"
                    : "border-[#0B5FA5]/50 bg-[#0B5FA5]/18 text-blue-100 shadow-[0_0_22px_rgba(11,95,165,0.16)]"
                )}
              >
                {isManualAttendance ? <UserCheck className="size-3" /> : <Sparkles className="size-3" />}
                {isManualAttendance ? `Piloto: ${currentAgent}` : "IA conduzindo"}
              </span>
              <button
                onClick={isManualAttendance ? returnConversationToAi : assumeConversation}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition hover:-translate-y-0.5",
                  isManualAttendance
                    ? "border-[#0B5FA5]/50 bg-[#0B5FA5]/16 text-blue-100 shadow-[0_0_22px_rgba(11,95,165,0.14)] hover:border-[#38BDF8]/45 hover:bg-[#0B5FA5]/24"
                    : "border-[#0B5FA5]/35 bg-[#0B5FA5]/10 text-blue-100 hover:border-[#0B5FA5]/55 hover:bg-[#0B5FA5]/18"
                )}
              >
                {isManualAttendance ? <Sparkles className="size-3.5" /> : <Pause className="size-3.5" />}
                {isManualAttendance ? "Devolver para IA" : "Pausar IA"}
              </button>
              <button
                onClick={assumeConversation}
                disabled={isManualAttendance}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0",
                  isManualAttendance
                    ? "border border-[#FACC15]/45 bg-[#FACC15]/16 text-[#FACC15] shadow-[0_0_24px_rgba(250,204,21,0.14)]"
                    : "bg-primary text-primary-foreground"
                )}
              >
                <UserCheck className="size-3.5" />
                {isManualAttendance ? "Assumido" : "Assumir"}
              </button>
            </div>
          </div>

          <div className="whatsapp-chat-bg flex-1 overflow-y-auto p-4 scrollbar-thin">
            <div className="flex w-full flex-col space-y-4">
            {active.messages.map((message) => {
              const isCompany = message.from !== "lead";

              return (
                <div key={message.id} className={cn("flex", isCompany ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "min-w-[300px] max-w-[78%] rounded-2xl border px-4 py-3 text-sm shadow-[0_14px_34px_rgba(0,0,0,0.16)] backdrop-blur transition hover:-translate-y-0.5 md:min-w-[460px]",
                      isCompany
                        ? "border-primary/30 bg-primary/[0.14]"
                        : "border-white/10 bg-card/86"
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
                  className="group/ai-hint relative inline-flex shrink-0 items-center gap-2 overflow-visible rounded-full border border-[#0B5FA5]/40 bg-[#0B5FA5]/18 px-3 py-1.5 text-xs font-black text-blue-100 shadow-[0_0_18px_rgba(11,95,165,0.14)] transition hover:-translate-y-0.5 hover:border-[#0B5FA5]/70 hover:bg-[#0B5FA5]/24"
                  title="Clique para inserir a mensagem sugerida no campo do chat."
                >
                  <WandSparkles className="size-3.5 text-blue-200" />
                  Sugestao de IA
                  <span className="pointer-events-none absolute bottom-full left-0 z-40 mb-2 w-[min(420px,calc(100vw-2rem))] translate-y-1 rounded-2xl border border-[#0B5FA5]/28 bg-[#07111f]/98 p-3 text-left text-xs font-semibold leading-5 text-blue-50 opacity-0 shadow-[0_22px_60px_rgba(0,0,0,0.45),0_0_24px_rgba(11,95,165,0.12)] backdrop-blur-xl transition-all duration-200 group-hover/ai-hint:translate-y-0 group-hover/ai-hint:opacity-100">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">
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

        <aside className="hidden min-h-0 flex-col gap-3 overflow-y-auto border-l border-white/[0.08] bg-[#111827]/72 p-4 backdrop-blur-xl scrollbar-thin xl:flex">
          <section className="rounded-2xl border border-[#0B5FA5]/22 bg-[linear-gradient(145deg,rgba(11,95,165,0.10),rgba(17,24,39,0.78))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
            <div className="flex items-center gap-3">
              <LeadInitialAvatar name={active.lead.name} avatar={active.lead.avatar} temperature={active.lead.temperature} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold">{active.lead.name}</div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{active.lead.phone}</div>
              </div>
              <span className={cn("rounded-full border px-2 py-1 text-[10px] font-black", isManualAttendance ? "border-[#FACC15]/30 bg-[#FACC15]/10 text-[#FACC15]" : "border-[#22C55E]/25 bg-[#22C55E]/10 text-[#22C55E]")}>
                {isManualAttendance ? "Piloto" : "IA ativa"}
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-white/[0.08] bg-background/35 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-100/75">Direcionamento</div>
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
                      className={cn("h-full rounded-full bg-gradient-to-r", temperatureBar[active.lead.temperature].gradient)}
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
                      className={cn("h-full rounded-full bg-gradient-to-r", sentimentBar[getLeadSentiment(active)].gradient)}
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
              <LeadInitialAvatar name={active.lead.name} avatar={active.lead.avatar} temperature={active.lead.temperature} size="xl" />
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
    <div className={cn(compact && "rounded-xl border border-white/[0.06] bg-[#0B1120]/45 px-2.5 py-2")}>
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
      className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 transition hover:border-[#0B5FA5]/30 hover:bg-white/[0.05]"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
        <span className="grid size-9 shrink-0 place-items-center rounded-2xl border border-[#0B5FA5]/25 bg-[#0B5FA5]/14 text-blue-100">
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
      <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-[#0B5FA5]/14 text-blue-100">
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
