"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode, type WheelEvent } from "react";
import {
  Archive,
  CalendarClock,
  ChevronDown,
  Filter,
  Gauge,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Smile,
  Bot,
  Workflow,
  Trash2,
  X
} from "lucide-react";
import { Topbar } from "@/components/topbar";
import { leads as mockLeads } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type PipelineStage =
  | "novo"
  | "ia"
  | "qualificado"
  | "atendimento"
  | "orcamento"
  | "negociacao"
  | "interessado"
  | "followup"
  | "perdido"
  | "matricula_pendente"
  | "matricula_realizada";

type LeadCard = {
  id: string;
  name: string;
  phone: string;
  origin: string;
  status: PipelineStage;
  temperature: "quente" | "morno" | "frio" | "urgente";
  sentiment: "positivo" | "neutro" | "duvida" | "negativo";
  lastMessage: string;
  lastInteraction: string;
  responsible: string;
  initials: string;
  notes: string;
  archived?: boolean;
};

type LeadDraft = {
  name: string;
  phone: string;
  origin: string;
  status: PipelineStage;
  temperature: LeadCard["temperature"];
  sentiment: LeadCard["sentiment"];
  lastMessage: string;
  responsible: string;
  notes: string;
};

type PipelineGroup = "Comercial" | "Follow-up" | "Fechamento";

const pipelineGroups: PipelineGroup[] = ["Comercial", "Follow-up", "Fechamento"];

const STORAGE_KEY = "auto-pro-ia:kanban-leads";

const pipelineStages: Array<{
  id: PipelineStage;
  title: string;
  group: PipelineGroup;
  dot: string;
  accent: string;
}> = [
  { id: "novo", title: "Novo Lead", group: "Comercial", dot: "bg-sky-400", accent: "from-sky-500/10" },
  { id: "ia", title: "IA Atendendo", group: "Comercial", dot: "bg-violet-400", accent: "from-violet-500/10" },
  { id: "qualificado", title: "Qualificado", group: "Comercial", dot: "bg-cyan-400", accent: "from-cyan-500/10" },
  { id: "atendimento", title: "Em Atendimento", group: "Comercial", dot: "bg-blue-400", accent: "from-blue-500/10" },
  { id: "orcamento", title: "Orcamento Enviado", group: "Comercial", dot: "bg-amber-300", accent: "from-amber-500/10" },
  { id: "negociacao", title: "Negociacao", group: "Comercial", dot: "bg-orange-400", accent: "from-orange-500/10" },
  { id: "interessado", title: "Interessado", group: "Follow-up", dot: "bg-fuchsia-400", accent: "from-fuchsia-500/10" },
  { id: "followup", title: "Follow up", group: "Follow-up", dot: "bg-purple-400", accent: "from-purple-500/10" },
  { id: "perdido", title: "Leads Perdidos", group: "Follow-up", dot: "bg-red-400", accent: "from-red-500/10" },
  { id: "matricula_pendente", title: "Matricula Pendente", group: "Fechamento", dot: "bg-yellow-300", accent: "from-yellow-500/10" },
  { id: "matricula_realizada", title: "Matricula Realizada", group: "Fechamento", dot: "bg-emerald-400", accent: "from-emerald-500/10" }
];

const origins = ["Todos", "Meta Ads", "Google Ads", "WhatsApp", "Instagram", "Indicacao", "Site"];
const temperatureFilters: Array<LeadCard["temperature"] | "todos"> = ["todos", "urgente", "quente", "morno", "frio"];
const sentimentFilters: Array<LeadCard["sentiment"] | "todos"> = ["todos", "positivo", "neutro", "duvida", "negativo"];

const stageFromMock = {
  novo: "novo",
  ia: "ia",
  qualificado: "qualificado",
  interessado: "interessado",
  negociacao: "negociacao",
  followup: "followup",
  fechado: "matricula_realizada",
  perdido: "perdido"
} as const;

const legacyStageMap: Record<string, PipelineStage> = {
  novo: "novo",
  ia: "ia",
  qualificado: "qualificado",
  atendimento: "atendimento",
  orcamento: "orcamento",
  interessado: "interessado",
  agendado: "matricula_pendente",
  followup: "followup",
  fechado: "matricula_realizada",
  perdido: "perdido",
  negociacao: "negociacao",
  interessado_followup: "followup",
  matricula_pendente: "matricula_pendente",
  matricula_realizada: "matricula_realizada"
};

const quickMessages = [
  "Solicitou valores e condicoes para CNH B.",
  "Quer falar com consultor antes de fechar matricula.",
  "Pediu disponibilidade para aulas no periodo noturno.",
  "Recebeu proposta e esta comparando formas de pagamento.",
  "Lead pronto para agendamento de visita.",
  "Aguardando retorno do responsavel comercial."
];

function kanbanNextAction(status: PipelineStage) {
  const actions: Record<PipelineStage, string> = {
    novo: "Qualificar interesse",
    ia: "Monitorar IA",
    qualificado: "Enviar proposta",
    atendimento: "Responder duvida",
    orcamento: "Confirmar condicao",
    negociacao: "Remover objecao",
    interessado: "Agendar visita",
    followup: "Fazer retorno",
    perdido: "Registrar motivo",
    matricula_pendente: "Validar documentos",
    matricula_realizada: "Encerrar atendimento"
  };

  return actions[status];
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function createInitialLeads(): LeadCard[] {
  return mockLeads.map((lead, index) => ({
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    origin: lead.origin,
    status: stageFromMock[lead.stage],
    temperature: lead.temperature,
    sentiment: ["positivo", "duvida", "neutro", "negativo"][index % 4] as LeadCard["sentiment"],
    lastMessage: quickMessages[index % quickMessages.length],
    lastInteraction: lead.lastInteraction,
    responsible: lead.responsible,
    initials: initialsFromName(lead.name),
    notes: lead.notes ?? "Lead cadastrado para acompanhamento comercial."
  }));
}

function migrateStoredLeads(storedLeads: LeadCard[]) {
  return storedLeads.map((lead) => {
    const status = legacyStageMap[lead.status] ?? "novo";
    return { ...lead, status, sentiment: lead.sentiment ?? "neutro" };
  });
}

const emptyDraft: LeadDraft = {
  name: "",
  phone: "",
  origin: "WhatsApp",
  status: "novo",
  temperature: "quente",
  sentiment: "positivo",
  lastMessage: "",
  responsible: "Carla Vendas",
  notes: ""
};

const temperatureClasses: Record<LeadCard["temperature"], string> = {
  quente: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  morno: "border-yellow-500/30 bg-yellow-500/15 text-yellow-300",
  frio: "border-sky-500/30 bg-sky-500/15 text-sky-300",
  urgente: "border-red-500/30 bg-red-500/15 text-red-300"
};

const sentimentClasses: Record<LeadCard["sentiment"], string> = {
  positivo: "border-cyan-400/30 bg-cyan-400/15 text-cyan-200",
  neutro: "border-slate-400/30 bg-slate-400/[0.12] text-slate-200",
  duvida: "border-violet-400/30 bg-violet-400/15 text-violet-200",
  negativo: "border-red-400/30 bg-red-400/15 text-red-200"
};

const temperatureEmoji: Record<LeadCard["temperature"], string> = {
  quente: "🔥",
  morno: "🌤️",
  frio: "❄️",
  urgente: "🚨"
};

const originEmoji: Record<string, string> = {
  "Meta Ads": "🎯",
  "Google Ads": "🔎",
  Instagram: "📸",
  Indicacao: "🤝",
  Site: "🌐"
};

const sentimentEmoji: Record<LeadCard["sentiment"], string> = {
  positivo: "😊",
  neutro: "😐",
  duvida: "🤔",
  negativo: "😟"
};

const avatarClasses: Record<PipelineStage, string> = {
  novo: "bg-emerald-500 text-white",
  ia: "bg-violet-500 text-white",
  qualificado: "bg-cyan-400 text-primary-foreground",
  atendimento: "bg-blue-500 text-white",
  orcamento: "bg-yellow-400 text-primary-foreground",
  negociacao: "bg-orange-500 text-white",
  interessado: "bg-fuchsia-500 text-white",
  followup: "bg-purple-500 text-white",
  perdido: "bg-red-500 text-white",
  matricula_pendente: "bg-amber-400 text-primary-foreground",
  matricula_realizada: "bg-emerald-500 text-white"
};

export default function KanbanPage() {
  const [leads, setLeads] = useState<LeadCard[]>([]);
  const [query, setQuery] = useState("");
  const [originFilter, setOriginFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState<PipelineStage | "todos">("todos");
  const [temperatureFilter, setTemperatureFilter] = useState<LeadCard["temperature"] | "todos">("todos");
  const [sentimentFilter, setSentimentFilter] = useState<LeadCard["sentiment"] | "todos">("todos");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LeadDraft>(emptyDraft);
  const [isCreating, setIsCreating] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [movedLeadId, setMovedLeadId] = useState<string | null>(null);
  const [collapsedStages, setCollapsedStages] = useState<PipelineStage[]>([]);
  const [expandedLeadIds, setExpandedLeadIds] = useState<string[]>([]);
  const [openFilter, setOpenFilter] = useState<"origin" | "stage" | "temperature" | "sentiment" | null>(null);

  useEffect(() => {
    let mounted = true;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        if (mounted) {
          setLeads(migrateStoredLeads(JSON.parse(stored) as LeadCard[]));
          setHasHydrated(true);
        }
        return;
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    if (mounted) {
      setLeads(createInitialLeads());
      setHasHydrated(true);
    }

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (leads.length > 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    }
  }, [leads]);

  const activeLead = useMemo(
    () => leads.find((lead) => lead.id === activeLeadId) ?? null,
    [activeLeadId, leads]
  );

  const visibleLeads = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return leads.filter((lead) => {
      if (lead.archived) {
        return false;
      }

      const matchesQuery =
        normalized.length === 0 ||
        [lead.name, lead.phone, lead.origin, lead.lastMessage, lead.responsible].some((value) =>
          value.toLowerCase().includes(normalized)
        );
      const matchesOrigin = originFilter === "Todos" || lead.origin === originFilter;
      const matchesStatus = statusFilter === "todos" || lead.status === statusFilter;
      const matchesTemperature = temperatureFilter === "todos" || lead.temperature === temperatureFilter;
      const matchesSentiment = sentimentFilter === "todos" || lead.sentiment === sentimentFilter;

      return matchesQuery && matchesOrigin && matchesStatus && matchesTemperature && matchesSentiment;
    });
  }, [leads, originFilter, query, sentimentFilter, statusFilter, temperatureFilter]);

  const visibleStages = useMemo(
    () => pipelineStages.filter((stage) => statusFilter === "todos" || stage.id === statusFilter),
    [statusFilter]
  );

  const aiSuggestion = useMemo(() => {
    const hotClosingLeads = visibleLeads.filter(
      (lead) =>
        ["orcamento", "negociacao", "interessado", "followup"].includes(lead.status) &&
        ["quente", "urgente", "morno"].includes(lead.temperature)
    );
    const followUpLeads = visibleLeads.filter((lead) => lead.status === "followup");
    const quoteLeads = visibleLeads.filter((lead) => lead.status === "orcamento");
    const negotiationLeads = visibleLeads.filter((lead) => lead.status === "negociacao");

    if (hotClosingLeads.length > 0) {
      const bestStage =
        negotiationLeads.length >= quoteLeads.length && negotiationLeads.length >= followUpLeads.length
          ? "Negociacao"
          : quoteLeads.length >= followUpLeads.length
            ? "Orcamento enviado"
            : "Follow up";

      return {
        title: `Foque em ${bestStage}`,
        description: `${hotClosingLeads.length} leads com alta chance de matricula. Priorize proposta objetiva e chamada para fechamento.`,
        score: Math.min(96, 72 + hotClosingLeads.length * 4)
      };
    }

    const iaLeads = visibleLeads.filter((lead) => lead.status === "ia" || lead.status === "qualificado");

    return {
      title: "Qualifique novos leads",
      description: `${iaLeads.length} conversas podem virar atendimento humano. Assuma as que citarem valor, horario ou matricula.`,
      score: Math.min(88, 58 + iaLeads.length * 5)
    };
  }, [visibleLeads]);

  const selectedStageLabel =
    statusFilter === "todos"
      ? "Etapas"
      : pipelineStages.find((stage) => stage.id === statusFilter)?.title ?? "Etapas";
  const selectedOriginLabel = originFilter === "Todos" ? "Origens" : originFilter;
  const selectedTemperatureLabel = temperatureFilter === "todos" ? "Temperatura" : temperatureFilter;
  const selectedSentimentLabel = sentimentFilter === "todos" ? "Sentimento" : sentimentFilter;

  function moveLead(leadId: string, status: PipelineStage) {
    setMovedLeadId(leadId);
    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              status,
              lastInteraction: "agora"
            }
        : lead
      )
    );
    window.setTimeout(() => setMovedLeadId(null), 420);
  }

  function openCreateModal() {
    setDraft(emptyDraft);
    setIsCreating(true);
    setActiveLeadId(null);
  }

  function openEditModal(lead: LeadCard) {
    setDraft({
      name: lead.name,
      phone: lead.phone,
      origin: lead.origin,
      status: lead.status,
      temperature: lead.temperature,
      sentiment: lead.sentiment,
      lastMessage: lead.lastMessage,
      responsible: lead.responsible,
      notes: lead.notes
    });
    setActiveLeadId(lead.id);
    setIsCreating(false);
  }

  function closeModal() {
    setActiveLeadId(null);
    setIsCreating(false);
    setDraft(emptyDraft);
  }

  function saveLead() {
    if (!draft.name.trim()) {
      return;
    }

    if (isCreating) {
      const newLead: LeadCard = {
        id: `lead-${Date.now()}`,
        ...draft,
        lastMessage: draft.lastMessage.trim() || "Novo lead cadastrado manualmente.",
        notes: draft.notes.trim() || "Lead criado pelo botao Novo Lead.",
        initials: initialsFromName(draft.name),
        lastInteraction: "agora"
      };
      setLeads((current) => [newLead, ...current]);
      setQuery("");
      setOriginFilter("Todos");
      setStatusFilter("todos");
      setTemperatureFilter("todos");
      setSentimentFilter("todos");
      closeModal();
      return;
    }

    if (!activeLead) {
      return;
    }

    setLeads((current) =>
      current.map((lead) =>
        lead.id === activeLead.id
          ? {
              ...lead,
              ...draft,
              initials: initialsFromName(draft.name),
              lastInteraction: "agora"
            }
          : lead
      )
    );
    closeModal();
  }

  function archiveLead(leadId: string) {
    setLeads((current) => current.map((lead) => (lead.id === leadId ? { ...lead, archived: true } : lead)));
    closeModal();
  }

  function deleteLead(leadId: string) {
    setLeads((current) => current.filter((lead) => lead.id !== leadId));
    closeModal();
  }

  function toggleStageCollapse(stageId: PipelineStage) {
    setCollapsedStages((current) =>
      current.includes(stageId) ? current.filter((id) => id !== stageId) : [...current, stageId]
    );
  }

  function toggleLeadExpanded(leadId: string) {
    setExpandedLeadIds((current) =>
      current.includes(leadId) ? current.filter((id) => id !== leadId) : [...current, leadId]
    );
  }

  function toggleGroupCollapse(group: PipelineGroup) {
    const groupStageIds = pipelineStages.filter((stage) => stage.group === group).map((stage) => stage.id);

    setCollapsedStages((current) => {
      const shouldCollapse = groupStageIds.some((stageId) => !current.includes(stageId));

      if (shouldCollapse) {
        return Array.from(new Set([...current, ...groupStageIds]));
      }

      return current.filter((stageId) => !groupStageIds.includes(stageId));
    });
  }

  function handleBoardWheel(event: WheelEvent<HTMLElement>) {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest("input, select, textarea, button, a")) {
      return;
    }

    const column = target.closest<HTMLElement>("[data-kanban-column]");
    const scrollAreas = column
      ? [column.querySelector<HTMLElement>("[data-kanban-column-scroll]")]
      : Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-kanban-column-scroll]"));
    const activeScrollAreas = scrollAreas.filter(
      (area): area is HTMLElement => Boolean(area && area.scrollHeight > area.clientHeight)
    );

    if (activeScrollAreas.length === 0) {
      return;
    }

    event.preventDefault();
    activeScrollAreas.forEach((area) => {
      area.scrollTop += event.deltaY;
    });
  }

  return (
    <>
      <Topbar
        title="Funil Kanban"
        subtitle="Arraste leads entre etapas para mover"
        searchValue={query}
        onSearchChange={setQuery}
        onNewLead={openCreateModal}
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_28%_0%,rgba(82,39,255,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.018),transparent_30%),var(--background)]">
        <section className="relative z-30 border-b border-white/[0.08] bg-background/72 px-4 py-5 backdrop-blur-xl xl:px-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1 lg:hidden">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome, telefone, origem..."
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.045] pl-10 pr-4 text-sm outline-none transition duration-200 placeholder:text-muted-foreground/70 hover:border-white/[0.16] focus:border-primary/55 focus:bg-white/[0.065] focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex">
              <div className="relative" onMouseLeave={() => setOpenFilter((current) => (current === "origin" ? null : current))}>
                <button
                  type="button"
                  onClick={() => setOpenFilter((current) => (current === "origin" ? null : "origin"))}
                  className={cn(
                    "grid h-12 w-full grid-cols-[20px_1fr_18px] items-center gap-2 rounded-2xl border border-white/10 bg-[#121c2b] px-3 text-left text-sm font-semibold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_28px_rgba(0,0,0,0.16)] outline-none transition duration-200 hover:border-white/[0.18] hover:bg-[#162235] focus:border-primary/55 focus:ring-4 focus:ring-primary/10 sm:w-48",
                    openFilter === "origin" && "border-primary/45 bg-[#162235] ring-4 ring-primary/10"
                  )}
                >
                  <Filter className="size-4 justify-self-center text-muted-foreground" />
                  <span className="truncate">{selectedOriginLabel}</span>
                  <ChevronDown className={cn("size-4 justify-self-center text-muted-foreground transition-transform duration-200", openFilter === "origin" && "rotate-180 text-primary")} />
                </button>

                {openFilter === "origin" ? (
                  <div className="absolute left-0 top-14 z-[80] w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1422]/98 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                    <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Origem do lead</p>
                    <div className="grid gap-1">
                      {origins.map((origin) => {
                        const label = origin === "Todos" ? "Origens" : origin;
                        const isActive = originFilter === origin;

                        return (
                          <button
                            key={origin}
                            type="button"
                            onClick={() => {
                              setOriginFilter(origin);
                              setOpenFilter(null);
                            }}
                            className={cn(
                              "flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-white/[0.055]",
                              isActive ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <span>{label}</span>
                            {isActive ? <span className="size-1.5 rounded-full bg-primary shadow-glow" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="relative" onMouseLeave={() => setOpenFilter((current) => (current === "stage" ? null : current))}>
                <button
                  type="button"
                  onClick={() => setOpenFilter((current) => (current === "stage" ? null : "stage"))}
                  className={cn(
                    "grid h-12 w-full grid-cols-[20px_1fr_18px] items-center gap-2 rounded-2xl border border-white/10 bg-[#121c2b] px-3 text-left text-sm font-semibold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_28px_rgba(0,0,0,0.16)] outline-none transition duration-200 hover:border-white/[0.18] hover:bg-[#162235] focus:border-primary/55 focus:ring-4 focus:ring-primary/10 sm:w-56",
                    openFilter === "stage" && "border-primary/45 bg-[#162235] ring-4 ring-primary/10"
                  )}
                >
                  <Workflow className="size-4 justify-self-center text-muted-foreground" />
                  <span className="truncate">{selectedStageLabel}</span>
                  <ChevronDown className={cn("size-4 justify-self-center text-muted-foreground transition-transform duration-200", openFilter === "stage" && "rotate-180 text-primary")} />
                </button>

                {openFilter === "stage" ? (
                  <div className="absolute left-0 top-14 z-[80] w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1422]/98 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("todos");
                        setCollapsedStages([]);
                        setOpenFilter(null);
                      }}
                      className={cn(
                        "mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-white/[0.055]",
                        statusFilter === "todos" ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Etapas
                      {statusFilter === "todos" ? <span className="size-1.5 rounded-full bg-primary shadow-glow" /> : null}
                    </button>
                    {pipelineGroups.map((group) => (
                      <div key={group} className="border-t border-white/[0.06] pt-2 first:border-t-0">
                        <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{group}</p>
                        <div className="grid gap-1 pb-1">
                          {pipelineStages
                            .filter((stage) => stage.group === group)
                            .map((stage) => {
                              const isActive = statusFilter === stage.id;

                              return (
                                <button
                                  key={stage.id}
                                  type="button"
                                  onClick={() => {
                                    setStatusFilter(stage.id);
                                    setOpenFilter(null);
                                  }}
                                  className={cn(
                                    "flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-white/[0.055]",
                                    isActive ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  {stage.title}
                                  {isActive ? <span className="size-1.5 rounded-full bg-primary shadow-glow" /> : null}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="relative" onMouseLeave={() => setOpenFilter((current) => (current === "temperature" ? null : current))}>
                <button
                  type="button"
                  onClick={() => setOpenFilter((current) => (current === "temperature" ? null : "temperature"))}
                  className={cn(
                    "grid h-12 w-full grid-cols-[20px_1fr_18px] items-center gap-2 rounded-2xl border border-white/10 bg-[#121c2b] px-3 text-left text-sm font-semibold capitalize text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_28px_rgba(0,0,0,0.16)] outline-none transition duration-200 hover:border-white/[0.18] hover:bg-[#162235] focus:border-primary/55 focus:ring-4 focus:ring-primary/10 sm:w-40",
                    openFilter === "temperature" && "border-primary/45 bg-[#162235] ring-4 ring-primary/10"
                  )}
                >
                  <Gauge className="size-4 justify-self-center text-muted-foreground" />
                  <span className="truncate">{selectedTemperatureLabel}</span>
                  <ChevronDown className={cn("size-4 justify-self-center text-muted-foreground transition-transform duration-200", openFilter === "temperature" && "rotate-180 text-primary")} />
                </button>

                {openFilter === "temperature" ? (
                  <div className="absolute left-0 top-14 z-[80] w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1422]/98 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                    <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Temperatura</p>
                    <div className="grid gap-1">
                      {temperatureFilters.map((temperature) => {
                        const isActive = temperatureFilter === temperature;

                        return (
                          <button
                            key={temperature}
                            type="button"
                            onClick={() => {
                              setTemperatureFilter(temperature);
                              setOpenFilter(null);
                            }}
                            className={cn(
                              "flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold capitalize transition hover:bg-white/[0.055]",
                              isActive ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <span>{temperature === "todos" ? "Todas" : temperature}</span>
                            {isActive ? <span className="size-1.5 rounded-full bg-primary shadow-glow" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="relative" onMouseLeave={() => setOpenFilter((current) => (current === "sentiment" ? null : current))}>
                <button
                  type="button"
                  onClick={() => setOpenFilter((current) => (current === "sentiment" ? null : "sentiment"))}
                  className={cn(
                    "grid h-12 w-full grid-cols-[20px_1fr_18px] items-center gap-2 rounded-2xl border border-white/10 bg-[#121c2b] px-3 text-left text-sm font-semibold capitalize text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_28px_rgba(0,0,0,0.16)] outline-none transition duration-200 hover:border-white/[0.18] hover:bg-[#162235] focus:border-primary/55 focus:ring-4 focus:ring-primary/10 sm:w-40",
                    openFilter === "sentiment" && "border-primary/45 bg-[#162235] ring-4 ring-primary/10"
                  )}
                >
                  <Smile className="size-4 justify-self-center text-muted-foreground" />
                  <span className="truncate">{selectedSentimentLabel}</span>
                  <ChevronDown className={cn("size-4 justify-self-center text-muted-foreground transition-transform duration-200", openFilter === "sentiment" && "rotate-180 text-primary")} />
                </button>

                {openFilter === "sentiment" ? (
                  <div className="absolute left-0 top-14 z-[80] w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1422]/98 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                    <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Sentimento</p>
                    <div className="grid gap-1">
                      {sentimentFilters.map((sentiment) => {
                        const isActive = sentimentFilter === sentiment;

                        return (
                          <button
                            key={sentiment}
                            type="button"
                            onClick={() => {
                              setSentimentFilter(sentiment);
                              setOpenFilter(null);
                            }}
                            className={cn(
                              "flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold capitalize transition hover:bg-white/[0.055]",
                              isActive ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <span>{sentiment === "todos" ? "Todos" : sentiment}</span>
                            {isActive ? <span className="size-1.5 rounded-full bg-primary shadow-glow" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => {
                  setOriginFilter("Todos");
                  setStatusFilter("todos");
                  setTemperatureFilter("todos");
                  setSentimentFilter("todos");
                  setCollapsedStages([]);
                  setOpenFilter(null);
                }}
                className="grid h-12 w-full grid-cols-[18px_1fr] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 text-left text-xs font-black uppercase tracking-[0.08em] text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_10px_28px_rgba(0,0,0,0.12)] transition duration-200 hover:border-sky-300/25 hover:bg-sky-300/[0.055] hover:text-foreground focus:border-sky-300/45 focus:outline-none focus:ring-4 focus:ring-sky-400/10 sm:w-40"
              >
                <X className="size-4 justify-self-center" />
                <span className="truncate">Limpar filtros</span>
              </button>

              <div className="group/ai-suggestion relative col-span-2 sm:col-span-1">
                <div className="ai-blue-shine relative grid h-14 grid-cols-[42px_1fr_auto] items-center gap-3 overflow-hidden rounded-2xl border border-sky-300/22 bg-sky-400/[0.07] px-3.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_16px_40px_rgba(14,165,233,0.12)] ring-1 ring-sky-300/10 sm:min-w-[360px] xl:min-w-[500px]">
                  <span className="ai-bot-orbit relative z-10 grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-sky-300/10 text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.16)]">
                    <Bot className="relative z-10 size-4" />
                  </span>
                  <div className="relative z-10 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-200">Sugestao de IA</p>
                    <p className="truncate text-sm font-black text-foreground">{aiSuggestion.title}</p>
                    <p className="hidden truncate text-[11px] font-semibold text-sky-100/65 xl:block">Passe o mouse para ver a acao recomendada</p>
                  </div>
                  <span className="relative z-10 shrink-0 rounded-full border border-sky-300/22 bg-sky-300/10 px-2.5 py-1 font-mono text-[10px] font-black text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.12)]">
                    {aiSuggestion.score}%
                  </span>
                </div>

                <div className="pointer-events-none absolute left-0 top-16 z-[85] w-[min(500px,calc(100vw-2rem))] translate-y-2 rounded-2xl border border-sky-300/18 bg-[#07111f]/98 p-4 opacity-0 shadow-[0_24px_70px_rgba(0,0,0,0.48),0_0_34px_rgba(14,165,233,0.1)] backdrop-blur-xl transition-all duration-200 group-hover/ai-suggestion:pointer-events-auto group-hover/ai-suggestion:translate-y-0 group-hover/ai-suggestion:opacity-100">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-200">IA recomenda agora</p>
                      <h3 className="mt-1 text-sm font-black text-foreground">{aiSuggestion.title}</h3>
                    </div>
                    <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2 py-1 font-mono text-xs font-black text-sky-200">
                      {aiSuggestion.score}%
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">{aiSuggestion.description}</p>
                  <div className="mt-4 grid gap-2">
                    <div className="rounded-xl border border-sky-300/[0.08] bg-sky-300/[0.035] px-3 py-2">
                      <p className="text-xs font-black text-sky-200">1. Prioridade</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Abra os leads quentes desta etapa e responda primeiro quem pediu valor, horario ou matricula.</p>
                    </div>
                    <div className="rounded-xl border border-sky-300/[0.08] bg-sky-300/[0.035] px-3 py-2">
                      <p className="text-xs font-black text-sky-200">2. Acao sugerida</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Envie proposta objetiva e convide para fechar a matricula ainda hoje.</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={openCreateModal}
                className="col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-glow transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_18px_42px_rgba(250,204,21,0.24)] active:translate-y-0 sm:col-span-1 lg:hidden"
              >
                <Plus className="size-4" />
                Novo Lead
              </button>
            </div>
          </div>
        </section>

        <section
          onWheel={handleBoardWheel}
          className="relative z-10 min-h-0 flex-1 overflow-x-auto overflow-y-hidden p-4 scrollbar-thin xl:p-7"
        >
          <div className="flex h-full min-h-0 gap-5 pb-4">
            {(hasHydrated ? visibleStages : pipelineStages.slice(0, 5)).map((stage, index, stagesToRender) => {
              const stageLeads = visibleLeads.filter((lead) => lead.status === stage.id);
              const isActiveDrop = draggedId !== null;
              const showGroupLabel = index === 0 || stagesToRender[index - 1]?.group !== stage.group;
              const isCollapsed = collapsedStages.includes(stage.id);
              const groupStageIds = pipelineStages.filter((item) => item.group === stage.group).map((item) => item.id);
              const isGroupCollapsed = groupStageIds.every((stageId) => collapsedStages.includes(stageId));

              return (
                <div
                  key={stage.id}
                  data-kanban-column
                  className={cn(
                    "flex h-full min-h-0 shrink-0 flex-col transition-[width] duration-300 ease-out",
                    isCollapsed ? "w-[78px]" : "w-[282px] sm:w-[296px] 2xl:w-[312px]"
                  )}
                >
                  <div className="mb-2 h-6 px-2">
                    {showGroupLabel ? (
                      <button
                        type="button"
                        onClick={() => toggleGroupCollapse(stage.group)}
                        title={isGroupCollapsed ? `Expandir ${stage.group}` : `Recolher ${stage.group}`}
                        className={cn(
                          "inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-all duration-200 hover:border-primary/35 hover:bg-primary/10 hover:text-primary",
                          isGroupCollapsed && "border-primary/25 bg-primary/10 text-primary"
                        )}
                      >
                        {stage.group}
                      </button>
                    ) : null}
                  </div>
                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggedId) {
                        moveLead(draggedId, stage.id);
                        setDraggedId(null);
                      }
                    }}
                    className={cn(
                      "flex min-h-0 flex-1 flex-col rounded-[24px] border border-white/10 bg-card/[0.58] bg-gradient-to-b to-card/[0.72] shadow-[0_18px_42px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-all duration-300",
                      isCollapsed ? "p-2.5" : "p-3.5",
                      stage.accent,
                      isActiveDrop && "border-primary/35"
                    )}
                  >
                  <button
                    type="button"
                    onClick={() => toggleStageCollapse(stage.id)}
                    aria-label={isCollapsed ? `Expandir coluna ${stage.title}` : `Recolher coluna ${stage.title}`}
                    title={isCollapsed ? `Expandir ${stage.title}` : `Recolher ${stage.title}`}
                    className={cn(
                      "group/column mb-4 flex w-full items-center gap-2 rounded-[18px] border border-white/[0.06] bg-white/[0.035] px-3 py-2.5 text-left transition-all duration-300 hover:border-primary/25 hover:bg-white/[0.06]",
                      isCollapsed && "mb-0 min-h-[210px] flex-col justify-start px-2 py-3 text-center"
                    )}
                  >
                    <span
                      className={cn(
                        "size-2.5 rounded-full shadow-[0_0_14px_currentColor] transition-transform duration-300 group-hover/column:scale-125",
                        stage.dot
                      )}
                    />
                    <h2
                      className={cn(
                        "flex-1 text-[15px] font-bold tracking-normal",
                        isCollapsed && "flex-none whitespace-normal text-center text-[12px] leading-4 tracking-normal"
                      )}
                    >
                      {isCollapsed
                        ? stage.title.split(" ").map((word) => (
                            <span key={word} className="block">
                              {word}
                            </span>
                          ))
                        : stage.title}
                    </h2>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.055] px-2.5 py-1 font-mono text-[11px] font-bold text-muted-foreground">
                      {stageLeads.length}
                    </span>
                  </button>

                  {!isCollapsed ? (
                  <div
                    data-kanban-column-scroll
                    className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-5 pr-1.5 scrollbar-thin"
                  >
                    {!hasHydrated ? (
                      <KanbanColumnSkeleton />
                    ) : stageLeads.length === 0 ? (
                      <div className="grid h-36 place-items-center rounded-[20px] border border-dashed border-white/[0.12] bg-white/[0.025] px-6 text-center text-sm leading-6 text-muted-foreground">
                        Nenhum lead nesta etapa
                      </div>
                    ) : (
                      stageLeads.map((lead) => {
                        const isExpanded = expandedLeadIds.includes(lead.id);

                        return (
                        <article
                          key={lead.id}
                          draggable
                          onDragStart={() => setDraggedId(lead.id)}
                          onDragEnd={() => setDraggedId(null)}
                          className={cn(
                            "group cursor-grab rounded-[22px] border border-white/10 bg-white/[0.055] p-4 shadow-[0_14px_32px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/24 hover:bg-white/[0.07] hover:shadow-[0_18px_38px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.06)] active:cursor-grabbing active:scale-[0.99]",
                            movedLeadId === lead.id && "animate-[pulse_420ms_ease-out]"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "grid size-10 shrink-0 place-items-center rounded-2xl text-sm font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_24px_rgba(0,0,0,0.20)]",
                                avatarClasses[lead.status]
                              )}
                            >
                              {lead.initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-2">
                                <h3 className="truncate text-[15px] font-bold leading-5">{lead.name}</h3>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    toggleLeadExpanded(lead.id);
                                  }}
                                  aria-label={isExpanded ? `Recolher ${lead.name}` : `Expandir ${lead.name}`}
                                  title={isExpanded ? "Recolher card" : "Expandir card"}
                                  className="ml-auto grid size-8 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-muted-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                                >
                                  <ChevronDown className={cn("size-4 transition-transform duration-300", isExpanded && "rotate-180")} />
                                </button>
                                <button
                                  onClick={() => openEditModal(lead)}
                                  aria-label={`Abrir ${lead.name}`}
                                  className="peer grid size-8 shrink-0 place-items-center rounded-xl text-muted-foreground opacity-0 transition-all duration-200 hover:bg-white/[0.08] hover:text-foreground group-hover:opacity-100"
                                >
                                  <MoreHorizontal className="size-4" />
                                </button>
                                <span className="pointer-events-none absolute right-9 top-3 z-10 translate-y-1 rounded-lg border border-white/10 bg-[#0b1422]/95 px-2.5 py-1 text-[11px] font-semibold text-foreground opacity-0 shadow-[0_12px_28px_rgba(0,0,0,0.28)] backdrop-blur-md transition-all duration-200 peer-hover:translate-y-0 peer-hover:opacity-100">
                                  Detalhes do lead
                                </span>
                              </div>
                              <p className={cn("mt-1.5 items-center gap-1.5 text-xs leading-none text-muted-foreground", isExpanded ? "flex" : "hidden")}>
                                <Phone className="size-3" />
                                {lead.phone}
                              </p>
                              {!isExpanded ? (
                                <p className="mt-1.5 line-clamp-1 text-xs font-semibold text-cyan-100">
                                  {kanbanNextAction(lead.status)}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          {!isExpanded ? (
                            <div className="mt-3 grid grid-cols-3 gap-1.5 text-[10px]">
                              <span className={cn("inline-flex min-w-0 items-center justify-center gap-1 rounded-full border px-1.5 py-1 font-semibold capitalize", temperatureClasses[lead.temperature])}>
                                <span aria-hidden="true">{temperatureEmoji[lead.temperature]}</span>
                                <span className="truncate">{lead.temperature}</span>
                              </span>
                              <span className="inline-flex min-w-0 items-center justify-center gap-1 rounded-full border border-sky-400/20 bg-sky-500/[0.12] px-1.5 py-1 font-semibold text-sky-200">
                                {lead.origin === "WhatsApp" ? (
                                  <WhatsAppLogoIcon />
                                ) : (
                                  <span aria-hidden="true">{originEmoji[lead.origin] ?? "ðŸ“"}</span>
                                )}
                                <span className="truncate">{lead.origin}</span>
                              </span>
                              <span className={cn("inline-flex min-w-0 items-center justify-center gap-1 rounded-full border px-1.5 py-1 font-semibold capitalize", sentimentClasses[lead.sentiment])}>
                                <span aria-hidden="true">{sentimentEmoji[lead.sentiment]}</span>
                                <span className="truncate">{lead.sentiment}</span>
                              </span>
                            </div>
                          ) : null}

                          <p className={cn("mt-4 line-clamp-2 text-[13px] leading-5 text-muted-foreground", !isExpanded && "hidden")}>{lead.lastMessage}</p>

                          <div className={cn("mt-4 flex flex-wrap gap-2", !isExpanded && "hidden")}>
                            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize", temperatureClasses[lead.temperature])}>
                              <span aria-hidden="true">{temperatureEmoji[lead.temperature]}</span>
                              {lead.temperature}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-500/[0.12] px-2.5 py-1 text-[11px] font-semibold text-sky-200">
                              {lead.origin === "WhatsApp" ? (
                                <WhatsAppLogoIcon />
                              ) : (
                                <span aria-hidden="true">{originEmoji[lead.origin] ?? "📍"}</span>
                              )}
                              {lead.origin}
                            </span>
                            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize", sentimentClasses[lead.sentiment])}>
                              <span aria-hidden="true">{sentimentEmoji[lead.sentiment]}</span>
                              {lead.sentiment}
                            </span>
                          </div>

                          <div className={cn("mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[11px] text-muted-foreground", !isExpanded && "hidden")}>
                            <span className="flex items-center gap-1">
                              <CalendarClock className="size-3" />
                              {lead.lastInteraction}
                            </span>
                            <span>{lead.responsible}</span>
                          </div>

                          <Link
                            href={`/conversas?lead=${lead.id}`}
                            className={cn("mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-background/[0.28] px-3 py-2.5 text-xs font-semibold text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/10 hover:text-primary active:translate-y-0", !isExpanded && "hidden")}
                          >
                            <MessageCircle className="size-3.5" />
                            Abrir chat
                          </Link>
                        </article>
                        );
                      })
                    )}
                  </div>
                  ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {(activeLead || isCreating) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <section className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-panel">
            <div className="flex items-start gap-4 border-b border-border p-5">
              <div>
                <h2 className="text-lg font-bold">{isCreating ? "Novo lead" : "Detalhes do lead"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Atualize os dados comerciais e a etapa do funil.
                </p>
              </div>
              <button onClick={closeModal} className="ml-auto grid size-9 place-items-center rounded-lg hover:bg-accent">
                <X className="size-4" />
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Nome">
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  className="kanban-input [&_option]:bg-[#0b1422] [&_option]:text-white"
                  placeholder="Nome do lead"
                />
              </Field>

              <Field label="WhatsApp">
                <input
                  value={draft.phone}
                  onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                  className="kanban-input [&_option]:bg-[#0b1422] [&_option]:text-white"
                  placeholder="+55 75 99999-0000"
                />
              </Field>

              <Field label="Origem">
                <select
                  value={draft.origin}
                  onChange={(event) => setDraft((current) => ({ ...current, origin: event.target.value }))}
                  className="kanban-input [&_option]:bg-[#0b1422] [&_option]:text-white"
                >
                  {origins
                    .filter((origin) => origin !== "Todos")
                    .map((origin) => (
                      <option key={origin} value={origin}>
                        {origin}
                      </option>
                    ))}
                </select>
              </Field>

              <Field label="Etapa">
                <select
                  value={draft.status}
                  onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as PipelineStage }))}
                  className="kanban-input [&_option]:bg-[#0b1422] [&_option]:text-white"
                >
                  {pipelineGroups.map((group) => (
                    <optgroup key={group} label={group}>
                      {pipelineStages
                        .filter((stage) => stage.group === group)
                        .map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.title}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </Field>

              <Field label="Temperatura">
                <select
                  value={draft.temperature}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, temperature: event.target.value as LeadCard["temperature"] }))
                  }
                  className="kanban-input"
                >
                  <option value="quente">Quente</option>
                  <option value="morno">Morno</option>
                  <option value="frio">Frio</option>
                  <option value="urgente">Urgente</option>
                </select>
              </Field>

              <Field label="Sentimento do cliente">
                <select
                  value={draft.sentiment}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, sentiment: event.target.value as LeadCard["sentiment"] }))
                  }
                  className="kanban-input"
                >
                  <option value="positivo">Positivo</option>
                  <option value="neutro">Neutro</option>
                  <option value="duvida">Duvida</option>
                  <option value="negativo">Negativo</option>
                </select>
              </Field>

              <Field label="Responsavel">
                <input
                  value={draft.responsible}
                  onChange={(event) => setDraft((current) => ({ ...current, responsible: event.target.value }))}
                  className="kanban-input"
                  placeholder="Responsavel"
                />
              </Field>

              <Field label="Ultima mensagem" wide>
                <textarea
                  value={draft.lastMessage}
                  onChange={(event) => setDraft((current) => ({ ...current, lastMessage: event.target.value }))}
                  className="kanban-input min-h-20 resize-none"
                  placeholder="Resumo da ultima conversa"
                />
              </Field>

              <Field label="Observacao" wide>
                <textarea
                  value={draft.notes}
                  onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                  className="kanban-input min-h-24 resize-none"
                  placeholder="Informacoes importantes para o atendimento"
                />
              </Field>
            </div>

            <div className="flex flex-col gap-2 border-t border-border p-5 sm:flex-row sm:items-center">
              {!isCreating && activeLead ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => archiveLead(activeLead.id)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    <Archive className="size-4" />
                    Arquivar
                  </button>
                  <button
                    onClick={() => deleteLead(activeLead.id)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-500/30 px-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
                  >
                    <Trash2 className="size-4" />
                    Excluir
                  </button>
                </div>
              ) : null}

              <div className="flex gap-2 sm:ml-auto">
                <button
                  onClick={closeModal}
                  className="h-10 rounded-lg border border-border px-4 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveLead}
                  className="h-10 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-glow transition hover:-translate-y-0.5"
                >
                  Salvar lead
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={cn("space-y-2", wide && "sm:col-span-2")}>
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function WhatsAppLogoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className="size-3.5 shrink-0"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#25D366"
        d="M16 3.25c-6.94 0-12.58 5.54-12.58 12.36 0 2.2.6 4.34 1.72 6.2L3.5 28.75l7.13-1.6A12.8 12.8 0 0 0 16 28c6.94 0 12.58-5.54 12.58-12.36S22.94 3.25 16 3.25Z"
      />
      <path
        fill="#fff"
        d="M22.9 19.12c-.1-.17-.37-.27-.77-.47-.4-.2-2.37-1.15-2.74-1.28-.37-.14-.64-.2-.9.2-.27.4-1.04 1.28-1.28 1.55-.23.27-.47.3-.87.1-.4-.2-1.7-.61-3.24-1.94-1.2-1.04-2-2.32-2.24-2.72-.23-.4-.02-.61.18-.81.18-.18.4-.47.6-.7.2-.24.27-.4.4-.67.14-.27.07-.5-.03-.7-.1-.2-.9-2.14-1.24-2.94-.33-.77-.66-.67-.9-.68h-.77c-.27 0-.7.1-1.07.5-.37.4-1.4 1.35-1.4 3.29 0 1.94 1.44 3.82 1.64 4.09.2.27 2.84 4.27 6.88 5.98.96.41 1.72.66 2.3.84.97.3 1.85.26 2.55.16.78-.11 2.37-.95 2.7-1.87.34-.92.34-1.72.24-1.88Z"
      />
    </svg>
  );
}

function KanbanColumnSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_16px_38px_rgba(0,0,0,0.16)]"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 animate-pulse rounded-2xl bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-3/4 animate-pulse rounded-full bg-white/10" />
              <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-white/[0.08]" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-2.5 w-full animate-pulse rounded-full bg-white/[0.08]" />
            <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-white/[0.08]" />
          </div>
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-16 animate-pulse rounded-full bg-white/[0.08]" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-white/[0.08]" />
          </div>
        </div>
      ))}
    </>
  );
}
