"use client";

import {
  AlertCircle,
  Bot,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  DollarSign,
  Eye,
  EyeOff,
  HardDrive,
  ImagePlus,
  KeyRound,
  Plus,
  Plug,
  Server,
  Settings,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users
} from "lucide-react";
import { Topbar } from "@/components/topbar";
import { defaultAiBusinessSettings, type AiBusinessSettings } from "@/lib/ai-business-settings";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type TabId = "empresa" | "usuarios" | "permissoes" | "integracoes" | "ia" | "preferencias";

const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { id: "empresa", label: "Empresa", icon: Building2 },
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "permissoes", label: "Permissoes", icon: ShieldCheck },
  { id: "integracoes", label: "Integracoes", icon: Plug },
  { id: "ia", label: "IA Comercial", icon: Bot },
  { id: "preferencias", label: "Preferencias", icon: Settings }
];

type CompanyProfile = {
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  logo?: string;
};

const COMPANY_PROFILE_STORAGE_KEY = "auto-pro-ia:company-profile";
const INTEGRATIONS_STORAGE_KEY = "auto-pro-ia:integrations";

const defaultCompanyProfile: CompanyProfile = {
  name: "AutoEscola Pro",
  cnpj: "00.000.000/0001-00",
  email: "contato@autoescolapro.com.br",
  phone: "+55 11 99999-0000",
  address: "Av. Paulista, 1000",
  city: "Sao Paulo, SP"
};

const fields: Array<{ key: keyof Omit<CompanyProfile, "logo">; label: string }> = [
  { key: "name", label: "Nome" },
  { key: "cnpj", label: "CNPJ" },
  { key: "email", label: "Email comercial" },
  { key: "phone", label: "Telefone" },
  { key: "address", label: "Endereco" },
  { key: "city", label: "Cidade" }
];

type RoleId = "admin" | "gerente" | "closer" | "sdr" | "financeiro" | "bot";

type UserRecord = {
  initials: string;
  name: string;
  email: string;
  phone: string;
  role: RoleId;
  position: string;
  scope: "Todos os leads" | "Somente atribuídos" | "Financeiro" | "Sistema";
  status: "Ativo" | "Inativo";
};

type PermissionKey =
  | "viewLeads"
  | "createLeads"
  | "editLeads"
  | "deleteLeads"
  | "assignLeads"
  | "moveKanban"
  | "viewConversations"
  | "replyConversations"
  | "assumeAi"
  | "returnToAi"
  | "viewOwnReports"
  | "viewTeamReports"
  | "exportPdf"
  | "manageAi"
  | "manageUsers"
  | "manageIntegrations"
  | "viewFinance";

type PermissionRecord = {
  key: PermissionKey;
  module: string;
  label: string;
  description: string;
} & Record<RoleId, boolean>;

const roles: Array<{
  id: RoleId;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: "admin", label: "Admin", description: "Controle total da autoescola.", icon: ShieldCheck },
  { id: "gerente", label: "Gerente Comercial", description: "Coordena funil, equipe e relatorios.", icon: BriefcaseBusiness },
  { id: "closer", label: "Closer", description: "Fecha matriculas e assume conversas.", icon: UserCheck },
  { id: "sdr", label: "SDR", description: "Qualifica leads e agenda proximos passos.", icon: Users },
  { id: "financeiro", label: "Financeiro", description: "Acompanha vendas, pagamentos e receita.", icon: DollarSign },
  { id: "bot", label: "Bot/IA", description: "Usuario tecnico para automacoes.", icon: Bot }
];

const defaultUsers: UserRecord[] = [
  { initials: "AD", name: "Administrador", email: "admin@autopro.ia", phone: "+55 75 99999-0001", role: "admin", position: "Dono / gestor", scope: "Todos os leads", status: "Ativo" },
  { initials: "CV", name: "Carla Vendas", email: "carla@autopro.ia", phone: "+55 75 99999-0002", role: "gerente", position: "Gerente comercial", scope: "Todos os leads", status: "Ativo" },
  { initials: "MC", name: "Marcos Closer", email: "marcos@autopro.ia", phone: "+55 75 99999-0003", role: "closer", position: "Closer", scope: "Somente atribuídos", status: "Ativo" },
  { initials: "JO", name: "Julio Operador", email: "julio@autopro.ia", phone: "+55 75 99999-0004", role: "sdr", position: "Pre-atendimento", scope: "Somente atribuídos", status: "Inativo" },
  { initials: "FN", name: "Fernanda Financeiro", email: "financeiro@autopro.ia", phone: "+55 75 99999-0005", role: "financeiro", position: "Financeiro", scope: "Financeiro", status: "Ativo" },
  { initials: "IA", name: "Ricardo IA", email: "ia@autopro.ia", phone: "Sistema", role: "bot", position: "Automacao", scope: "Sistema", status: "Ativo" }
];

const defaultPermissions: PermissionRecord[] = [
  { key: "viewLeads", module: "Leads", label: "Ver leads", description: "Acessar lista, Kanban e perfil do lead.", admin: true, gerente: true, closer: true, sdr: true, financeiro: false, bot: true },
  { key: "createLeads", module: "Leads", label: "Criar leads", description: "Cadastrar lead manualmente.", admin: true, gerente: true, closer: true, sdr: true, financeiro: false, bot: true },
  { key: "editLeads", module: "Leads", label: "Editar leads", description: "Alterar dados, temperatura e observacoes.", admin: true, gerente: true, closer: true, sdr: true, financeiro: false, bot: true },
  { key: "deleteLeads", module: "Leads", label: "Excluir leads", description: "Remover leads da base.", admin: true, gerente: true, closer: false, sdr: false, financeiro: false, bot: false },
  { key: "assignLeads", module: "Leads", label: "Atribuir responsavel", description: "Distribuir leads para vendedores.", admin: true, gerente: true, closer: false, sdr: false, financeiro: false, bot: true },
  { key: "moveKanban", module: "Kanban", label: "Mover Kanban", description: "Mover cards entre etapas do funil.", admin: true, gerente: true, closer: true, sdr: true, financeiro: false, bot: true },
  { key: "viewConversations", module: "Conversas", label: "Ver conversas", description: "Visualizar historico do WhatsApp.", admin: true, gerente: true, closer: true, sdr: true, financeiro: false, bot: true },
  { key: "replyConversations", module: "Conversas", label: "Responder conversas", description: "Enviar mensagens manuais.", admin: true, gerente: true, closer: true, sdr: true, financeiro: false, bot: false },
  { key: "assumeAi", module: "Conversas", label: "Assumir da IA", description: "Pausar IA e assumir atendimento humano.", admin: true, gerente: true, closer: true, sdr: true, financeiro: false, bot: false },
  { key: "returnToAi", module: "Conversas", label: "Devolver para IA", description: "Reativar fluxo automatico.", admin: true, gerente: true, closer: true, sdr: true, financeiro: false, bot: false },
  { key: "viewOwnReports", module: "Relatorios", label: "Ver relatorio proprio", description: "Acompanhar propria performance.", admin: true, gerente: true, closer: true, sdr: true, financeiro: true, bot: false },
  { key: "viewTeamReports", module: "Relatorios", label: "Ver relatorio da equipe", description: "Acessar ranking e funil geral.", admin: true, gerente: true, closer: false, sdr: false, financeiro: true, bot: false },
  { key: "exportPdf", module: "Relatorios", label: "Exportar PDF", description: "Gerar PDF dos relatorios.", admin: true, gerente: true, closer: false, sdr: false, financeiro: true, bot: false },
  { key: "viewFinance", module: "Financeiro", label: "Ver receita e vendas", description: "Visualizar valores, ticket e receita.", admin: true, gerente: true, closer: false, sdr: false, financeiro: true, bot: false },
  { key: "manageAi", module: "IA", label: "Gerenciar IA", description: "Editar regras, prompts e automacoes.", admin: true, gerente: true, closer: false, sdr: false, financeiro: false, bot: false },
  { key: "manageUsers", module: "Administracao", label: "Gerenciar usuarios", description: "Criar, editar e inativar usuarios.", admin: true, gerente: false, closer: false, sdr: false, financeiro: false, bot: false },
  { key: "manageIntegrations", module: "Administracao", label: "Alterar integracoes", description: "Configurar APIs e credenciais.", admin: true, gerente: false, closer: false, sdr: false, financeiro: false, bot: false }
];

const defaultPreferences = [
  { key: "sellerScope", title: "Vendedor ve somente leads atribuidos", description: "Closer e SDR ficam restritos aos proprios leads.", enabled: true },
  { key: "managerAllLeads", title: "Gerente ve toda a operacao", description: "Permite visao completa do funil e conversas.", enabled: true },
  { key: "sdrDeleteBlocked", title: "SDR nao pode excluir lead", description: "Evita perda acidental de oportunidades.", enabled: true },
  { key: "soundNotifications", title: "Notificacoes por som", description: "Tocar som ao receber novo lead.", enabled: false },
  { key: "roundRobin", title: "Atribuicao automatica", description: "Distribuir leads novos por round-robin.", enabled: true },
  { key: "aiAfterHours", title: "IA responde fora do horario", description: "Mantem atendimento automatico quando a equipe estiver offline.", enabled: true },
  { key: "humanCanAssume", title: "Atendente pode assumir conversas", description: "Permite pausar IA em conversas sensiveis.", enabled: true },
  { key: "exportRestricted", title: "Exportacao restrita a gestao", description: "Somente Admin, Gerente e Financeiro exportam relatorios.", enabled: true },
  { key: "dailySummary", title: "Resumo diario por email", description: "Receba KPIs todo dia as 8h.", enabled: false }
];

const aiMessages = [
  { label: "Saudacao inicial", value: "Ola! 👋 Sou a Ana, da AutoEscola Pro. Como posso te ajudar?" },
  { label: "Fora do horario", value: "Estamos fora de horario, retornaremos amanha as 8h." },
  { label: "Encerramento", value: "Obrigada pelo contato! Ate logo. 🚗" }
];

type IntegrationStatus = "pending" | "connected" | "error";

type IntegrationSettings = {
  openai: {
    apiKey: string;
    model: string;
    organization: string;
    status: IntegrationStatus;
  };
  evolution: {
    baseUrl: string;
    apiKey: string;
    instanceName: string;
    webhookSecret: string;
    status: IntegrationStatus;
  };
  minio: {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    region: string;
    useSSL: boolean;
    status: IntegrationStatus;
  };
};

const defaultIntegrations: IntegrationSettings = {
  openai: { apiKey: "", model: "gpt-4.1-mini", organization: "", status: "pending" },
  evolution: { baseUrl: "", apiKey: "", instanceName: "", webhookSecret: "", status: "pending" },
  minio: {
    endpoint: "",
    accessKey: "",
    secretKey: "",
    bucket: "autoproia-media",
    region: "us-east-1",
    useSSL: true,
    status: "pending"
  }
};

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
          {activeTab === "integracoes" ? <IntegracoesPanel /> : null}
          {activeTab === "ia" ? <IaComercialPanel /> : null}
          {activeTab === "preferencias" ? <PreferenciasPanel /> : null}
        </div>
      </main>
    </>
  );
}

function EmpresaPanel() {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(defaultCompanyProfile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COMPANY_PROFILE_STORAGE_KEY);
      if (stored) {
        setCompanyProfile({ ...defaultCompanyProfile, ...(JSON.parse(stored) as CompanyProfile) });
      }
    } catch {
      setCompanyProfile(defaultCompanyProfile);
    }
  }, []);

  function updateField(key: keyof Omit<CompanyProfile, "logo">, value: string) {
    setCompanyProfile((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function uploadLogo(file?: File) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCompanyProfile((current) => ({ ...current, logo: String(reader.result) }));
      setSaved(false);
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setCompanyProfile((current) => {
      const { logo, ...profileWithoutLogo } = current;
      return profileWithoutLogo;
    });
    setSaved(false);
  }

  function saveCompanyProfile() {
    window.localStorage.setItem(COMPANY_PROFILE_STORAGE_KEY, JSON.stringify(companyProfile));
    window.dispatchEvent(new Event("auto-pro-ia:company-profile-updated"));
    setSaved(true);
  }

  return (
    <section className="rounded-[22px] border border-border bg-card/72 p-6 shadow-panel">
      <h2 className="text-lg font-extrabold tracking-normal">Perfil da empresa</h2>

      <form
        className="mt-6 space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          saveCompanyProfile();
        }}
      >
        <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.035] p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-[22px] border border-white/10 bg-primary text-lg font-black text-primary-foreground shadow-glow">
              {companyProfile.logo ? (
                <img src={companyProfile.logo} alt="" className="h-full w-full object-cover" />
              ) : (
                companyProfile.name
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">Logo da empresa</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Envie a logo que deve aparecer no topo do sistema no lugar do avatar atual.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-primary px-4 text-sm font-extrabold text-primary-foreground shadow-glow transition hover:-translate-y-0.5">
                <ImagePlus size={16} />
                Fazer upload
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(event) => uploadLogo(event.target.files?.[0])}
                  className="sr-only"
                />
              </label>
              {companyProfile.logo ? (
                <button
                  type="button"
                  onClick={removeLogo}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] border border-red-500/30 px-4 text-sm font-bold text-red-300 transition hover:bg-red-500/10"
                >
                  <Trash2 size={16} />
                  Remover
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-x-5 gap-y-6 xl:grid-cols-2">
          {fields.map((field) => (
            <label key={field.label} className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {field.label}
              </span>
              <input
                value={companyProfile[field.key]}
                onChange={(event) => updateField(field.key, event.target.value)}
                className="h-10 w-full rounded-[14px] border border-border bg-input/65 px-4 text-sm font-semibold text-foreground outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
              />
            </label>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex h-10 items-center justify-center rounded-[14px] bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-glow">
            Salvar alteracoes
          </button>
          {saved ? <span className="text-sm font-semibold text-success">Perfil atualizado</span> : null}
        </div>
      </form>
    </section>
  );
}

function UsuariosPanel() {
  const [teamUsers, setTeamUsers] = useState(defaultUsers);

  function updateUser(email: string, key: keyof UserRecord, value: string) {
    setTeamUsers((current) =>
      current.map((user) => (user.email === email ? { ...user, [key]: value } : user))
    );
  }

  function addUser() {
    setTeamUsers((current) => [
      ...current,
      {
        initials: "NU",
        name: "Novo Usuario",
        email: `novo${current.length + 1}@autopro.ia`,
        phone: "+55 75 99999-0000",
        role: "sdr",
        position: "Novo colaborador",
        scope: "Somente atribuídos",
        status: "Ativo"
      }
    ]);
  }

  return (
    <section className="rounded-[22px] border border-border bg-card/72 p-6 shadow-panel">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold tracking-normal">Usuarios e papeis</h2>
          <p className="mt-1 text-sm text-muted-foreground">Defina quem acessa o CRM e qual papel cada pessoa possui.</p>
        </div>
        <button onClick={addUser} className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-glow">
          <Plus size={16} />
          Adicionar
        </button>
      </div>

      <div className="grid gap-3">
        {teamUsers.map((user) => {
          const role = roles.find((item) => item.id === user.role) ?? roles[0];
          const RoleIcon = role.icon;

          return (
          <div key={user.email} className="rounded-[20px] border border-white/[0.08] bg-white/[0.035] p-4">
            <div className="grid items-center gap-4 xl:grid-cols-[1.1fr_0.9fr_0.8fr_0.6fr]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary font-mono text-sm font-extrabold text-primary-foreground shadow-glow">
                {user.initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                <p className="truncate text-xs text-muted-foreground">{user.phone}</p>
              </div>
            </div>

            <label className="grid gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Papel</span>
              <div className="relative">
                <RoleIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
                <select
                  value={user.role}
                  onChange={(event) => updateUser(user.email, "role", event.target.value)}
                  className="h-10 w-full rounded-[14px] border border-border bg-input/65 pl-9 pr-3 text-sm font-bold outline-none focus:border-primary/60"
                >
                  {roles.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </div>
            </label>

            <label className="grid gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Escopo</span>
              <select
                value={user.scope}
                onChange={(event) => updateUser(user.email, "scope", event.target.value)}
                className="h-10 rounded-[14px] border border-border bg-input/65 px-3 text-sm font-bold outline-none focus:border-primary/60"
              >
                <option>Todos os leads</option>
                <option>Somente atribuídos</option>
                <option>Financeiro</option>
                <option>Sistema</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Status</span>
              <select
                value={user.status}
                onChange={(event) => updateUser(user.email, "status", event.target.value)}
                className={cn(
                  "h-10 rounded-[14px] border border-border bg-input/65 px-3 text-sm font-bold outline-none focus:border-primary/60",
                  user.status === "Ativo" ? "text-success" : "text-muted-foreground"
                )}
              >
                <option>Ativo</option>
                <option>Inativo</option>
              </select>
            </label>
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}

function PermissoesPanel() {
  const [permissionRows, setPermissionRows] = useState(defaultPermissions);

  function togglePermission(permissionKey: PermissionKey, roleId: RoleId) {
    setPermissionRows((current) =>
      current.map((permission) =>
        permission.key === permissionKey ? { ...permission, [roleId]: !permission[roleId] } : permission
      )
    );
  }

  return (
    <section className="rounded-[22px] border border-border bg-card/72 p-6 shadow-panel">
      <div className="mb-6">
        <h2 className="text-lg font-extrabold tracking-normal">Matriz RBAC de permissoes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Controle o que cada papel pode acessar em Leads, Conversas, Kanban, Relatorios, IA e Administracao.
        </p>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => (
          <div key={role.id} className="rounded-[18px] border border-white/[0.08] bg-white/[0.035] p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <role.icon size={17} />
              </div>
              <p className="font-extrabold">{role.label}</p>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">{role.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[1120px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Modulo
              </th>
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
            {permissionRows.map((permission) => (
              <tr key={permission.key} className="border-b border-border last:border-b-0">
                <td className="py-4">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-black text-muted-foreground">
                    {permission.module}
                  </span>
                </td>
                <td className="py-4">
                  <p className="font-extrabold">{permission.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{permission.description}</p>
                </td>
                {roles.map((role) => (
                  <td key={role.id} className="py-4 text-center">
                    <input
                      type="checkbox"
                      checked={permission[role.id]}
                      onChange={() => togglePermission(permission.key, role.id)}
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

function IntegracoesPanel() {
  const [settings, setSettings] = useState<IntegrationSettings>(defaultIntegrations);
  const [saved, setSaved] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(INTEGRATIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<IntegrationSettings>;
        setSettings({
          openai: { ...defaultIntegrations.openai, ...parsed.openai },
          evolution: { ...defaultIntegrations.evolution, ...parsed.evolution },
          minio: { ...defaultIntegrations.minio, ...parsed.minio }
        });
      }
    } catch {
      setSettings(defaultIntegrations);
    }
  }, []);

  function updateIntegration<T extends keyof IntegrationSettings, K extends keyof IntegrationSettings[T]>(
    service: T,
    key: K,
    value: IntegrationSettings[T][K]
  ) {
    setSettings((current) => ({
      ...current,
      [service]: {
        ...current[service],
        [key]: value,
        status: "pending"
      }
    }));
    setSaved(false);
  }

  function testIntegration(service: keyof IntegrationSettings) {
    const current = settings[service];
    const required = Object.entries(current)
      .filter(([key]) => !["status", "organization", "webhookSecret", "region", "useSSL"].includes(key))
      .every(([, value]) => Boolean(String(value).trim()));

    setSettings((items) => ({
      ...items,
      [service]: {
        ...items[service],
        status: required ? "connected" : "error"
      }
    }));
  }

  function saveIntegrations() {
    window.localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[22px] border border-border bg-card/72 p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-extrabold tracking-normal">Conexoes de API</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Configure as credenciais que o Auto Pro IA usara para IA, WhatsApp e armazenamento de midias.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSecrets((value) => !value)}
              className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-white/10 px-4 text-sm font-bold text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
            >
              {showSecrets ? <EyeOff size={16} /> : <Eye size={16} />}
              {showSecrets ? "Ocultar chaves" : "Mostrar chaves"}
            </button>
            <button
              type="button"
              onClick={saveIntegrations}
              className="inline-flex h-10 items-center justify-center rounded-[14px] bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-glow"
            >
              Salvar conexoes
            </button>
          </div>
        </div>
        {saved ? <p className="mt-3 text-sm font-semibold text-success">Conexoes salvas com sucesso.</p> : null}
      </div>

      <IntegrationCard
        title="OpenAI API"
        description="Usada para respostas automaticas, analise de intencao, sugestoes e resumo de conversas."
        icon={Bot}
        status={settings.openai.status}
        onTest={() => testIntegration("openai")}
      >
        <IntegrationInput
          label="API Key"
          value={settings.openai.apiKey}
          secret={!showSecrets}
          placeholder="sk-..."
          onChange={(value) => updateIntegration("openai", "apiKey", value)}
        />
        <IntegrationInput
          label="Modelo"
          value={settings.openai.model}
          placeholder="gpt-4.1-mini"
          onChange={(value) => updateIntegration("openai", "model", value)}
        />
        <IntegrationInput
          label="Organization ID"
          value={settings.openai.organization}
          placeholder="Opcional"
          onChange={(value) => updateIntegration("openai", "organization", value)}
        />
      </IntegrationCard>

      <IntegrationCard
        title="Evolution API"
        description="Conecta o WhatsApp para receber webhooks, enviar mensagens e controlar instancias."
        icon={Server}
        status={settings.evolution.status}
        onTest={() => testIntegration("evolution")}
      >
        <IntegrationInput
          label="URL base"
          value={settings.evolution.baseUrl}
          placeholder="https://evolution.seudominio.com"
          onChange={(value) => updateIntegration("evolution", "baseUrl", value)}
        />
        <IntegrationInput
          label="API Key"
          value={settings.evolution.apiKey}
          secret={!showSecrets}
          placeholder="Chave da Evolution API"
          onChange={(value) => updateIntegration("evolution", "apiKey", value)}
        />
        <IntegrationInput
          label="Nome da instancia"
          value={settings.evolution.instanceName}
          placeholder="auto-pro-ia"
          onChange={(value) => updateIntegration("evolution", "instanceName", value)}
        />
        <IntegrationInput
          label="Webhook secret"
          value={settings.evolution.webhookSecret}
          secret={!showSecrets}
          placeholder="Opcional"
          onChange={(value) => updateIntegration("evolution", "webhookSecret", value)}
        />
      </IntegrationCard>

      <IntegrationCard
        title="MinIO"
        description="Armazena audios, imagens, videos e anexos das respostas rapidas e conversas."
        icon={HardDrive}
        status={settings.minio.status}
        onTest={() => testIntegration("minio")}
      >
        <IntegrationInput
          label="Endpoint"
          value={settings.minio.endpoint}
          placeholder="https://minio.seudominio.com"
          onChange={(value) => updateIntegration("minio", "endpoint", value)}
        />
        <IntegrationInput
          label="Access key"
          value={settings.minio.accessKey}
          secret={!showSecrets}
          placeholder="MINIO_ACCESS_KEY"
          onChange={(value) => updateIntegration("minio", "accessKey", value)}
        />
        <IntegrationInput
          label="Secret key"
          value={settings.minio.secretKey}
          secret={!showSecrets}
          placeholder="MINIO_SECRET_KEY"
          onChange={(value) => updateIntegration("minio", "secretKey", value)}
        />
        <IntegrationInput
          label="Bucket"
          value={settings.minio.bucket}
          placeholder="autoproia-media"
          onChange={(value) => updateIntegration("minio", "bucket", value)}
        />
        <IntegrationInput
          label="Regiao"
          value={settings.minio.region}
          placeholder="us-east-1"
          onChange={(value) => updateIntegration("minio", "region", value)}
        />
        <label className="flex h-10 items-center justify-between rounded-[14px] border border-border bg-input/65 px-4 text-sm font-bold">
          SSL ativo
          <input
            type="checkbox"
            checked={settings.minio.useSSL}
            onChange={(event) => updateIntegration("minio", "useSSL", event.target.checked)}
            className="size-4 accent-primary"
          />
        </label>
      </IntegrationCard>
    </section>
  );
}

function IntegrationCard({
  title,
  description,
  icon: Icon,
  status,
  onTest,
  children
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  status: IntegrationStatus;
  onTest: () => void;
  children: React.ReactNode;
}) {
  const statusMap = {
    pending: { label: "Pendente", className: "ap-status-new", icon: AlertCircle },
    connected: { label: "Conectado", className: "ap-status-success", icon: CheckCircle2 },
    error: { label: "Incompleto", className: "ap-status-danger", icon: AlertCircle }
  };
  const StatusIcon = statusMap[status].icon;

  return (
    <section className="rounded-[22px] border border-border bg-card/72 p-6 shadow-panel">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Icon size={20} />
          </span>
          <div>
            <h3 className="text-base font-extrabold">{title}</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={cn("inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-black", statusMap[status].className)}>
            <StatusIcon size={14} />
            {statusMap[status].label}
          </span>
          <button
            type="button"
            onClick={onTest}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 px-3 text-xs font-black text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
          >
            <KeyRound size={14} />
            Testar
          </button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function IntegrationInput({
  label,
  value,
  onChange,
  placeholder,
  secret = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  secret?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <input
        type={secret ? "password" : "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-[14px] border border-border bg-input/65 px-4 text-sm font-semibold text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
      />
    </label>
  );
}

function IaComercialPanel() {
  const [settings, setSettings] = useState<AiBusinessSettings>(defaultAiBusinessSettings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetch("/api/settings/ai-business")
      .then((response) => response.json())
      .then((data: { settings?: AiBusinessSettings }) => {
        if (active && data.settings) {
          setSettings(data.settings);
        }
      })
      .catch(() => {
        if (active) {
          setSettings(defaultAiBusinessSettings);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function updateField(key: keyof AiBusinessSettings, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setError("");
  }

  async function saveSettings() {
    setError("");
    setSaved(false);

    try {
      const response = await fetch("/api/settings/ai-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error("Falha ao salvar");
      }

      const data = (await response.json()) as { settings: AiBusinessSettings };
      setSettings(data.settings);
      setSaved(true);
    } catch {
      setError("Nao foi possivel salvar. Verifique se o banco foi atualizado com drizzle push.");
    }
  }

  return (
    <section className="rounded-[22px] border border-border bg-card/72 p-6 shadow-panel">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Prompt dinamico</p>
          <h2 className="mt-1 text-lg font-extrabold tracking-normal">IA Comercial</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Estes dados entram no prompt da IA em tempo real para orientar respostas sobre valores, endereco,
            horario e identidade do agente.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#0B5FA5]/35 bg-[#0B5FA5]/14 px-3 py-1.5 text-xs font-black text-blue-100">
          <Bot size={14} />
          Usado no WhatsApp
        </span>
      </div>

      <form
        className="mt-6 grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void saveSettings();
        }}
      >
        <div className="grid gap-5 xl:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Nome do agente IA
            </span>
            <input
              value={settings.agentName}
              onChange={(event) => updateField("agentName", event.target.value)}
              className="kanban-input"
              placeholder="Ana"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Horarios de atendimento
            </span>
            <input
              value={settings.hours}
              onChange={(event) => updateField("hours", event.target.value)}
              className="kanban-input"
              placeholder="Segunda a sexta, das 8h as 18h"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Endereco
          </span>
          <input
            value={settings.address}
            onChange={(event) => updateField("address", event.target.value)}
            className="kanban-input"
            placeholder="Rua, numero, bairro, cidade"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Precos e regras comerciais
          </span>
          <textarea
            value={settings.prices}
            onChange={(event) => updateField("prices", event.target.value)}
            className="kanban-input min-h-36 resize-y leading-6"
            placeholder="Informe valores por categoria, condicoes e regras para a IA usar."
          />
        </label>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Previa do contexto enviado para a IA</p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Agente:</strong> {settings.agentName}</p>
            <p><strong className="text-foreground">Endereco:</strong> {settings.address}</p>
            <p><strong className="text-foreground">Horario:</strong> {settings.hours}</p>
            <p><strong className="text-foreground">Precos:</strong> {settings.prices}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button className="ap-button-primary inline-flex h-10 items-center justify-center rounded-[14px] px-5 text-sm font-extrabold">
            Salvar regras da IA
          </button>
          {saved ? <span className="text-sm font-semibold text-success">Regras atualizadas no prompt</span> : null}
          {error ? <span className="text-sm font-semibold text-danger">{error}</span> : null}
        </div>
      </form>
    </section>
  );
}

function PreferenciasPanel() {
  const [rules, setRules] = useState(defaultPreferences);

  function toggleRule(ruleKey: string) {
    setRules((current) =>
      current.map((rule) => (rule.key === ruleKey ? { ...rule, enabled: !rule.enabled } : rule))
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[22px] border border-border bg-card/72 p-6 shadow-panel">
        <h2 className="text-lg font-extrabold tracking-normal">Regras operacionais do RBAC</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina regras gerais que complementam os papeis e permissoes da equipe.
        </p>

        <div className="mt-6 divide-y divide-border">
          {rules.map((preference) => (
            <div key={preference.title} className="flex items-center justify-between gap-6 py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-extrabold">{preference.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{preference.description}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleRule(preference.key)}
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
