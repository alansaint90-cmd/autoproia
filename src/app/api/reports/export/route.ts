import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/services/permission-service";

export async function POST() {
  try {
    const session = await getSession();
    await assertPermission(session.role, "exportPdf");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seu usuario nao tem permissao para gerar PDF." },
      { status: 403 }
    );
  }
}
