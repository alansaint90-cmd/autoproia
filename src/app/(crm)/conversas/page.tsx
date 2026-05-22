"use client";

import { useEffect, useState } from "react";
import { Bot, Pencil, Paperclip, Pause, Phone, Plus, Search, Send, Smile, Sparkles, Trash2, UserCheck, Zap } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { conversations } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type QuickReply = {
  id: string;
  name: string;
  message: string;
};

const quickReplyStorageKey = "auto-pro-ia:quick-replies";

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

export default function ConversasPage() {
  const [activeId, setActiveId] = useState(conversations[0].lead.id);
  const [iaPaused, setIaPaused] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>(defaultQuickReplies);
  const [manageReplies, setManageReplies] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [replyName, setReplyName] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const active = conversations.find((conversation) => conversation.lead.id === activeId) ?? conversations[0];
  const editingReply = quickReplies.find((reply) => reply.id === editingReplyId);

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

  function startNewReply() {
    setEditingReplyId(null);
    setReplyName("");
    setReplyMessage("");
    setManageReplies(true);
  }

  function startEditReply(reply: QuickReply) {
    setEditingReplyId(reply.id);
    setReplyName(reply.name);
    setReplyMessage(reply.message);
    setManageReplies(true);
  }

  function saveQuickReply() {
    const trimmedName = replyName.trim();
    const trimmedMessage = replyMessage.trim();
    if (!trimmedName || !trimmedMessage) return;

    if (editingReplyId) {
      setQuickReplies((items) =>
        items.map((item) =>
          item.id === editingReplyId ? { ...item, name: trimmedName, message: trimmedMessage } : item
        )
      );
    } else {
      setQuickReplies((items) => [
        ...items,
        {
          id: crypto.randomUUID(),
          name: trimmedName,
          message: trimmedMessage
        }
      ]);
    }

    setEditingReplyId(null);
    setReplyName("");
    setReplyMessage("");
  }

  function deleteQuickReply(replyId: string) {
    setQuickReplies((items) => items.filter((item) => item.id !== replyId));
    if (editingReplyId === replyId) {
      setEditingReplyId(null);
      setReplyName("");
      setReplyMessage("");
    }
  }

  function sendDraftMessage() {
    setDraftMessage("");
  }

  return (
    <>
      <Topbar title="Central de Atendimento" subtitle="WhatsApp + IA com intervencao humana sem perda de contexto" />
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_280px]">
        <aside className="flex min-h-0 flex-col border-r border-border bg-card/30">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Buscar conversa..."
                className="h-9 w-full rounded-lg border border-border bg-input/40 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {conversations.map((conversation) => {
              const selected = conversation.lead.id === activeId;

              return (
                <button
                  key={conversation.lead.id}
                  onClick={() => setActiveId(conversation.lead.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border/50 p-3 text-left transition hover:bg-accent/40",
                    selected && "bg-accent/60"
                  )}
                >
                  <div className="relative shrink-0">
                    <img src={conversation.lead.avatar} alt="" className="size-10 rounded-full" />
                    {conversation.online ? (
                      <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-success ring-2 ring-card" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{conversation.lead.name}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{conversation.lead.lastInteraction}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <p className="flex-1 truncate text-xs text-muted-foreground">{conversation.preview}</p>
                      {conversation.unread > 0 ? (
                        <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          {conversation.unread}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-background">
          <div className="flex h-16 items-center gap-3 border-b border-border px-4">
            <img src={active.lead.avatar} alt="" className="size-10 rounded-full" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{active.lead.name}</span>
                {active.online ? <span className="text-[10px] font-semibold text-success">online</span> : null}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="size-3" />
                {active.lead.phone}
              </div>
            </div>
            {!iaPaused ? (
              <span className="hidden items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary sm:inline-flex">
                <Sparkles className="size-3" />
                IA conduzindo
              </span>
            ) : null}
            <button
              onClick={() => setIaPaused((paused) => !paused)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-accent"
            >
              <Pause className="size-3.5" />
              {iaPaused ? "Devolver para IA" : "Pausar IA"}
            </button>
            <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground">
              <UserCheck className="size-3.5" />
              Assumir
            </button>
          </div>

          <div className="grid-bg flex-1 space-y-3 overflow-y-auto p-6 scrollbar-thin">
            {active.messages.map((message) => {
              const isCompany = message.from !== "lead";

              return (
                <div key={message.id} className={cn("flex", isCompany ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-lg border px-4 py-2.5 text-sm shadow-panel",
                      message.from === "ia" && "border-primary/30 bg-primary/15",
                      message.from === "human" && "border-success/30 bg-success/15",
                      message.from === "lead" && "border-border bg-card"
                    )}
                  >
                    {message.from === "ia" ? (
                      <div className="mb-1 inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                        <Bot className="size-3" />
                        IA
                      </div>
                    ) : null}
                    {message.from === "human" ? <div className="mb-1 text-[10px] font-bold text-success">Atendente</div> : null}
                    <p>{message.text}</p>
                    <div className="mt-1 text-right text-[10px] text-muted-foreground">{message.time}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border p-3">
            <div className="mb-2 flex items-center gap-2 overflow-x-auto scrollbar-thin">
              {quickReplies.map((quickReply) => (
                <div key={quickReply.id} className="flex shrink-0 items-center gap-1 rounded-full border border-border">
                  <button
                    onClick={() => setDraftMessage(quickReply.message)}
                    className="px-2.5 py-1 text-xs hover:text-primary"
                    title={quickReply.message}
                  >
                    {quickReply.name}
                  </button>
                  {manageReplies ? (
                    <div className="flex items-center border-l border-border pr-1">
                      <button
                        onClick={() => startEditReply(quickReply)}
                        className="grid size-6 place-items-center text-muted-foreground hover:text-primary"
                        title="Editar resposta rapida"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        onClick={() => deleteQuickReply(quickReply.id)}
                        className="grid size-6 place-items-center text-muted-foreground hover:text-danger"
                        title="Excluir resposta rapida"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
              <button
                onClick={() => setManageReplies((value) => !value)}
                className={cn(
                  "shrink-0 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-accent",
                  manageReplies && "border-primary/50 bg-primary/10 text-primary"
                )}
              >
                Gerenciar
              </button>
              <button
                onClick={startNewReply}
                className="grid size-7 shrink-0 place-items-center rounded-full border border-border text-primary hover:bg-accent"
                title="Nova resposta rapida"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            {manageReplies ? (
              <div className="mb-3 rounded-lg border border-border bg-card/70 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {editingReply ? "Editar resposta rapida" : "Cadastrar resposta rapida"}
                  </p>
                  <button
                    onClick={() => {
                      setEditingReplyId(null);
                      setReplyName("");
                      setReplyMessage("");
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Limpar
                  </button>
                </div>
                <div className="grid gap-2 md:grid-cols-[190px_1fr_auto]">
                  <input
                    value={replyName}
                    onChange={(event) => setReplyName(event.target.value)}
                    placeholder="Nome do botao"
                    className="h-9 rounded-lg border border-border bg-input/40 px-3 text-xs outline-none focus:ring-2 focus:ring-ring/50"
                  />
                  <input
                    value={replyMessage}
                    onChange={(event) => setReplyMessage(event.target.value)}
                    placeholder="Texto completo da mensagem"
                    className="h-9 rounded-lg border border-border bg-input/40 px-3 text-xs outline-none focus:ring-2 focus:ring-ring/50"
                  />
                  <button
                    onClick={saveQuickReply}
                    className="h-9 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : null}
            <div className="flex h-12 items-center gap-2 rounded-lg border border-border bg-input/40 px-3 focus-within:ring-2 focus-within:ring-ring/50">
              <button className="text-muted-foreground hover:text-foreground">
                <Paperclip className="size-4" />
              </button>
              <input
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button className="text-muted-foreground hover:text-foreground">
                <Smile className="size-4" />
              </button>
              <button
                onClick={sendDraftMessage}
                className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </section>

        <aside className="hidden flex-col gap-4 overflow-y-auto border-l border-border bg-card/30 p-5 scrollbar-thin xl:flex">
          <div className="flex flex-col items-center border-b border-border pb-4 text-center">
            <img src={active.lead.avatar} alt="" className="mb-3 size-16 rounded-lg" />
            <div className="font-bold">{active.lead.name}</div>
            <div className="text-xs text-muted-foreground">{active.lead.phone}</div>
          </div>
          <Info label="Origem" value={active.lead.origin} />
          <Info label="Etapa" value={active.lead.stage} />
          <Info label="Interesse" value={`CNH ${active.lead.interest}`} />
          <Info label="Responsavel" value={active.lead.responsible} />
          <Info label="Temperatura" value={active.lead.temperature} />
          <button className="mt-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-accent text-xs font-semibold">
            <Zap className="size-3.5 text-primary" />
            Ver perfil completo
          </button>
        </aside>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium capitalize">{value}</div>
    </div>
  );
}
