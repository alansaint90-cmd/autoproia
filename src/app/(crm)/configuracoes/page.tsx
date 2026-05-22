"use client";

import { Building2, Plus, Plug, Settings, ShieldCheck, Users } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { cn } from "@/lib/utils";
import { useState } from "react";

type TabId = "empresa" | "usuarios" | "permissoes" | "integracoes" | "preferencias";

const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { id: "empresa", label: "Empresa", icon: Building2 },
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "permissoes", label: "Permissoes", icon: ShieldCheck },
  { id: "integracoes", label: "Integracoes", icon: Plug },
  { id: "preferencias", label: "Preferencias", icon: Settings }
];

const fields = [
  { label: "Nome", value: "AutoEscola Pro" },
  { label: "CNPJ", value: "00.000.000/0001-00" },
  { label: "Email comercial", value: "contato@autoescolapro.com.br" },
  { label: "Telefone", value: "+55 11 99999-0000" },
  { label: "Endereco", value: "Av. Paulista, 1000" },
  { label: "Cidade", value: "Sao Paulo, SP" }
];

const users = [
  { initials: "CV", name: "Carla Vendas", email: "carla@autopro.ia", role: "Closer", status: "Ativo" },
  { initials: "MC", name: "Marcos Closer", email: "marcos@autopro.ia", role: "Closer", status: "Ativo" },
  { initials: "JO", name: "Julio Operador", email: "julio@autopro.ia", role: "SDR", status: "Inativo" },
  { initials: "RI", name: "Ricardo IA", email: "ia@autopro.ia", role: "Bot", status: "Ativo" }
];

const permissions = [
  { label: "Visualizar leads", admin: true, closer: true, sdr: false, suporte: false },
  { label: "Editar leads", admin: true, closer: true, sdr: false, suporte: false },
  { label: "Excluir leads", admin: true, closer: true, sdr: false, suporte: false },
  { label: "Acessar relatorios", admin: true, closer: true, sdr: false, suporte: false },
  { label: "Gerenciar IA", admin: true, closer: false, sdr: false, suporte: false },
  { label: "Administrar usuarios", admin: true, closer: false, sdr: false, suporte: false }
];

const preferences = [
  {
    title: "Notificacoes por som",
    description: "Tocar som ao receber novo lead.",
    enabled: false
  },
  {
    title: "Atribuicao automatica",
    description: "Distribuir leads novos por round-robin.",
    enabled: false
  },
  {
    title: "Modo escuro",
    description: "Use o tema escuro automaticamente.",
    enabled: true
  },
  {
    title: "Resumo diario por email",
    description: "Receba KPIs todo dia as 8h.",
    enabled: false
  }
];

const aiMessages = [
  { label: "Saudacao inicial", value: "Ola! 👋 Sou a Ana, da AutoEscola Pro. Como posso te ajudar?" },
  { label: "Fora do horario", value: "Estamos fora de horario, retornaremos amanha as 8h." },
  { label: "Encerramento", value: "Obrigada pelo contato! Ate logo. 🚗" }
];

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("empresa");

  return (
    <>
      <Topbar title="Configuracoes" subtitle="Personalize sua operacao e integracoes" />

      <main className="flex-1 overflow-y-auto bg-background p-6 text-foreground">
        <div className="grid gap-6 xl:grid-cols-[220px_1fr]">
          <aside className="space-y-2">
            {tabs.map((tab) => {
              const active = tab.id === activeTab;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex h-12 w-full items-center gap-3 rounded-[18px] px-4 text-left text-sm transition",
                    active
                      ? "border border-primary/55 bg-primary/15 font-semibold text-foreground"
                      : "font-medium text-muted-foreground hover:bg-card hover:text-foreground"
                  )}
                >
                  <tab.icon className={active ? "text-primary" : "text-muted-foreground"} size={18} />
                  {tab.label}
                </button>
              );
            })}
          </aside>

          {activeTab === "empresa" ? <EmpresaPanel /> : null}
          {activeTab === "usuarios" ? <UsuariosPanel /> : null}
          {activeTab === "permissoes" ? <PermissoesPanel /> : null}
          {activeTab === "integracoes" ? (
            <EmptyPanel title="Integracoes" description="Configure Evolution API, OpenAI, Redis, PostgreSQL e Supabase." />
          ) : null}
          {activeTab === "preferencias" ? <PreferenciasPanel /> : null}
        </div>
      </main>
    </>
  );
}

function EmpresaPanel() {
  return (
    <section className="rounded-[22px] border border-border bg-card/72 p-6 shadow-panel">
      <h2 className="text-lg font-extrabold tracking-normal">Perfil da empresa</h2>

      <form className="mt-6 space-y-6">
        <div className="grid gap-x-5 gap-y-6 xl:grid-cols-2">
          {fields.map((field) => (
            <label key={field.label} className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {field.label}
              </span>
              <input
                defaultValue={field.value}
                className="h-10 w-full rounded-[14px] border border-border bg-input/65 px-4 text-sm font-semibold text-foreground outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
              />
            </label>
          ))}
        </div>

        <button className="inline-flex h-10 items-center justify-center rounded-[14px] bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-glow">
          Salvar alteracoes
        </button>
      </form>
    </section>
  );
}

function UsuariosPanel() {
  return (
    <section className="rounded-[22px] border border-border bg-card/72 p-6 shadow-panel">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-lg font-extrabold tracking-normal">Usuarios</h2>
        <button className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-glow">
          <Plus size={16} />
          Adicionar
        </button>
      </div>

      <div className="divide-y divide-border">
        {users.map((user) => (
          <div key={user.email} className="grid items-center gap-4 py-4 md:grid-cols-[1fr_auto_auto]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-mono text-sm font-extrabold text-primary-foreground">
                {user.initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <span className="w-fit rounded-md bg-sidebar-accent px-2.5 py-1 text-xs font-semibold text-foreground">
              {user.role}
            </span>
            <span className={cn("text-sm font-semibold", user.status === "Ativo" ? "text-success" : "text-muted-foreground")}>
              {user.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PermissoesPanel() {
  const roles = [
    { id: "admin", label: "Admin" },
    { id: "closer", label: "Closer" },
    { id: "sdr", label: "SDR" },
    { id: "suporte", label: "Suporte" }
  ] as const;

  return (
    <section className="rounded-[22px] border border-border bg-card/72 p-6 shadow-panel">
      <h2 className="text-lg font-extrabold tracking-normal">Matriz de permissoes</h2>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Permissao
              </th>
              {roles.map((role) => (
                <th
                  key={role.id}
                  className="pb-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {role.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((permission) => (
              <tr key={permission.label} className="border-b border-border last:border-b-0">
                <td className="py-4 font-extrabold">{permission.label}</td>
                {roles.map((role) => (
                  <td key={role.id} className="py-4 text-center">
                    <input
                      type="checkbox"
                      defaultChecked={permission[role.id]}
                      aria-label={`${permission.label} - ${role.label}`}
                      className="size-4 rounded border-border accent-primary"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PreferenciasPanel() {
  return (
    <div className="space-y-6">
      <section className="rounded-[22px] border border-border bg-card/72 p-6 shadow-panel">
        <h2 className="text-lg font-extrabold tracking-normal">Preferencias do CRM</h2>

        <div className="mt-6 divide-y divide-border">
          {preferences.map((preference) => (
            <div key={preference.title} className="flex items-center justify-between gap-6 py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-extrabold">{preference.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{preference.description}</p>
              </div>
              <button
                type="button"
                aria-pressed={preference.enabled}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition",
                  preference.enabled ? "bg-primary" : "bg-input"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 size-4 rounded-full bg-background transition",
                    preference.enabled ? "left-6" : "left-1"
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[22px] border border-border bg-card/72 p-6 shadow-panel">
        <h2 className="text-lg font-extrabold tracking-normal">Mensagens automaticas da IA</h2>

        <form className="mt-6 space-y-5">
          {aiMessages.map((message) => (
            <label key={message.label} className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {message.label}
              </span>
              <input
                defaultValue={message.value}
                className="h-10 w-full rounded-[14px] border border-border bg-input/65 px-4 text-sm font-semibold text-foreground outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
              />
            </label>
          ))}

          <button className="inline-flex h-10 items-center justify-center rounded-[14px] bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-glow">
            Salvar mensagens
          </button>
        </form>
      </section>
    </div>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-[22px] border border-border bg-card/72 p-6 shadow-panel">
      <h2 className="text-lg font-extrabold tracking-normal">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
    </section>
  );
}
