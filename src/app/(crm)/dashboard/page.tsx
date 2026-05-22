"use client";

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
  { month: "Jun", leads: 348, enrollments: 102 }
];

const originDonutColors = ["#facc15", "#45bd50", "#159ff2", "#a78bfa", "#ff4c4c", "#12b9c7"];

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

        <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <article className={interactivePanelClass}>
            <div className="mb-5">
              <h2 className="text-lg font-extrabold tracking-normal">Conversao Mensal</h2>
              <p className="mt-1 text-sm text-muted-foreground">Leads vs Matriculas</p>
            </div>
            <MonthlyConversionChart />
          </article>

          <article className={interactivePanelClass}>
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
  const [activeIndex, setActiveIndex] = useState(1);
  const [isHovering, setIsHovering] = useState(false);
  const points = monthlyConversion.map((item, index) => {
    const x = 32 + index * 106;
    const yLeads = 236 - (item.leads / 360) * 220;
    const yEnrollments = 236 - (item.enrollments / 120) * 150;

    return { ...item, x, yLeads, yEnrollments };
  });
  const active = points[activeIndex];
  const previous = points[activeIndex - 1];
  const conversionRate = Math.round((active.enrollments / active.leads) * 1000) / 10;
  const variation = previous ? active.enrollments - previous.enrollments : 0;

  const leadLine = points.map((point) => `${point.x},${point.yLeads}`).join(" ");
  const enrollmentLine = points.map((point) => `${point.x},${point.yEnrollments}`).join(" ");
  const leadArea = `32,236 ${leadLine} 562,236`;
  const enrollmentArea = `32,236 ${enrollmentLine} 562,236`;

  return (
    <div className="relative overflow-hidden rounded-[18px] bg-background/25 p-3">
      <svg
        viewBox="0 0 600 260"
        className="h-[260px] w-full"
        onMouseMove={(event) => {
          setIsHovering(true);
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * 600;
          const nearestIndex = points.reduce((nearest, point, index) => {
            return Math.abs(point.x - x) < Math.abs(points[nearest].x - x) ? index : nearest;
          }, 0);

          setActiveIndex(nearestIndex);
        }}
        onMouseLeave={() => {
          setActiveIndex(1);
          setIsHovering(false);
        }}
      >
        {[0, 90, 180, 270, 360].map((tick) => {
          const y = 236 - (tick / 360) * 220;
          return (
            <g key={tick}>
              <line x1="32" x2="582" y1={y} y2={y} stroke="oklch(1 0 0 / 0.07)" strokeDasharray="3 4" />
              <text x="8" y={y + 4} fill="oklch(0.76 0.025 250)" fontSize="11">
                {tick}
              </text>
            </g>
          );
        })}
        <line x1="32" x2="582" y1="236" y2="236" stroke="oklch(0.76 0.025 250 / 0.45)" />
        <line x1="32" x2="32" y1="16" y2="236" stroke="oklch(0.76 0.025 250 / 0.45)" />
        <polygon points={leadArea} fill="oklch(0.86 0.17 95 / 0.20)" />
        <polygon points={enrollmentArea} fill="oklch(0.70 0.18 145 / 0.18)" />
        <polyline points={leadLine} fill="none" stroke="oklch(0.86 0.17 95)" strokeWidth="3" className="transition-all duration-300" />
        <polyline points={enrollmentLine} fill="none" stroke="oklch(0.70 0.18 145)" strokeWidth="3" className="transition-all duration-300" />
        {points.map((point) => (
          <g key={point.month}>
            <text x={point.x - 10} y="253" fill="oklch(0.76 0.025 250)" fontSize="12">
              {point.month}
            </text>
            <circle
              cx={point.x}
              cy={point.yLeads}
              r={activeIndex === points.indexOf(point) ? "6" : "3"}
              fill="oklch(0.86 0.17 95)"
              stroke="oklch(0.96 0.01 95)"
              strokeWidth={activeIndex === points.indexOf(point) ? "2" : "0"}
              className="transition-all duration-200"
            />
            <circle
              cx={point.x}
              cy={point.yEnrollments}
              r={activeIndex === points.indexOf(point) ? "6" : "3"}
              fill="oklch(0.70 0.18 145)"
              stroke="oklch(0.96 0.01 95)"
              strokeWidth={activeIndex === points.indexOf(point) ? "2" : "0"}
              className="transition-all duration-200"
            />
          </g>
        ))}
        <line x1={active.x} x2={active.x} y1="16" y2="236" stroke="oklch(0.96 0.01 95 / 0.55)" />
      </svg>
      <div
        className={cn(
          "pointer-events-none absolute min-w-[150px] rounded-[12px] border border-border bg-background px-4 py-3 shadow-panel transition-all duration-300 ease-out",
          isHovering ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        )}
        style={{
          left: `min(calc(${(active.x / 600) * 100}% + 12px), calc(100% - 170px))`,
          top: `${Math.max(active.yLeads - 58, 18)}px`
        }}
      >
        <p className="font-semibold text-muted-foreground">{active.month}</p>
        <p className="mt-2 font-mono text-primary">leads : {active.leads}</p>
        <p className="mt-2 font-mono text-success">matriculas : {active.enrollments}</p>
        <p className="mt-2 font-mono text-foreground">conversao : {conversionRate}%</p>
        <p className={cn("mt-2 font-mono", variation >= 0 ? "text-success" : "text-danger")}>
          variacao : {variation >= 0 ? "+" : ""}
          {variation}
        </p>
      </div>
    </div>
  );
}

function OriginDonut() {
  const [activeOrigin, setActiveOrigin] = useState<number | null>(null);
  const total = leadsByOrigin.reduce((sum, item) => sum + item.value, 0);
  let offset = 25;
  const active = activeOrigin === null ? null : leadsByOrigin[activeOrigin];

  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 220 220" className="size-56">
        {leadsByOrigin.map((origin, index) => {
          const dash = (origin.value / total) * 100;
          const circle = (
            <circle
              key={origin.label}
              onMouseEnter={() => setActiveOrigin(index)}
              onMouseLeave={() => setActiveOrigin(null)}
              cx="110"
              cy="110"
              r="72"
              fill="none"
              stroke={originDonutColors[index]}
              strokeWidth={activeOrigin === index ? "40" : "34"}
              strokeDasharray={`${dash} ${100 - dash}`}
              strokeDashoffset={offset}
              pathLength="100"
              transform="rotate(-90 110 110)"
              className="cursor-pointer transition-all duration-300"
            />
          );
          offset -= dash;
          return circle;
        })}
        <circle cx="110" cy="110" r="50" fill="oklch(0.18 0.03 250)" />
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-2 text-xs">
        {leadsByOrigin.map((origin, index) => (
          <span
            key={origin.label}
            onMouseEnter={() => setActiveOrigin(index)}
            onMouseLeave={() => setActiveOrigin(null)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 transition-all duration-300",
              activeOrigin === index && "bg-background/60 text-foreground"
            )}
          >
            <span className="size-3 rounded-full" style={{ backgroundColor: originDonutColors[index] }} />
            {origin.label}
          </span>
        ))}
      </div>
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-[82px] z-20 min-w-[160px] -translate-x-1/2 rounded-[12px] border border-border bg-background px-4 py-3 text-center shadow-panel transition-all duration-300 ease-out",
          active ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        )}
      >
        <p className="font-semibold">{active?.label ?? "Origem"}</p>
        <p className="mt-2 font-mono text-primary">{active?.value ?? 0} leads</p>
        <p className="mt-1 font-mono text-success">{active ? Math.round((active.value / total) * 1000) / 10 : 0}% do total</p>
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
