import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { aiDecisionLogs, leads, users } from "@/lib/db/schema";
import { assertPermission } from "@/lib/services/permission-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    await assertPermission(session.role, "viewTeamReports");

    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 200), 1), 500);
    const rows = await db
      .select({
        id: aiDecisionLogs.id,
        action: aiDecisionLogs.action,
        reason: aiDecisionLogs.reason,
        mode: aiDecisionLogs.mode,
        safetyStatus: aiDecisionLogs.safety_status,
        metadata: aiDecisionLogs.metadata,
        createdAt: aiDecisionLogs.created_at,
        userName: sql<string>`coalesce(${users.name}, 'Sistema')`,
        leadName: sql<string>`coalesce(${leads.name}, 'Lead sem nome')`
      })
      .from(aiDecisionLogs)
      .leftJoin(users, eq(users.id, aiDecisionLogs.modified_by))
      .leftJoin(leads, eq(leads.id, aiDecisionLogs.lead_id))
      .orderBy(desc(aiDecisionLogs.created_at))
      .limit(limit);

    return NextResponse.json({
      ok: true,
      rows: rows.map((row) => ({
        id: row.id,
        action: labelAction(row.action),
        user: row.userName,
        entity: row.action === "funnel_stage_changed" ? row.reason : `${row.leadName} - ${row.reason}`,
        date: new Date(row.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
        status: statusFromAction(row.action, row.safetyStatus),
        rawAction: row.action,
        metadata: row.metadata
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel carregar auditoria." },
      { status: 403 }
    );
  }
}

function labelAction(action: string) {
  const labels: Record<string, string> = {
    funnel_stage_changed: "Funil",
    ai_reply_generated: "Publicado",
    ai_reply_blocked_by_safety: "Rejeitado",
    ai_reply_skipped_manual_mode: "Rejeitado",
    ai_mode_skipped: "Triagem",
    ai_triage_applied: "Triagem",
    ai_qualified_lead: "Qualificado",
    human_handoff_triggered: "Handoff",
    ai_mode_restored: "IA Ativa",
    follow_up_sent: "Follow-up"
  };
  return labels[action] ?? "Sistema";
}

function statusFromAction(action: string, safetyStatus: string) {
  if (safetyStatus === "blocked" || safetyStatus === "skipped") return "rejected";
  if (action === "funnel_stage_changed" || action === "ai_qualified_lead") return "approved";
  if (action === "ai_reply_generated" || action === "follow_up_sent") return "published";
  if (action.includes("triage")) return "captured";
  if (action.includes("handoff")) return "config";
  return "captured";
}
