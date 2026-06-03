import { NextResponse } from "next/server";
import { z } from "zod";
import { login } from "@/lib/services/auth-service";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional()
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Informe o email e a senha para entrar." }, { status: 400 });
    }

    const body = parsed.data;
    const user = await login(body);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel entrar." },
      { status: 401 }
    );
  }
}
