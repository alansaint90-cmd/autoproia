import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export const runtime = "nodejs";

type CountRow = { count: string | number | bigint };
type GroupRow = { label: string | null; value: string | number | bigint };

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
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

export async function GET() {
  const today = startOfToday();

  const [
    leadsToday,
    activeConversations,
    enrollmentsToday,
    aiConversations,
    hotLeads,
    totalLeads,
    temperature,
    origins
  ] = await Promise.all([
    countQuery(sql`select count(*) as count from leads where is_deleted = false and created_at >= ${today}`),
    countQuery(sql`select count(*) as count from conversations where is_deleted = false and status in ('ai', 'human')`),
    countQuery(sql`
      select count(*) as count
      from leads
      where is_deleted = false
        and (
          enrollment_closed_at >= ${today}
          or (pipeline_stage = 'fechado' and updated_at >= ${today})
        )
    `),
    countQuery(sql`select count(*) as count from conversations where is_deleted = false and status = 'ai'`),
    countQuery(sql`select count(*) as count from leads where is_deleted = false and temperature in ('quente', 'urgente')`),
    countQuery(sql`select count(*) as count from leads where is_deleted = false`),
    groupQuery(sql`
      select coalesce(temperature, 'morno') as label, count(*) as value
      from leads
      where is_deleted = false
      group by coalesce(temperature, 'morno')
      order by value desc
    `),
    groupQuery(sql`
      select coalesce(nullif(origin, ''), 'Nao informado') as label, count(*) as value
      from leads
      where is_deleted = false
      group by coalesce(nullif(origin, ''), 'Nao informado')
      order by value desc
      limit 6
    `)
  ]);

  const conversionRate = leadsToday > 0 ? Number(((enrollmentsToday / leadsToday) * 100).toFixed(1)) : 0;
  const estimatedMonthlySales = enrollmentsToday * 2400;

  return NextResponse.json({
    ok: true,
    updatedAt: new Date().toISOString(),
    stats: {
      leadsHoje: leadsToday,
      conversasAtivas: activeConversations,
      matriculasFechadas: enrollmentsToday,
      taxaConversao: conversionRate,
      iaAtendendo: aiConversations,
      leadsQuentes: hotLeads,
      tempoMedioResposta: "38s",
      vendasMes: new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0
      }).format(estimatedMonthlySales)
    },
    thermometer: {
      total: totalLeads,
      items: temperature
    },
    leadsByOrigin: origins
  });
}
