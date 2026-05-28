"use client";

import Link from "next/link";
import {
  Activity,
  BadgeDollarSign,
  Bot,
  Clock3,
  Flame,
  MessageCircleMore,
  MessageCircle,
  TrendingUp,
  Trophy,
  UserPlus,
  Users
} from "lucide-react";
import { Topbar } from "@/components/topbar";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  aiPerformance,
  dashboardStats,
  funnelData,
  leadsByOrigin,
  sellerClosing
} from "@/lib/mock-data";

const sellerClosingExtended = [
  ...sellerClosing,
  { seller: "Ana Consultora", closed: 16, revenue: "R$ 38.400", conversion: 22 },
  { seller: "Beatriz SDR", closed: 13, revenue: "R$ 31.200", conversion: 19 }
];

const cards = [
  {
    label: "Leads Hoje",
    value: dashboardStats.leadsHoje,
    badge: "+12%",
    icon: UserPlus,
    tone: "trust"
  },
  {
    label: "Conversas Ativas",
    value: dashboardStats.conversasAtivas,
    badge: "+5",
    icon: MessageCircle,
    tone: "tech"
  },
  {
    label: "Matriculas",
    value: dashboardStats.matriculasFechadas,
    badge: "+3",
    icon: Trophy,
    tone: "success"
  },
  {
    label: "Taxa Conversao",
    value: `${dashboardStats.taxaConversao}%`,
    badge: "+2.1%",
    icon: TrendingUp,
    tone: "olive"
  },
  {
    label: "IA Atendendo",
    value: dashboardStats.iaAtendendo,
    badge: "ao vivo",
    icon: Bot,
    tone: "gold"
  },
  {
    label: "Leads Quentes",
    value: dashboardStats.leadsQuentes,
    badge: "+4",
    icon: Flame,
    tone: "alert"
  },
  {
    label: "Tempo Resposta",
    value: dashboardStats.tempoMedioResposta,
    badge: "SLA",
    icon: Clock3,
    tone: "slate"
  },
  {
    label: "Vendas do Mes",
    value: dashboardStats.vendasMes,
    badge: "+18%",
    icon: BadgeDollarSign,
    tone: "gold"
  }
];

const cardToneClasses: Record<string, string> = {
  trust: "bg-[#0b1624] border-[#0f4c8a]/35",
  tech: "bg-[#111827] border-[#1f2937]",
  success: "bg-[#10251a] border-[#22c55e]/28",
  olive: "bg-[#242922] border-[#3b422f]",
  alert: "bg-[#281818] border-[#ef4444]/28",
  slate: "bg-[#17212e] border-[#26384a]",
  gold: "bg-[#2a2818] border-[#facc15]/30"
};

const interactivePanelClass =
  "rounded-[22px] border border-border bg-card/72 p-5 shadow-panel transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_30px_80px_oklch(0_0_0_/_0.42)]";

const chartSurfaceClass =
  "relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[radial-gradient(circle_at_78%_4%,rgba(250,204,21,0.14),transparent_32%),linear-gradient(145deg,rgba(17,24,39,0.78),rgba(11,17,32,0.9))] p-4";

const commercialPulse = [
  { label: "Ana fechou matricula CNH B", time: "agora", icon: CarPulseIcon },
  { label: "IA qualificou 4 novos leads", time: "2 min", icon: BadgeDollarSign },
  { label: "Lead quente: Pedro H.", time: "8 min", icon: Flame },
  { label: "12 conversas atribuidas", time: "12 min", icon: MessageCircleMore },
  { label: "Conversao Meta Ads +18%", time: "1 h", icon: TrendingUp }
];

const monthlyConversion = [
  { month: "Jan", leads: 180, enrollments: 42 },
  { month: "Fev", leads: 220, enrollments: 58 },
  { month: "Mar", leads: 260, enrollments: 71 },
  { month: "Abr", leads: 240, enrollments: 64 },
  { month: "Mai", leads: 310, enrollments: 89 },
  { month: "Jun", leads: 348, enrollments: 102 },
  { month: "Jul", leads: 332, enrollments: 96 },
  { month: "Ago", leads: 365, enrollments: 112 },
  { month: "Set", leads: 390, enrollments: 126 },
  { month: "Out", leads: 418, enrollments: 141 },
  { month: "Nov", leads: 402, enrollments: 132 },
  { month: "Dez", leads: 436, enrollments: 154 }
];

const originDonutColors = ["#facc15", "#45bd50", "#159ff2", "#a78bfa", "#ff4c4c", "#12b9c7"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

export default function DashboardPage() {
  const bestSeller = sellerClosingExtended.reduce((best, seller) => (seller.closed > best.closed ? seller : best));

  return (
    <>
      <Topbar title="Dashboard" subtitle="Numeros comerciais que mostram venda, velocidade e conversao" />
      <main className="flex-1 space-y-6 overflow-y-auto bg-background p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article
              key={card.label}
              className={cn(
                "min-h-[138px] cursor-pointer rounded-[22px] border p-4 shadow-[0_18px_48px_oklch(0_0_0_/_0.20)] transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_26px_70px_oklch(0_0_0_/_0.42)]",
                cardToneClasses[card.tone]
              )}
            >
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-9 place-items-center rounded-[12px] bg-background/70 text-primary">
                    <card.icon size={18} />
                  </div>
                  <span className="rounded-md bg-success/15 px-2 py-1 text-xs font-extrabold text-success">
                    {card.badge}
                  </span>
                </div>

                <div>
                  <p className="font-mono text-[2rem] font-extrabold leading-none text-foreground">{card.value}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{card.label}</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)]">
          <article className={cn(interactivePanelClass, "flex h-full flex-col self-stretch")}>
            <div className="mb-5">
              <h2 className="text-lg font-extrabold tracking-normal">Conversao Mensal</h2>
              <p className="mt-1 text-sm text-muted-foreground">Leads vs Matriculas</p>
            </div>
            <MonthlyConversionChart />
          </article>

          <article className={cn(interactivePanelClass, "flex h-full flex-col self-stretch")}>
            <div className="mb-5">
              <h2 className="text-lg font-extrabold tracking-normal">Leads por Origem</h2>
              <p className="mt-1 text-sm text-muted-foreground">Ultimos 30 dias</p>
            </div>
            <OriginDonut />
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[400px_1fr]">
          <article className="relative overflow-hidden rounded-[22px] border border-primary/10 bg-[radial-gradient(circle_at_16%_0%,rgba(250,204,21,0.12),transparent_34%),linear-gradient(145deg,rgba(17,24,39,0.86),rgba(11,17,32,0.96))] p-5 shadow-panel">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />
            <div className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-primary/10 blur-3xl" />

            <div className="relative mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                  <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.95)]" />
                  IA Ativa
                </div>
                <h2 className="text-lg font-extrabold tracking-normal">Pulso Comercial</h2>
                <p className="mt-1 text-sm text-muted-foreground">Eventos comerciais em tempo real</p>
              </div>
              <div className="group/health relative grid size-12 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_24px_rgba(250,204,21,0.12)]">
                <PulseHealthIcon />
                <div className="pointer-events-none absolute right-0 top-14 z-30 w-72 translate-y-2 rounded-2xl border border-primary/15 bg-[#0b1120]/96 p-4 text-left opacity-0 shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl transition-all duration-200 group-hover/health:translate-y-0 group-hover/health:opacity-100">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-primary">
                      <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.95)]" />
                      Saude comercial
                    </span>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black text-emerald-200">
                      87%
                    </span>
                  </div>
                  <p className="text-sm font-black text-foreground">Operacao saudavel e em aceleracao</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    IA: matriculas e qualificacoes estao subindo agora. Priorize os leads quentes e mantenha o follow-up ativo para nao perder conversao.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative space-y-3">
              {commercialPulse.map((event, index) => (
                <div
                  key={event.label}
                  className="group relative grid grid-cols-[34px_1fr_auto] items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.028] p-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-white/[0.055] hover:shadow-[0_18px_44px_rgba(250,204,21,0.10)]"
                >
                  <div className="relative z-10 grid size-8 place-items-center rounded-xl border border-primary/15 bg-primary/10 text-primary transition duration-300 group-hover:border-primary/30 group-hover:bg-primary/15">
                    <event.icon size={15} />
                    {index === 0 ? <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" /> : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">{event.label}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                      {index === 0 ? "Evento confirmado no funil" : "Sincronizado com IA comercial"}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-background/40 px-2 py-1 text-[10px] font-black text-primary">
                    {event.time}
                  </span>
                  <Tooltip>{event.time} - evento comercial em tempo real</Tooltip>
                </div>
              ))}
            </div>
          </article>

          <article className="group relative overflow-hidden rounded-[22px] border border-primary/[0.10] bg-[radial-gradient(circle_at_90%_0%,rgba(250,204,21,0.12),transparent_34%),linear-gradient(145deg,rgba(17,24,39,0.9),rgba(11,17,32,0.96))] p-5 shadow-panel transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(0,0,0,0.42),0_0_34px_rgba(250,204,21,0.08)]">
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent opacity-70" />
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary/80">Ranking comercial</p>
                <h2 className="text-lg font-extrabold tracking-normal">Vendedor com mais fechamento</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {bestSeller.seller} lidera com {bestSeller.closed} matriculas no mes
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/relatorios"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 px-3 text-xs font-black text-primary shadow-[0_0_22px_rgba(250,204,21,0.10)] transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/15"
                >
                  Abrir relatorio
                </Link>
                <div className="grid size-10 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_24px_rgba(250,204,21,0.12)]">
                  <Trophy size={20} />
                </div>
              </div>
            </div>

            <div className="grid max-h-[314px] gap-2.5 overflow-y-auto pr-1 [scrollbar-color:rgba(56,189,248,0.35)_transparent] [scrollbar-width:thin]">
              {sellerClosingExtended
                .slice()
                .sort((a, b) => b.closed - a.closed)
                .map((seller, index) => (
                  <SellerRow key={seller.seller} seller={seller} position={index + 1} />
                ))}
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.95fr]">
          <ChartPanel
            title="Funil de conversao"
            subtitle="De novo lead ate matricula fechada"
            icon={Activity}
          >
            <Funnel />
          </ChartPanel>

          <ChartPanel
            title="Desempenho da IA"
            subtitle="Qualidade e velocidade do atendimento automatico"
            icon={Bot}
          >
            <div className="grid gap-3">
              {aiPerformance.map((item) => (
                <div
                  key={item.metric}
                  className="group relative rounded-lg border border-border bg-background/35 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-background/55 hover:shadow-[0_18px_44px_oklch(0_0_0_/_0.28)]"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.metric}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <span className="font-mono text-xl font-semibold text-primary">{item.value}%</span>
                  </div>
                  <Meter percent={item.value} />
                  <Tooltip>
                    {item.metric}: {item.value}% - {item.detail}
                  </Tooltip>
                </div>
              ))}
            </div>
          </ChartPanel>
        </section>
      </main>
    </>
  );
}

function CarPulseIcon({ size = 16, className }: { size?: number; className?: string }) {
  return <UserPlus size={size} className={className} />;
}

function PulseHealthIcon() {
  return (
    <svg viewBox="0 0 44 44" className="size-9 overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="businessPulseGradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.12" />
          <stop offset="42%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <filter id="businessPulseGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M5 23 H13 L17 14 L22 31 L27 20 L31 23 H39"
        fill="none"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 23 H13 L17 14 L22 31 L27 20 L31 23 H39"
        fill="none"
        stroke="url(#businessPulseGradient)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#businessPulseGlow)"
        className="business-pulse-line"
      />
    </svg>
  );
}

function SellerRow({
  seller,
  position
}: {
  seller: { seller: string; closed: number; revenue: string; conversion: number };
  position: number;
}) {
  const maxClosed = Math.max(...sellerClosingExtended.map((item) => item.closed));
  const progress = Math.round((seller.closed / maxClosed) * 100);
  const rankTone =
    position === 1
      ? "border-yellow-300/35 bg-yellow-300/12 text-yellow-200 shadow-[0_0_22px_rgba(250,204,21,0.12)]"
      : position === 2
        ? "border-sky-300/25 bg-sky-300/10 text-sky-200"
        : position === 3
          ? "border-violet-300/25 bg-violet-300/10 text-violet-200"
          : "border-white/10 bg-white/[0.04] text-muted-foreground";

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.075] bg-white/[0.032] p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-300/18 hover:bg-white/[0.052] hover:shadow-[0_18px_50px_rgba(14,165,233,0.09)]">
      <div className="pointer-events-none absolute inset-y-3 left-0 w-px bg-gradient-to-b from-transparent via-sky-300/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-center gap-3">
        <div className={cn("grid size-10 place-items-center rounded-xl border font-mono text-sm font-black", rankTone)}>
          #{position}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-black text-foreground">{seller.seller}</p>
            {position === 1 ? (
              <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-yellow-200">
                lider
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{seller.revenue} em receita</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xl font-black text-sky-100">{seller.closed}</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">fech.</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-violet-400 shadow-[0_0_18px_rgba(56,189,248,0.24)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="font-mono text-xs font-black text-sky-200">{seller.conversion}%</span>
      </div>
    </div>
  );
}

function MonthlyConversionChart() {
  const [activeIndex, setActiveIndex] = useState(monthlyConversion.length - 1);
  const [isHovering, setIsHovering] = useState(false);
  const [visibleSeries, setVisibleSeries] = useState({ leads: true, enrollments: true });
  const maxLeads = Math.max(...monthlyConversion.map((item) => item.leads));
  const maxEnrollments = Math.max(...monthlyConversion.map((item) => item.enrollments));
  const plotStart = 54;
  const plotEnd = 566;
  const plotBottom = 218;
  const plotHeight = 178;
  const xStep = (plotEnd - plotStart) / (monthlyConversion.length - 1);
  const points = monthlyConversion.map((item, index) => {
    const x = plotStart + index * xStep;
    const yLeads = plotBottom - (item.leads / maxLeads) * plotHeight;
    const yEnrollments = plotBottom - (item.enrollments / maxEnrollments) * 142;
    const rate = Math.round((item.enrollments / item.leads) * 1000) / 10;
    const yRate = plotBottom - (rate / 38) * 132;

    return { ...item, x, yLeads, yEnrollments, yRate, rate };
  });
  const active = points[activeIndex];
  const previous = points[activeIndex - 1];
  const conversionRate = active.rate;
  const variation = previous ? active.enrollments - previous.enrollments : 0;
  const rateVariation = previous ? Math.round((active.rate - previous.rate) * 10) / 10 : 0;
  const bestMonth = points.reduce((best, point) => (point.rate > best.rate ? point : best), points[0]);
  const totalLeads = monthlyConversion.reduce((sum, item) => sum + item.leads, 0);
  const totalEnrollments = monthlyConversion.reduce((sum, item) => sum + item.enrollments, 0);
  const totalRate = Math.round((totalEnrollments / totalLeads) * 1000) / 10;

  const leadLine = points.map((point) => `${point.x},${point.yLeads}`).join(" ");
  const enrollmentLine = points.map((point) => `${point.x},${point.yEnrollments}`).join(" ");
  const rateLine = points.map((point) => `${point.x},${point.yRate}`).join(" ");
  const leadArea = `${plotStart},${plotBottom} ${leadLine} ${plotEnd},${plotBottom}`;
  const enrollmentArea = `${plotStart},${plotBottom} ${enrollmentLine} ${plotEnd},${plotBottom}`;

  return (
    <div className={chartSurfaceClass}>
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <div className="grid gap-3 sm:grid-cols-3">
          <ChartStat label="Leads" value={String(totalLeads)} detail="12 meses" />
          <ChartStat label="Matriculas" value={String(totalEnrollments)} detail={`${totalRate}% conversao`} />
          <ChartStat label="Melhor mes" value={bestMonth.month} detail={`${bestMonth.rate}% conversao`} />
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          <Link
            href="/relatorios"
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground shadow-glow transition duration-200 hover:-translate-y-0.5 hover:brightness-105"
          >
            Abrir relatorios
          </Link>
          <SeriesButton
            active={visibleSeries.leads}
            label="Leads"
            color="bg-primary"
            onClick={() => setVisibleSeries((current) => ({ ...current, leads: !current.leads }))}
          />
          <SeriesButton
            active={visibleSeries.enrollments}
            label="Matriculas"
            color="bg-success"
            onClick={() => setVisibleSeries((current) => ({ ...current, enrollments: !current.enrollments }))}
          />
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox="0 0 600 260"
          className="h-[450px] w-full select-none"
          onMouseMove={(event) => {
            setIsHovering(true);
            const rect = event.currentTarget.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 600;
            const nearestIndex = points.reduce((nearest, point, index) => {
              return Math.abs(point.x - x) < Math.abs(points[nearest].x - x) ? index : nearest;
            }, 0);

            setActiveIndex(nearestIndex);
          }}
          onMouseLeave={() => setIsHovering(false)}
        >
          <defs>
            <linearGradient id="leadStroke" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#fde68a" />
            </linearGradient>
            <linearGradient id="enrollmentStroke" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#67e8f9" />
            </linearGradient>
            <linearGradient id="rateStroke" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
            <filter id="chartGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[0, 90, 180, 270, 360].map((tick) => {
            const y = 218 - (tick / 360) * 178;
            return (
              <g key={tick}>
                <line x1="54" x2="566" y1={y} y2={y} stroke="oklch(1 0 0 / 0.07)" strokeDasharray="4 6" />
                <text x="18" y={y + 4} fill="oklch(0.76 0.025 250)" fontSize="11">
                {Math.round((tick / 360) * maxLeads)}
                </text>
              </g>
            );
          })}

          <line x1="54" x2="566" y1="218" y2="218" stroke="oklch(0.76 0.025 250 / 0.34)" />
          <line x1="54" x2="54" y1="28" y2="218" stroke="oklch(0.76 0.025 250 / 0.34)" />

          {points.map((point, index) => {
            const barHeight = Math.max(10, (point.rate / 35) * 112);
            return (
              <g key={`bar-${point.month}`}>
                <rect
              x={point.x - 12}
              y={218 - barHeight}
              width="24"
                  height={barHeight}
                  rx="10"
                  fill={activeIndex === index ? "oklch(0.86 0.17 95 / 0.18)" : "oklch(1 0 0 / 0.045)"}
                  stroke={activeIndex === index ? "oklch(0.86 0.17 95 / 0.34)" : "oklch(1 0 0 / 0.05)"}
                  className="transition-all duration-300"
                />
              </g>
            );
          })}

          {visibleSeries.leads ? <polygon points={leadArea} fill="oklch(0.86 0.17 95 / 0.13)" /> : null}
          {visibleSeries.enrollments ? <polygon points={enrollmentArea} fill="oklch(0.70 0.18 145 / 0.12)" /> : null}
          {visibleSeries.leads ? (
            <polyline points={leadLine} fill="none" stroke="url(#leadStroke)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#chartGlow)" className="transition-all duration-300" />
          ) : null}
          {visibleSeries.enrollments ? (
            <polyline points={enrollmentLine} fill="none" stroke="url(#enrollmentStroke)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#chartGlow)" className="transition-all duration-300" />
          ) : null}
          <polyline points={rateLine} fill="none" stroke="url(#rateStroke)" strokeWidth="2" strokeDasharray="5 7" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />

          <line x1={active.x} x2={active.x} y1="28" y2="218" stroke="oklch(0.96 0.01 95 / 0.45)" strokeDasharray="5 7" />

          {points.map((point, index) => (
            <g key={point.month}>
              <rect
                x={point.x - 22}
                y="28"
                width="44"
                height="206"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => {
                  setActiveIndex(index);
                  setIsHovering(true);
                }}
              />
              <text x={point.x} y="246" textAnchor="middle" fill={activeIndex === index ? "#facc15" : "oklch(0.76 0.025 250)"} fontSize="10" fontWeight={activeIndex === index ? "800" : "500"}>
                {point.month}
              </text>
              {visibleSeries.leads ? (
                <circle
                  cx={point.x}
                  cy={point.yLeads}
                  r={activeIndex === index ? "7" : "4"}
                  fill="#facc15"
                  stroke="#fff7cc"
                  strokeWidth={activeIndex === index ? "3" : "1"}
                  className="transition-all duration-200"
                />
              ) : null}
              {visibleSeries.enrollments ? (
                <circle
                  cx={point.x}
                  cy={point.yEnrollments}
                  r={activeIndex === index ? "7" : "4"}
                  fill="#22c55e"
                  stroke="#dcfce7"
                  strokeWidth={activeIndex === index ? "3" : "1"}
                  className="transition-all duration-200"
                />
              ) : null}
            </g>
          ))}
        </svg>

        <div
          className={cn(
            "pointer-events-none absolute min-w-[190px] rounded-2xl border border-white/10 bg-[#08111f]/95 px-4 py-3 shadow-[0_24px_70px_oklch(0_0_0_/_0.44)] backdrop-blur-xl transition-all duration-300 ease-out",
            isHovering ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          )}
          style={{
            left: `min(calc(${(active.x / 600) * 100}% + 10px), calc(100% - 210px))`,
            top: `${Math.max(Math.min(active.yLeads, active.yEnrollments) - 36, 18)}px`
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-black">{active.month}</p>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
              {conversionRate}%
            </span>
          </div>
          <div className="mt-3 grid gap-2 text-xs">
            <TooltipMetric color="bg-primary" label="Leads" value={active.leads} />
            <TooltipMetric color="bg-success" label="Matriculas" value={active.enrollments} />
            <TooltipMetric color="bg-blue-400" label="Conversao" value={`${conversionRate}%`} />
          </div>
          <p className={cn("mt-3 rounded-xl px-2 py-1 text-xs font-black", variation >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
            {variation >= 0 ? "+" : ""}
            {variation} matriculas vs mes anterior / {rateVariation >= 0 ? "+" : ""}
            {rateVariation}%
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-6 gap-2 pb-1 sm:grid-cols-12">
        {points.map((point, index) => (
          <button
            key={point.month}
            type="button"
            onClick={() => {
              setActiveIndex(index);
              setIsHovering(true);
            }}
            className={cn(
              "min-w-0 rounded-xl border px-2 py-2 text-xs font-black transition duration-200 hover:-translate-y-0.5",
              activeIndex === index
                ? "border-primary/45 bg-primary text-primary-foreground shadow-glow"
                : "border-white/10 bg-white/[0.035] text-muted-foreground hover:bg-white/[0.065] hover:text-foreground"
            )}
          >
            {point.month}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChartStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-black">{value}</p>
      <p className="text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function SeriesButton({
  active,
  label,
  color,
  onClick
}: {
  active: boolean;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-black transition duration-200 hover:-translate-y-0.5",
        active
          ? "border-white/14 bg-white/[0.075] text-foreground"
          : "border-white/8 bg-white/[0.025] text-muted-foreground opacity-70"
      )}
    >
      <span className={cn("size-2.5 rounded-full", color)} />
      {label}
    </button>
  );
}

function TooltipMetric({ color, label, value }: { color: string; label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <span className={cn("size-2 rounded-full", color)} />
        {label}
      </span>
      <span className="font-mono font-black text-foreground">{value}</span>
    </div>
  );
}


function OriginDonut() {
  const [activeOrigin, setActiveOrigin] = useState<number | null>(null);
  const total = leadsByOrigin.reduce((sum, item) => sum + item.value, 0);
  const active = activeOrigin === null ? null : leadsByOrigin[activeOrigin];
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className={cn(chartSurfaceClass, "flex min-h-[260px] flex-col justify-center")}>
      <div className="grid items-center gap-4 sm:grid-cols-[minmax(120px,0.85fr)_minmax(130px,1fr)]">
        <div className="relative mx-auto grid size-36 place-items-center">
          <svg viewBox="0 0 120 120" className="size-36 -rotate-90">
          <defs>
            <filter id="originGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
            <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth="20" />
          {leadsByOrigin.map((origin, index) => {
              const percent = origin.value / total;
              const dash = percent * circumference;
              const offset = -accumulated * circumference;
              accumulated += percent;
            const isActive = activeOrigin === index;

            return (
                <circle
                  key={origin.label}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={originDonutColors[index]}
                  strokeWidth={isActive ? "23" : "20"}
                  strokeLinecap="butt"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={offset}
                  opacity={activeOrigin === null || isActive ? 1 : 0.52}
                  filter={isActive ? "url(#originGlow)" : undefined}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => setActiveOrigin(index)}
                  onMouseLeave={() => setActiveOrigin(null)}
                  onClick={() => setActiveOrigin((current) => (current === index ? null : index))}
                />
            );
          })}
        </svg>

          <div className="absolute inset-0 grid place-items-center">
            <div className="grid size-[72px] place-items-center rounded-full border border-white/[0.08] bg-[#0b1120]/92 text-center shadow-[inset_0_0_28px_rgba(0,0,0,0.35)]">
              <span>
                <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Total</span>
                <span className="block font-mono text-xl font-black text-primary">{total}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          {leadsByOrigin.map((origin, index) => {
            const percent = Math.round((origin.value / total) * 100);
            const isActive = activeOrigin === index;

            return (
              <button
                key={origin.label}
                type="button"
                onMouseEnter={() => setActiveOrigin(index)}
                onMouseLeave={() => setActiveOrigin(null)}
                onClick={() => setActiveOrigin((current) => (current === index ? null : index))}
                className={cn(
                  "grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition duration-300 hover:-translate-y-0.5",
                  isActive
                    ? "border-primary/35 bg-white/[0.075] shadow-[0_18px_44px_oklch(0_0_0_/_0.26)]"
                    : "border-white/[0.08] bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.055]"
                )}
              >
                <span className="inline-flex min-w-0 items-center gap-2 text-xs font-black">
                  <span className="size-2.5 rounded-full shadow-[0_0_14px_currentColor]" style={{ backgroundColor: originDonutColors[index], color: originDonutColors[index] }} />
                  <span className="truncate">{origin.label}</span>
                </span>
                <span className="font-mono text-xs font-black text-foreground">{percent}%</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 min-h-5 text-center text-[11px] font-semibold text-muted-foreground">
        {active ? `${active.label}: ${active.value} leads captados` : "Passe o mouse para ver detalhes do canal"}
      </div>
    </div>
  );
}

function ChartPanel(props: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <article className={interactivePanelClass}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">{props.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{props.subtitle}</p>
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <props.icon size={20} />
        </div>
      </div>
      {props.children}
    </article>
  );
}

function Meter({ percent }: { percent: number }) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary shadow-glow" style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  );
}

function Funnel() {
  const max = Math.max(...funnelData.map((item) => item.value));
  const funnelColors = [
    "from-sky-400 to-cyan-300 shadow-[0_0_20px_rgba(56,189,248,0.18)]",
    "from-violet-400 to-fuchsia-300 shadow-[0_0_20px_rgba(167,139,250,0.18)]",
    "from-emerald-400 to-teal-300 shadow-[0_0_20px_rgba(52,211,153,0.18)]",
    "from-yellow-300 to-amber-400 shadow-[0_0_20px_rgba(250,204,21,0.16)]",
    "from-orange-400 to-rose-400 shadow-[0_0_20px_rgba(251,113,133,0.16)]",
    "from-blue-400 to-indigo-400 shadow-[0_0_20px_rgba(96,165,250,0.16)]"
  ];

  return (
    <div className="space-y-3">
      {funnelData.map((item, index) => {
        const width = Math.max((item.value / max) * 100, 26);
        const color = funnelColors[index % funnelColors.length];

        return (
          <div key={item.etapa} className="group relative rounded-lg border border-border bg-background/35 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-background/55">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{item.etapa}</span>
              <span className="font-mono text-muted-foreground">{item.value}</span>
            </div>
            <div className="flex justify-center">
              <div
                className={cn(
                  "h-9 rounded-md bg-gradient-to-r text-center text-sm font-black leading-9 text-slate-950 transition-all duration-300 group-hover:brightness-110",
                  color
                )}
                style={{ width: `${width}%`, opacity: Math.max(0.74, 1 - index * 0.045) }}
              >
                {Math.round((item.value / max) * 100)}%
              </div>
            </div>
            <Tooltip>
              {item.etapa}: {item.value} leads - {Math.round((item.value / max) * 100)}% do topo do funil
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute right-3 top-1/2 z-20 hidden max-w-[260px] -translate-y-1/2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground shadow-panel group-hover:block">
      {children}
    </div>
  );
}
