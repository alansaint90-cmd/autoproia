import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/services/permission-service";
import { queryLeadAnalytics, queryLeads } from "@/lib/services/lead-query-service";

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    await assertPermission(session.role, "viewTeamReports");

    const body = await request.json().catch(() => ({})) as {
      start?: string;
      end?: string;
      origin?: string;
      seller?: string;
      limit?: number;
    };

    const queryParams = {
      search: null,
      origin: body.origin && body.origin !== "Todas" ? body.origin : null,
      stage: null,
      temperature: null,
      sentiment: null,
      seller: body.seller && body.seller !== "Todos" ? body.seller : null,
      quick: null,
      start: parseDate(body.start),
      end: parseDate(body.end),
      limit: body.limit ?? 500
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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel gerar o relatorio." },
      { status: 403 }
    );
  }
}
