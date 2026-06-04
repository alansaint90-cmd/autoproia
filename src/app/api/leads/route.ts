import { NextRequest, NextResponse } from "next/server";
import { queryLeadAnalytics, queryLeads } from "@/lib/services/lead-query-service";

export const runtime = "nodejs";

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
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
