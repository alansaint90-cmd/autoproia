import { NextRequest, NextResponse } from "next/server";
import { getOptionalSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { processDueFollowUps } from "@/lib/services/follow-up-service";
import { assertPermission } from "@/lib/services/permission-service";

export const runtime = "nodejs";

function getInternalSecret(request: Request) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  return (
    request.headers.get("x-internal-secret") ??
    request.headers.get("x-webhook-secret") ??
    request.headers.get("x-api-key") ??
    bearer
  );
}

async function canProcessFollowUps(request: Request) {
  const secret = getInternalSecret(request);
  if (env.EVOLUTION_WEBHOOK_SECRET && secret === env.EVOLUTION_WEBHOOK_SECRET) {
    return true;
  }

  const session = await getOptionalSession();
  if (!session) return false;

  await assertPermission(session.role, "manageAi");
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const authorized = await canProcessFollowUps(request);
    if (!authorized) {
      return NextResponse.json({ error: "Acesso nao autorizado." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as { limit?: unknown };
    const limit = typeof body.limit === "number" ? body.limit : Number(body.limit ?? 25);
    const result = await processDueFollowUps(Number.isFinite(limit) ? limit : 25);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel processar follow-ups." },
      { status: 500 }
    );
  }
}
