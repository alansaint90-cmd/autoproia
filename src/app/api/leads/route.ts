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
