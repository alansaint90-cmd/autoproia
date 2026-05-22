import Link from "next/link";
import { Car, LockKeyhole, Mail, Sparkles } from "lucide-react";

const metrics = [
  { value: "+38%", label: "Conversao" },
  { value: "24/7", label: "IA Atendendo" },
  { value: "1.2k+", label: "Leads/mes" }
];

export default function LoginPage() {
  return (
    <main className="grid min-h-screen overflow-hidden bg-background text-foreground lg:grid-cols-[1.28fr_1fr]">
      <section className="relative flex min-h-screen flex-col px-8 py-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,oklch(0.86_0.17_95_/_0.24),transparent_31%),radial-gradient(circle_at_70%_85%,oklch(0.50_0.15_250_/_0.16),transparent_38%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(1_0_0_/_0.028)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0_/_0.028)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/10 via-background/75 to-background" />

        <header className="relative z-10 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow">
            <Car size={22} strokeWidth={2.6} />
          </div>
          <div>
            <p className="text-xl font-extrabold leading-none tracking-wide">AUTO PRO IA</p>
            <p className="mt-1 text-xs text-muted-foreground">v1.1 - CRM Inteligente</p>
          </div>
        </header>

        <div className="relative z-10 flex flex-1 items-center">
          <div className="w-full max-w-[900px]">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/45 bg-primary/10 px-4 py-2 text-sm font-bold text-foreground shadow-[0_0_26px_oklch(0.86_0.17_95_/_0.12)]">
              <Sparkles size={15} className="text-primary" />
              IA conversando 24/7 no WhatsApp
            </div>

            <h1 className="max-w-[900px] text-[clamp(2.8rem,5vw,4.9rem)] font-extrabold leading-[1.04] tracking-normal">
              O CRM definitivo para <span className="text-primary">autoescolas</span> que vendem mais.
            </h1>

            <p className="mt-8 max-w-[650px] text-xl leading-8 text-muted-foreground">
              Capture leads de anuncios, deixe a IA qualificar via WhatsApp e feche matriculas direto do funil Kanban.
            </p>

            <div className="mt-12 grid max-w-[900px] gap-5 md:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-[18px] border border-border bg-card/45 px-5 py-5 backdrop-blur">
                  <p className="font-mono text-3xl font-extrabold text-primary">{metric.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="relative z-10 text-sm text-muted-foreground">© 2026 Auto Pro IA · Transito + Tecnologia</p>
      </section>

      <section className="relative grid min-h-screen place-items-center bg-background px-8 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,oklch(0.38_0.11_250_/_0.12),transparent_36%)]" />

        <div className="relative w-full max-w-[540px] rounded-[24px] border border-border bg-card/78 p-9 shadow-[0_28px_90px_oklch(0_0_0_/_0.42)] backdrop-blur">
          <div className="mb-10">
            <h2 className="text-3xl font-extrabold tracking-normal">Bem-vindo de volta 👋</h2>
            <p className="mt-2 text-base text-muted-foreground">Acesse seu painel comercial.</p>
          </div>

          <form className="space-y-7">
            <label className="block">
              <span className="mb-3 block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Email
              </span>
              <span className="flex h-14 items-center gap-4 rounded-[18px] border border-border bg-input/55 px-4 transition focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10">
                <Mail className="size-5 shrink-0 text-muted-foreground" />
                <input
                  type="email"
                  defaultValue="admin@autopro.ia"
                  className="min-w-0 flex-1 bg-transparent text-base font-semibold text-foreground outline-none"
                  aria-label="Email"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-3 block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Senha
              </span>
              <span className="flex h-14 items-center gap-4 rounded-[18px] border border-border bg-input/55 px-4 transition focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10">
                <LockKeyhole className="size-5 shrink-0 text-muted-foreground" />
                <input
                  type="password"
                  defaultValue="autoproia"
                  className="min-w-0 flex-1 bg-transparent text-base font-semibold text-foreground outline-none"
                  aria-label="Senha"
                />
              </span>
            </label>

            <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="size-4 rounded border-border accent-primary" aria-label="Manter conectado" />
                <span>Manter conectado</span>
              </label>
              <Link href="/configuracoes" className="font-semibold text-primary">
                Esqueci minha senha
              </Link>
            </div>

            <Link
              href="/dashboard"
              className="flex h-14 w-full items-center justify-center rounded-[20px] bg-primary px-5 text-base font-extrabold text-primary-foreground shadow-[0_18px_44px_oklch(0.86_0.17_95_/_0.28)] transition hover:brightness-105"
            >
              Entrar no painel
            </Link>

            <p className="text-center text-sm text-muted-foreground">
              Novo por aqui?{" "}
              <Link href="/dashboard" className="font-semibold text-primary">
                Acessar demo
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
