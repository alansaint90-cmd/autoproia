import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export type LeadQueryParams = {
  search?: string | null;
  origin?: string | null;
  stage?: string | null;
  temperature?: string | null;
  sentiment?: string | null;
  seller?: string | null;
  quick?: string | null;
  start?: Date | null;
  end?: Date | null;
  limit?: number;
};

type LeadRow = {
  id: string;
  name: string | null;
  phone: string;
  avatar: string | null;
  origin: string;
  interest: string | null;
  temperature: string;
  sentiment: string;
  pipeline_stage: string;
  last_message_preview: string | null;
  last_interaction_at: Date | string | null;
  enrollment_closed_at: Date | string | null;
  responsible: string | null;
  conversation_id: string | null;
  conversation_status: string | null;
  unread_count: string | number | bigint;
  created_at: Date | string;
  updated_at: Date | string;
};

type OriginRow = { label: string | null; value: string | number | bigint };
type StageRow = { label: string | null; value: string | number | bigint };
type SellerRow = { seller: string | null; closed: string | number | bigint; revenue: string | number | bigint };

const stageMap: Record<string, string> = {
  novo: "novo",
  ia: "ia",
  atendimento: "atendimento",
  followup: "followup",
  matricula_pendente: "matricula_pendente",
  fechado: "matricula_realizada",
  perdido: "perdido"
};

function toNumber(value: string | number | bigint | null | undefined) {
  return Number(value ?? 0);
}

function dateLabel(value: Date | string | null) {
  if (!value) return "Sem interacao";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000));

  if (diffMinutes < 2) return "agora";
  if (diffMinutes < 60) return `${diffMinutes} min atras`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h atras`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "ontem";
  return `${diffDays} dias atras`;
}

function buildWhere(params: LeadQueryParams) {
  const clauses = [sql`l.is_deleted = false`];
  const search = params.search?.trim();

  if (search) {
    const term = `%${search.toLowerCase()}%`;
    clauses.push(sql`(
      lower(coalesce(l.name, '')) like ${term}
      or lower(l.phone) like ${term}
      or lower(coalesce(l.origin, '')) like ${term}
      or lower(coalesce(l.last_message_preview, '')) like ${term}
      or lower(coalesce(u.name, '')) like ${term}
      or lower(coalesce(l.interest, '')) like ${term}
    )`);
  }

  if (params.origin && params.origin !== "Todos" && params.origin !== "Todas") {
    clauses.push(sql`lower(l.origin) = ${params.origin.toLowerCase()}`);
  }

  if (params.stage && params.stage !== "todos") {
    const dbStage = params.stage === "matricula_realizada" ? "fechado" : params.stage;
    clauses.push(sql`l.pipeline_stage = ${dbStage}`);
  }

  if (params.temperature && params.temperature !== "todos") {
    clauses.push(sql`l.temperature = ${params.temperature}`);
  }

  if (params.sentiment && params.sentiment !== "todos") {
    clauses.push(sql`l.sentiment = ${params.sentiment}`);
  }

  if (params.seller && params.seller !== "Todos") {
    clauses.push(sql`coalesce(u.name, 'Sem responsavel') = ${params.seller}`);
  }

  if (params.start && params.end) {
    clauses.push(sql`coalesce(l.last_interaction_at, l.updated_at, l.created_at) >= ${params.start}`);
    clauses.push(sql`coalesce(l.last_interaction_at, l.updated_at, l.created_at) < ${params.end}`);
  }

  switch (params.quick) {
    case "quentes":
      clauses.push(sql`l.temperature in ('quente', 'urgente')`);
      break;
    case "sem_resposta":
      clauses.push(sql`coalesce(l.last_interaction_at, l.updated_at, l.created_at) < now() - interval '24 hours'`);
      break;
    case "ia":
      clauses.push(sql`c.status = 'ai'`);
      break;
    case "matriculas":
      clauses.push(sql`l.pipeline_stage in ('matricula_pendente', 'fechado')`);
      break;
    case "hoje":
      clauses.push(sql`coalesce(l.last_interaction_at, l.updated_at, l.created_at) >= date_trunc('day', now())`);
      break;
    case "whatsapp":
      clauses.push(sql`lower(l.origin) = 'whatsapp'`);
      break;
    case "meta":
      clauses.push(sql`lower(l.origin) in ('meta ads', 'facebook')`);
      break;
  }

  return sql.join(clauses, sql` and `);
}

export async function queryLeads(params: LeadQueryParams = {}) {
  const where = buildWhere(params);
  const limit = Math.min(Math.max(params.limit ?? 250, 1), 500);

  const rows = await db.execute(sql`
    select
      l.id,
      l.name,
      l.phone,
      null::text as avatar,
      l.origin,
      l.interest,
      l.temperature,
      l.sentiment,
      l.pipeline_stage,
      l.last_message_preview,
      l.last_interaction_at,
      l.enrollment_closed_at,
      coalesce(u.name, 'Ricardo IA') as responsible,
      c.id as conversation_id,
      c.status as conversation_status,
      0 as unread_count,
      l.created_at,
      l.updated_at
    from leads l
    left join users u on u.id = l.responsible_id
    left join lateral (
      select id, status
      from conversations
      where lead_id = l.id and is_deleted = false
      order by last_message_at desc
      limit 1
    ) c on true
    where ${where}
    order by coalesce(l.last_interaction_at, l.updated_at, l.created_at) desc
    limit ${limit}
  `) as LeadRow[];

  return rows.map((lead) => {
    const name = lead.name ?? `Lead ${lead.phone.slice(-4)}`;
    const status = stageMap[lead.pipeline_stage] ?? "novo";

    return {
      id: lead.id,
      name,
      phone: lead.phone,
      avatar: lead.avatar ?? undefined,
      origin: lead.origin,
      status,
      temperature: lead.temperature,
      sentiment: lead.sentiment,
      lastMessage: lead.last_message_preview ?? "Mensagem registrada pelo WhatsApp.",
      lastInteraction: dateLabel(lead.last_interaction_at ?? lead.updated_at),
      responsible: lead.responsible ?? "Ricardo IA",
      initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      notes: lead.last_message_preview ?? "Lead sincronizado do banco de dados.",
      interest: lead.interest ?? "carro",
      conversationId: lead.conversation_id,
      conversationStatus: lead.conversation_status,
      createdAt: new Date(lead.created_at).toISOString(),
      updatedAt: new Date(lead.updated_at).toISOString()
    };
  });
}

export async function queryLeadAnalytics(params: LeadQueryParams = {}) {
  const where = buildWhere(params);

  const [origins, stages, sellers] = await Promise.all([
    db.execute(sql`
      select coalesce(nullif(l.origin, ''), 'Nao informado') as label, count(*) as value
      from leads l
      left join users u on u.id = l.responsible_id
      left join lateral (
        select id, status
        from conversations
        where lead_id = l.id and is_deleted = false
        order by last_message_at desc
        limit 1
      ) c on true
      where ${where}
      group by coalesce(nullif(l.origin, ''), 'Nao informado')
      order by value desc
    `) as Promise<OriginRow[]>,
    db.execute(sql`
      select coalesce(nullif(l.pipeline_stage, ''), 'novo') as label, count(*) as value
      from leads l
      left join users u on u.id = l.responsible_id
      left join lateral (
        select id, status
        from conversations
        where lead_id = l.id and is_deleted = false
        order by last_message_at desc
        limit 1
      ) c on true
      where ${where}
      group by coalesce(nullif(l.pipeline_stage, ''), 'novo')
      order by value desc
    `) as Promise<StageRow[]>,
    db.execute(sql`
      select coalesce(u.name, 'Sem responsavel') as seller, count(*) filter (where l.pipeline_stage = 'fechado') as closed, count(*) filter (where l.pipeline_stage = 'fechado') * 2400 as revenue
      from leads l
      left join users u on u.id = l.responsible_id
      left join lateral (
        select id, status
        from conversations
        where lead_id = l.id and is_deleted = false
        order by last_message_at desc
        limit 1
      ) c on true
      where ${where}
      group by coalesce(u.name, 'Sem responsavel')
      order by closed desc
    `) as Promise<SellerRow[]>
  ]);

  return {
    origins: origins.map((item) => ({ label: item.label ?? "Nao informado", value: toNumber(item.value) })),
    stages: stages.map((item) => ({ label: item.label ?? "novo", value: toNumber(item.value) })),
    sellers: sellers.map((item) => ({
      seller: item.seller ?? "Sem responsavel",
      closed: toNumber(item.closed),
      revenue: toNumber(item.revenue)
    }))
  };
}
