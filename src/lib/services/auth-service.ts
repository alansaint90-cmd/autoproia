import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import type { Role } from "@/lib/auth/rbac";
import {
  createAuthToken,
  hashAuthToken,
  hashPassword,
  validatePasswordStrength,
  verifyPassword
} from "@/lib/auth/password";
import { createSessionCookie } from "@/lib/auth/session";

export type AuthInviteResult = {
  userId: string;
  inviteUrl: string;
  emailSent: boolean;
};

const systemUserId = "00000000-0000-0000-0000-000000000001";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function inviteUrl(token: string) {
  return `${env.APP_URL.replace(/\/$/, "")}/criar-senha?token=${encodeURIComponent(token)}`;
}

async function sendInviteEmail(input: { email: string; name: string; url: string }) {
  if (!env.RESEND_API_KEY) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.AUTH_EMAIL_FROM,
      to: input.email,
      subject: "Crie sua senha no Auto Pro IA",
      html: `
        <div style="font-family:Arial,sans-serif;background:#0b1120;color:#f9fafb;padding:32px">
          <div style="max-width:560px;margin:auto;background:#111827;border:1px solid #243244;border-radius:18px;padding:28px">
            <h1 style="margin:0 0 12px;font-size:24px">Bem-vindo ao Auto Pro IA</h1>
            <p style="line-height:1.6;color:#cbd5e1">Olá, ${input.name}. Clique no botão abaixo para criar sua senha de acesso.</p>
            <a href="${input.url}" style="display:inline-block;margin-top:18px;background:#FACC15;color:#0B1120;text-decoration:none;font-weight:800;padding:14px 18px;border-radius:12px">Criar senha</a>
            <p style="margin-top:22px;font-size:12px;color:#94a3b8">Este link expira em 24 horas.</p>
          </div>
        </div>
      `
    })
  });

  if (!response.ok) {
    console.warn("[auth] failed to send invite email", await response.text());
  }

  return response.ok;
}

export async function ensureSuperAdmin() {
  const email = normalizeEmail(env.SUPERADMIN_EMAIL);
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing) return existing;

  const token = createAuthToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [created] = await db
    .insert(users)
    .values({
      id: systemUserId,
      name: env.SUPERADMIN_NAME,
      email,
      role: "super_admin",
      invite_token_hash: await hashAuthToken(token),
      invite_expires_at: expiresAt,
      invited_at: now,
      modified_by: systemUserId
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    const url = inviteUrl(token);
    const emailSent = await sendInviteEmail({ email, name: env.SUPERADMIN_NAME, url });
    console.info("[auth] superadmin invite created", { email, inviteUrl: url, emailSent });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}

export async function inviteUser(input: { name: string; email: string; role: Role }) {
  const email = normalizeEmail(input.email);
  const token = createAuthToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tokenHash = await hashAuthToken(token);

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  const values = {
    name: input.name.trim(),
    email,
    role: input.role,
    invite_token_hash: tokenHash,
    invite_expires_at: expiresAt,
    invited_at: now,
    modified_by: systemUserId
  };

  const [user] = existing
    ? await db.update(users).set(values).where(eq(users.id, existing.id)).returning()
    : await db.insert(users).values(values).returning();

  const url = inviteUrl(token);
  const emailSent = await sendInviteEmail({ email, name: user.name, url });

  return { userId: user.id, inviteUrl: url, emailSent } satisfies AuthInviteResult;
}

export async function acceptInvite(input: { token: string; password: string; name?: string }) {
  const passwordError = validatePasswordStrength(input.password);
  if (passwordError) {
    throw new Error(passwordError);
  }

  const tokenHash = await hashAuthToken(input.token);
  const [user] = await db.select().from(users).where(eq(users.invite_token_hash, tokenHash)).limit(1);

  if (!user || !user.invite_expires_at || user.invite_expires_at.getTime() < Date.now()) {
    throw new Error("Convite invalido ou expirado.");
  }

  const [updated] = await db
    .update(users)
    .set({
      name: input.name?.trim() || user.name,
      password_hash: await hashPassword(input.password),
      password_set_at: new Date(),
      email_verified_at: new Date(),
      invite_token_hash: null,
      invite_expires_at: null,
      updated_at: new Date(),
      modified_by: user.id
    })
    .where(eq(users.id, user.id))
    .returning();

  await createSessionCookie({
    userId: updated.id,
    role: updated.role as Role,
    name: updated.name,
    email: updated.email
  });

  return updated;
}

export async function login(input: { email: string; password: string; remember?: boolean }) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(input.email)))
    .limit(1);

  if (!user || user.is_deleted || !(await verifyPassword(input.password, user.password_hash))) {
    throw new Error("Email ou senha invalidos.");
  }

  await db.update(users).set({ last_login_at: new Date(), updated_at: new Date() }).where(eq(users.id, user.id));

  await createSessionCookie(
    {
      userId: user.id,
      role: user.role as Role,
      name: user.name,
      email: user.email
    },
    input.remember
  );

  return user;
}
