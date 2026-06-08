import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import { assertPermission } from "@/lib/services/permission-service";
import { queryLeadAnalytics, queryLeads } from "@/lib/services/lead-query-service";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const uiToDbStage: Record<string, string> = {
  novo: "novo",
  ia: "ia",
  atendimento: "atendimento",
  qualificado: "atendimento",
  orcamento: "atendimento",
  negociacao: "followup",
  interessado: "followup",
  followup: "followup",
  perdido: "perdido",
  matricula_pendente: "matricula_pendente",
  matricula_realizada: "fechado",
  fechado: "fechado"
};

function normalizeStage(value: unknown) {
  if (typeof value !== "string") return "novo";
  return uiToDbStage[value] ?? "novo";
}

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    await assertPermission(session.role, "viewLeads");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Acesso nao autorizado." },
      { status: 401 }
    );
  }

  const params = request.nextUrl.searchParams;
  const start = parseDate(params.get("start"));
  const end = parseDate(params.get("end"));
  const queryParams = {
    search: params.get("search"),
    origin: params.get("origin"),
    stage: params.get("stage"),
    temperature: params.get("temperature"),
    sentiment: params.get("sentiment"),
    seller: params.get("seller"),
    quick: params.get("quick"),
    start,
    end,
    limit: Number(params.get("limit") ?? 250)
  };

  const [leads, analytics] = await Promise.all([
    queryLeads(queryParams),
    queryLeadAnalytics(queryParams)
  ]);

  return NextResponse.json({
    ok: true,
    leads,
    analytics,
    count: leads.length,
    updatedAt: new Date().toISOString()
  });
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    await assertPermission(session.role, "deleteLeads");

    const leadId = request.nextUrl.searchParams.get("id");
    if (!leadId) {
      return NextResponse.json({ error: "Informe o lead para excluir." }, { status: 400 });
    }

    await db
      .update(leads)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        modified_by: session.userId
      })
      .where(eq(leads.id, leadId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel excluir o lead." },
      { status: 403 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    await assertPermission(session.role, "createLeads");

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const name = nonEmptyString(body.name);
    const phone = nonEmptyString(body.phone);

    if (!name || !phone) {
      return NextResponse.json({ error: "Informe nome e telefone do lead." }, { status: 400 });
    }

    await db
      .insert(leads)
      .values({
        name,
        phone,
        avatar_url: nonEmptyString(body.avatar),
        origin: nonEmptyString(body.origin) ?? "WhatsApp",
        interest: nonEmptyString(body.interest),
        temperature: nonEmptyString(body.temperature) ?? "quente",
        sentiment: nonEmptyString(body.sentiment) ?? "positivo",
        pipeline_stage: normalizeStage(body.status),
        last_message_preview: nonEmptyString(body.lastMessage) ?? "Novo lead cadastrado manualmente.",
        last_interaction_at: new Date(),
        modified_by: session.userId
      });

    const [lead] = await queryLeads({ search: phone, limit: 1 });

    return NextResponse.json({ ok: true, lead });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel criar o lead." },
      { status: 403 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const leadId = nonEmptyString(body.id);

    if (!leadId) {
      return NextResponse.json({ error: "Informe o lead para atualizar." }, { status: 400 });
    }

    if (body.status !== undefined) {
      await assertPermission(session.role, "moveKanban");
    } else {
      await assertPermission(session.role, "editLeads");
    }

    const update: Partial<typeof leads.$inferInsert> = {
      updated_at: new Date(),
      modified_by: session.userId
    };

    if (body.name !== undefined) update.name = nonEmptyString(body.name);
    if (body.avatar !== undefined) update.avatar_url = nonEmptyString(body.avatar);
    if (body.phone !== undefined) {
      const phone = nonEmptyString(body.phone);
      if (!phone) return NextResponse.json({ error: "Telefone invalido." }, { status: 400 });
      update.phone = phone;
    }
    if (body.origin !== undefined) update.origin = nonEmptyString(body.origin) ?? "WhatsApp";
    if (body.interest !== undefined) update.interest = nonEmptyString(body.interest);
    if (body.temperature !== undefined) update.temperature = nonEmptyString(body.temperature) ?? "morno";
    if (body.sentiment !== undefined) update.sentiment = nonEmptyString(body.sentiment) ?? "neutro";
    if (body.status !== undefined) update.pipeline_stage = normalizeStage(body.status);
    if (body.lastMessage !== undefined) update.last_message_preview = nonEmptyString(body.lastMessage);
    if (body.status !== undefined || body.lastMessage !== undefined) update.last_interaction_at = new Date();

    await db.update(leads).set(update).where(eq(leads.id, leadId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel atualizar o lead." },
      { status: 403 }
    );
  }
}
