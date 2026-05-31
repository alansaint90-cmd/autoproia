import { NextResponse } from "next/server";
import { ensureSuperAdmin } from "@/lib/services/auth-service";

export async function POST() {
  try {
    const user = await ensureSuperAdmin();

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        passwordReady: Boolean(user.password_hash)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel preparar o superadmin." },
      { status: 500 }
    );
  }
}
