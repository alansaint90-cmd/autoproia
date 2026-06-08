import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { canRole } from "@/lib/services/permission-service";

export const runtime = "nodejs";

type CountRow = { count: string | number | bigint };
type GroupRow = { label: string | null; value: string | number | bigint };

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getPeriodRange(period: string | null) {
  const today = startOfToday();
  const normalized = (period ?? "Hoje").toLowerCase();

  if (normalized.includes("todo")) {
    return { label: "Todo o periodo", start: null, end: null };
  }

  if (normalized.includes("ontem")) {
    const start = addDays(today, -1);
    return { label: "Ontem", start, end: today };
  }

  if (normalized.includes("30")) {
    return { label: "Ultimos 30 dias", start: addDays(today, -29), end: addDays(today, 1) };
  }

  if (normalized.includes("15")) {
    return { label: "Ultimos 15 dias", start: addDays(today, -14), end: addDays(today, 1) };
  }

  if (normalized.includes("7")) {
    return { label: "Ultimos 7 dias", start: addDays(today, -6), end: addDays(today, 1) };
  }

  return { label: "Hoje", start: today, end: addDays(today, 1) };
}

function rangeClause(column: ReturnType<typeof sql>, start: Date | null, end: Date | null) {
  if (!start || !end) {
    return sql``;
  }

  return sql` and ${column} >= ${start} and ${column} < ${end}`;
}

function toNumber(value: string | number | bigint | null | undefined) {
  return Number(value ?? 0);
}

async function countQuery(query: ReturnType<typeof sql>) {
  const rows = await db.execute(query) as CountRow[];
  return toNumber(rows[0]?.count);
}

async function groupQuery(query: ReturnType<typeof sql>) {
  const rows = await db.execute(query) as GroupRow[];
  return rows.map((row) => ({
    label: row.label ?? "Nao informado",
    value: toNumber(row.value)
  }));
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const canViewDashboard = await canRole(session.role, "viewTeamReports")
      || await canRole(session.role, "viewOwnReports")
      || await canRole(session.role, "viewLeads");

    if (!canViewDashboard) {
      return NextResponse.json({ error: "Sem permissao para visualizar metricas." }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Acesso nao autorizado." },
      { status: 401 }
    );
  }

  const period = getPeriodRange(request.nextUrl.searchParams.get("period"));
  const leadsCreatedRange = rangeClause(sql.raw("created_at"), period.start, period.end);
  const leadsUpdatedRange = rangeClause(sql.raw("updated_at"), period.start, period.end);
  const leadsInteractionRange = rangeClause(sql.raw("coalesce(last_interaction_at, updated_at, created_at)"), period.start, period.end);
  const conversationsRange = rangeClause(sql.raw("last_message_at"), period.start, period.end);
  const enrollmentRange = period.start && period.end
    ? sql`and (
        (enrollment_closed_at >= ${period.start} and enrollment_closed_at < ${period.end})
        or (pipeline_stage = 'fechado' and updated_at >= ${period.start} and updated_at < ${period.end})
      )`
    : sql``;

  const [
    leadsInPeriod,
    activeConversations,
    enrollmentsInPeriod,
    aiConversations,
    hotLeads,
    totalLeads,
    temperature,
    origins
  ] = await Promise.all([
    countQuery(sql`select count(*) as count from leads where is_deleted = false ${leadsInteractionRange}`),
    countQuery(sql`select count(*) as count from conversations where is_deleted = false and status in ('ai', 'human') ${conversationsRange}`),
    countQuery(sql`
      select count(*) as count
      from leads
      where is_deleted = false
        ${enrollmentRange}
    `),
    countQuery(sql`select count(*) as count from conversations where is_deleted = false and status = 'ai' ${conversationsRange}`),
    countQuery(sql`select count(*) as count from leads where is_deleted = false and temperature in ('quente', 'urgente') ${leadsInteractionRange}`),
    countQuery(sql`select count(*) as count from leads where is_deleted = false ${leadsInteractionRange}`),
    groupQuery(sql`
      select coalesce(temperature, 'morno') as label, count(*) as value
      from leads
      where is_deleted = false
        ${leadsInteractionRange}
      group by coalesce(temperature, 'morno')
      order by value desc
    `),
    groupQuery(sql`
      select coalesce(nullif(origin, ''), 'Nao informado') as label, count(*) as value
      from leads
      where is_deleted = false
        ${leadsCreatedRange}
      group by coalesce(nullif(origin, ''), 'Nao informado')
      order by value desc
      limit 6
    `)
  ]);

  const conversionRate = leadsInPeriod > 0 ? Number(((enrollmentsInPeriod / leadsInPeriod) * 100).toFixed(1)) : 0;
  const estimatedSales = enrollmentsInPeriod * 2400;

  return NextResponse.json({
    ok: true,
    period: {
      label: period.label,
      start: period.start?.toISOString() ?? null,
      end: period.end?.toISOString() ?? null
    },
    updatedAt: new Date().toISOString(),
    stats: {
      leadsHoje: leadsInPeriod,
      conversasAtivas: activeConversations,
      matriculasFechadas: enrollmentsInPeriod,
      taxaConversao: conversionRate,
      iaAtendendo: aiConversations,
      leadsQuentes: hotLeads,
      tempoMedioResposta: "38s",
      vendasMes: new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0
      }).format(estimatedSales)
    },
    thermometer: {
      total: totalLeads,
      items: temperature
    },
    leadsByOrigin: origins
  });
}
