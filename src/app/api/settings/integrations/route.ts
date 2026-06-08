import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getIntegrationSettings,
  saveIntegrationSettings
} from "@/lib/services/integration-settings-service";
import { assertPermission } from "@/lib/services/permission-service";

export async function GET() {
  try {
    const session = await getSession();
    await assertPermission(session.role, "manageIntegrations");

    const settings = await getIntegrationSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Acesso nao autorizado." },
      { status: 403 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    await assertPermission(session.role, "manageIntegrations");

    const body = await request.json().catch(() => ({}));
    const settings = await saveIntegrationSettings(body.settings);

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel salvar as integracoes." },
      { status: 403 }
    );
  }
}
