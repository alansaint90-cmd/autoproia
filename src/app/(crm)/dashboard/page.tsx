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

const cards = [
  {
    label: "Leads Hoje",
    value: dashboardStats.leadsHoje,
    badge: "+12%",
    icon: UserPlus,
    tone: "blue"
  },
  {
    label: "Conversas Ativas",
    value: dashboardStats.conversasAtivas,
    badge: "+5",
    icon: MessageCircle,
    tone: "violet"
  },
  {
    label: "Matriculas",
    value: dashboardStats.matriculasFechadas,
    badge: "+3",
    icon: Trophy,
    tone: "teal"
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
    tone: "cyan"
  },
  {
    label: "Leads Quentes",
    value: dashboardStats.leadsQuentes,
    badge: "+4",
    icon: Flame,
    tone: "rose"
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
  blue: "bg-[#132033] border-[#20314b]",
  violet: "bg-[#211d35] border-[#332b52]",
  teal: "bg-[#122d2b] border-[#1e4743]",
  olive: "bg-[#242922] border-[#3b422f]",
  cyan: "bg-[#112b3a] border-[#1c455a]",
  rose: "bg-[#281d2b] border-[#422b45]",
  slate: "bg-[#17212e] border-[#26384a]",
  gold: "bg-[#2a2818] border-[#49401f]"
};

const interactivePanelClass =
  "rounded-[22px] border border-border bg-card/72 p-5 shadow-panel transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_30px_80px_oklch(0_0_0_/_0.42)]";

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
  const bestSeller = sellerClosing.reduce((best, seller) => (seller.closed > best.closed ? seller : best));

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

        <section className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
          <article className={cn(interactivePanelClass, "h-fit self-start")}>
            <div className="mb-5">
              <h2 className="text-lg font-extrabold tracking-normal">Conversao Mensal</h2>
              <p className="mt-1 text-sm text-muted-foreground">Leads vs Matriculas</p>
            </div>
            <MonthlyConversionChart />
          </article>

          <article className={cn(interactivePanelClass, "h-fit self-start")}>
            <div className="mb-5">
              <h2 className="text-lg font-extrabold tracking-normal">Leads por Origem</h2>
              <p className="mt-1 text-sm text-muted-foreground">Ultimos 30 dias</p>
            </div>
            <OriginDonut />
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[400px_1fr]">
          <article className="rounded-[22px] border border-border bg-card/72 p-5 shadow-panel">
            <div className="mb-7">
              <h2 className="text-lg font-extrabold tracking-normal">Pulso Comercial</h2>
              <p className="mt-1 text-sm text-muted-foreground">Ao vivo</p>
            </div>

            <div className="space-y-6">
              {commercialPulse.map((event) => (
                <div key={event.label} className="group relative grid grid-cols-[34px_1fr_auto] items-center gap-3 rounded-lg transition-colors hover:bg-background/35">
                  <div className="grid size-8 place-items-center rounded-full bg-primary/12 text-primary">
                    <event.icon size={16} />
                  </div>
                  <p className="text-sm font-semibold">{event.label}</p>
                  <span className="text-xs text-muted-foreground">{event.time}</span>
                  <Tooltip>{event.time} - evento comercial em tempo real</Tooltip>
                </div>
              ))}
            </div>
          </article>

          <article className={interactivePanelClass}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold tracking-normal">Vendedor com mais fechamento</h2>
                <p className="mt-1 text-sm text-muted-foreground">{bestSeller.seller} lidera o mes</p>
              </div>
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <Trophy size={20} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {sellerClosing
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

function SellerRow({
  seller,
  position
}: {
  seller: { seller: string; closed: number; revenue: string; conversion: number };
  position: number;
}) {
  return (
    <div className="group relative flex items-center gap-3 rounded-[18px] border border-border bg-background/35 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-background/55 hover:shadow-[0_18px_44px_oklch(0_0_0_/_0.28)]">
      <div className="grid size-9 place-items-center rounded-lg bg-primary/15 font-mono text-sm font-bold text-primary">
        {position}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{seller.seller}</p>
        <p className="text-xs text-muted-foreground">{seller.revenue}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-lg font-semibold">{seller.closed}</p>
        <p className="text-xs text-muted-foreground">{seller.conversion}%</p>
      </div>
      <Tooltip>
        {seller.closed} fechamentos - {seller.conversion}% de conversao - {seller.revenue}
      </Tooltip>
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
    <div className="relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[radial-gradient(circle_at_16%_0%,oklch(0.86_0.17_95_/_0.14),transparent_30%),linear-gradient(145deg,oklch(0.19_0.035_250_/_0.74),oklch(0.15_0.025_250_/_0.88))] p-4">
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
          className="h-[410px] w-full select-none"
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

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {points.map((point, index) => (
          <button
            key={point.month}
            type="button"
            onClick={() => {
              setActiveIndex(index);
              setIsHovering(true);
            }}
            className={cn(
              "shrink-0 rounded-xl border px-3 py-2 text-xs font-black transition duration-200 hover:-translate-y-0.5",
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
  const bestOrigin = leadsByOrigin.reduce((best, item) => (item.value > best.value ? item : best), leadsByOrigin[0]);
  let offset = 25;
  const active = activeOrigin === null ? null : leadsByOrigin[activeOrigin];

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[radial-gradient(circle_at_78%_4%,oklch(0.72_0.18_210_/_0.14),transparent_32%),linear-gradient(145deg,oklch(0.19_0.035_250_/_0.74),oklch(0.15_0.025_250_/_0.88))] p-4">
      <div className="mb-4 grid grid-cols-2 gap-3">
        <ChartStat label="Total" value={String(total)} detail="leads captados" />
        <ChartStat label="Melhor canal" value={bestOrigin.label} detail={`${bestOrigin.value} leads`} />
      </div>

      <div className="grid gap-4">
        <div className="relative mx-auto">
          <svg viewBox="0 0 240 240" className="size-56 drop-shadow-[0_22px_55px_rgba(0,0,0,0.28)]">
            <defs>
              <filter id="donutGlow" x="-35%" y="-35%" width="170%" height="170%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle cx="120" cy="120" r="86" fill="none" stroke="oklch(1 0 0 / 0.055)" strokeWidth="38" />
            {leadsByOrigin.map((origin, index) => {
              const dash = (origin.value / total) * 100;
              const isActive = activeOrigin === index;
              const circle = (
                <circle
                  key={origin.label}
                  onMouseEnter={() => setActiveOrigin(index)}
                  onMouseLeave={() => setActiveOrigin(null)}
                  onClick={() => setActiveOrigin((current) => (current === index ? null : index))}
                  cx="120"
                  cy="120"
                  r={isActive ? "90" : "86"}
                  fill="none"
                  stroke={originDonutColors[index]}
                  strokeWidth={isActive ? "42" : "34"}
                  strokeDasharray={`${dash} ${100 - dash}`}
                  strokeDashoffset={offset}
                  pathLength="100"
                  transform="rotate(-90 120 120)"
                  filter={isActive ? "url(#donutGlow)" : undefined}
                  className="cursor-pointer transition-all duration-300"
                />
              );
              offset -= dash;
              return circle;
            })}
            <circle cx="120" cy="120" r="58" fill="oklch(0.16 0.03 250)" stroke="oklch(1 0 0 / 0.08)" />
            <text x="120" y="112" textAnchor="middle" fill="oklch(0.76 0.025 250)" fontSize="11" fontWeight="700">
              {active?.label ?? "Total"}
            </text>
            <text x="120" y="136" textAnchor="middle" fill="#facc15" fontSize="26" fontWeight="900">
              {active?.value ?? total}
            </text>
          </svg>

          <div
            className={cn(
              "pointer-events-none absolute left-1/2 top-8 z-20 min-w-[176px] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#08111f]/95 px-4 py-3 text-center shadow-[0_24px_70px_oklch(0_0_0_/_0.44)] backdrop-blur-xl transition-all duration-300 ease-out",
              active ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            )}
          >
            <p className="font-black">{active?.label ?? "Origem"}</p>
            <p className="mt-2 font-mono text-primary">{active?.value ?? 0} leads</p>
            <p className="mt-1 font-mono text-success">
              {active ? Math.round((active.value / total) * 1000) / 10 : 0}% do total
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {leadsByOrigin.map((origin, index) => {
            const percent = Math.round((origin.value / total) * 1000) / 10;
            const isActive = activeOrigin === index;

            return (
              <button
                key={origin.label}
                type="button"
                onMouseEnter={() => setActiveOrigin(index)}
                onMouseLeave={() => setActiveOrigin(null)}
                onClick={() => setActiveOrigin((current) => (current === index ? null : index))}
                className={cn(
                  "w-full rounded-2xl border px-3 py-2.5 text-left transition duration-300 hover:-translate-y-0.5",
                  isActive
                    ? "border-primary/35 bg-white/[0.075] shadow-[0_18px_44px_oklch(0_0_0_/_0.26)]"
                    : "border-white/[0.08] bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.055]"
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center gap-2 text-sm font-black">
                    <span className="size-3 rounded-full shadow-[0_0_14px_currentColor]" style={{ backgroundColor: originDonutColors[index], color: originDonutColors[index] }} />
                    <span className="truncate">{origin.label}</span>
                  </span>
                  <span className="font-mono text-sm font-black text-foreground">{origin.value}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percent}%`, backgroundColor: originDonutColors[index] }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[11px] font-semibold text-muted-foreground">
                  <span>{percent}% dos leads</span>
                  <span className="hidden sm:inline xl:hidden 2xl:inline">{origin.percent}% informado</span>
                </div>
              </button>
            );
          })}
        </div>
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

  return (
    <div className="space-y-3">
      {funnelData.map((item, index) => {
        const width = Math.max((item.value / max) * 100, 26);

        return (
          <div key={item.etapa} className="group relative rounded-lg border border-border bg-background/35 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-background/55">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{item.etapa}</span>
              <span className="font-mono text-muted-foreground">{item.value}</span>
            </div>
            <div className="flex justify-center">
              <div
                className="h-9 rounded-md bg-primary/85 text-center text-sm font-semibold leading-9 text-primary-foreground transition-all duration-300 group-hover:shadow-glow"
                style={{ width: `${width}%`, opacity: 1 - index * 0.08 }}
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
