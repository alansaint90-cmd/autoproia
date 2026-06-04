"use client";

import { useMemo, useState } from "react";
import type { ElementType } from "react";
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  FileText,
  Search,
  Settings,
  ShieldCheck,
  UserPen,
  XCircle
} from "lucide-react";
import { Topbar } from "@/components/topbar";
import { cn } from "@/lib/utils";

const auditFilters = ["Todas", "Capturado", "Aprovado", "Rejeitado", "Publicado", "Config", "Novo Usuario", "Usuario Editado"];

const auditRows = [
  { action: "Capturado", user: "Sistema", entity: "Lead WhatsApp - CNH B - Lucas Ferreira", date: "04/06/26, 00:42", status: "captured" },
  { action: "Config", user: "Superadmin", entity: "Prompt comercial atualizado", date: "04/06/26, 00:38", status: "config" },
  { action: "Aprovado", user: "Carla Vendas", entity: "Matricula pendente - Ana Beatriz", date: "03/06/26, 22:16", status: "approved" },
  { action: "Usuario Editado", user: "Superadmin", entity: "Permissoes do papel Atendente", date: "03/06/26, 21:55", status: "user" },
  { action: "Novo Usuario", user: "Superadmin", entity: "Beatriz SDR adicionada ao time", date: "03/06/26, 20:21", status: "user" },
  { action: "Publicado", user: "Sistema", entity: "Resposta da IA enviada via Evolution", date: "03/06/26, 19:44", status: "published" },
  { action: "Rejeitado", user: "Ricardo IA", entity: "Resposta bloqueada por handoff humano", date: "03/06/26, 18:03", status: "rejected" },
  { action: "Capturado", user: "Sistema", entity: "Lead Meta Ads - Categoria AB", date: "03/06/26, 17:26", status: "captured" },
  { action: "Config", user: "Superadmin", entity: "Chave Evolution validada", date: "03/06/26, 16:40", status: "config" },
  { action: "Aprovado", user: "Marcos Closer", entity: "Proposta enviada - Pedro Henrique", date: "03/06/26, 15:19", status: "approved" },
  { action: "Capturado", user: "Sistema", entity: "Conversa recebida no webhook", date: "03/06/26, 14:52", status: "captured" }
];

const statusStyle: Record<string, { icon: ElementType; className: string }> = {
  captured: { icon: Bot, className: "border-sky-300/20 bg-sky-300/10 text-sky-100" },
  config: { icon: Settings, className: "border-primary/25 bg-primary/10 text-primary" },
  approved: { icon: CheckCircle2, className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" },
  rejected: { icon: XCircle, className: "border-red-400/20 bg-red-400/10 text-red-200" },
  published: { icon: FileText, className: "border-violet-300/20 bg-violet-300/10 text-violet-100" },
  user: { icon: UserPen, className: "border-slate-300/20 bg-slate-300/10 text-slate-100" }
};

export default function AnalisePage() {
  const [activeFilter, setActiveFilter] = useState("Todas");
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return auditRows.filter((row) => {
      const matchesFilter = activeFilter === "Todas" || row.action === activeFilter;
      const matchesQuery =
        !term ||
        row.action.toLowerCase().includes(term) ||
        row.user.toLowerCase().includes(term) ||
        row.entity.toLowerCase().includes(term) ||
        row.date.toLowerCase().includes(term);

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, query]);

  return (
    <>
      <Topbar title="Analise" subtitle="Detalhes e auditoria das acoes do sistema" />

      <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_72%_0%,rgba(250,204,21,0.06),transparent_30%),linear-gradient(180deg,#080d16,#0b1120)] p-6 text-foreground">
        <section className="rounded-[28px] border border-white/[0.08] bg-card/70 p-5 shadow-panel backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/[0.07] pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">
                <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                Online
              </p>
              <h1 className="mt-3 text-2xl font-black tracking-normal">Analise operacional</h1>
              <p className="mt-1 text-sm text-muted-foreground">Auditoria viva de capturas, configuracoes e atividades comerciais.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-primary" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar nos detalhes..."
                  className="h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.045] pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10 sm:w-80"
                />
              </div>
              <span className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#0B5FA5]/30 bg-[#0B5FA5]/12 px-4 text-sm font-black text-sky-100">
                <ShieldCheck size={16} />
                Ativo
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {auditFilters.map((filter) => {
              const active = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    "h-9 rounded-full border px-4 text-xs font-black transition",
                    active
                      ? "border-primary/60 bg-primary text-primary-foreground shadow-glow"
                      : "border-white/[0.10] bg-white/[0.035] text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  {filter}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between text-sm">
            <p className="font-mono text-muted-foreground">{filteredRows.length} registro(s)</p>
            <p className="text-xs font-bold text-muted-foreground">Atualizado agora</p>
          </div>

          <div className="mt-4 overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#080d16]/72">
            <div className="grid grid-cols-[170px_150px_1fr_160px_40px] border-b border-white/[0.07] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              <span>Acao</span>
              <span>Usuario</span>
              <span>Entidade</span>
              <span>Data</span>
              <span />
            </div>
            <div className="max-h-[620px] overflow-y-auto [scrollbar-color:rgba(250,204,21,0.35)_transparent] [scrollbar-width:thin]">
              {filteredRows.map((row) => {
                const StatusIcon = statusStyle[row.status].icon;

                return (
                  <button
                    key={`${row.entity}-${row.date}`}
                    type="button"
                    className="group grid w-full grid-cols-[170px_150px_1fr_160px_40px] items-center border-b border-white/[0.05] px-4 py-4 text-left transition last:border-b-0 hover:bg-white/[0.035]"
                  >
                    <span className={cn("inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-black", statusStyle[row.status].className)}>
                      <StatusIcon size={13} />
                      {row.action}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">{row.user}</span>
                    <span className="truncate text-sm font-black text-foreground">{row.entity}</span>
                    <span className="font-mono text-xs font-semibold text-muted-foreground">{row.date}</span>
                    <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
