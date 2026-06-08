"use client";

import { useState } from "react";
import { LockKeyhole, Mail } from "lucide-react";

async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  const text = await response.text();
  throw new Error(
    text.trim().startsWith("<!DOCTYPE")
      ? "A rota de autenticacao retornou uma pagina HTML. Reinicie o servidor local e confirme se a API esta ativa."
      : text || "Resposta invalida do servidor."
  );
}

export function LoginForm() {
  const [email, setEmail] = useState("admin@autopro.ia");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [firstAccessUrl, setFirstAccessUrl] = useState("");
  const [recoverySecret, setRecoverySecret] = useState("");
  const [showRecoverySecret, setShowRecoverySecret] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFirstAccessUrl("");

    if (!email.trim() || !password.trim()) {
      setError("Informe o email e a senha para entrar.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember })
      });
      const payload = await readJsonResponse<{
        error?: string;
        passwordChangeRequired?: boolean;
        passwordChangeUrl?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel entrar.");
      }

      if (payload.passwordChangeRequired) {
        window.location.href = payload.passwordChangeUrl || "/criar-senha";
        return;
      }

      window.location.href = "/dashboard";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function prepareSuperAdmin() {
    setError("");
    setFirstAccessUrl("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/bootstrap", { method: "POST" });
      const payload = await readJsonResponse<{
        error?: string;
        inviteUrl?: string;
        emailSent?: boolean;
        user?: {
          firstAccessRequired?: boolean;
          passwordReady?: boolean;
        };
      }>(response);

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel preparar o superadmin.");
      }

      if (payload.inviteUrl) {
        setFirstAccessUrl(payload.inviteUrl);
        setError(
          payload.emailSent
            ? "Link de primeiro acesso enviado por email. Voce tambem pode abrir pelo botao abaixo."
            : "Link de primeiro acesso gerado. Abra pelo botao abaixo para criar sua senha."
        );
        return;
      }

      setError(
        payload.user?.passwordReady
          ? "Superadmin ja possui senha criada. Use email e senha para entrar."
          : "Superadmin preparado. Tente entrar com a senha temporaria para criar a senha definitiva."
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel preparar o superadmin.");
    } finally {
      setLoading(false);
    }
  }

  async function recoverSuperAdmin() {
    setError("");
    setFirstAccessUrl("");

    if (!email.trim()) {
      setError("Informe o email do Superadmin para recuperar o acesso.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/recover-superadmin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, recoverySecret: recoverySecret || undefined })
      });
      const payload = await readJsonResponse<{
        error?: string;
        message?: string;
        inviteUrl?: string;
        emailSent?: boolean;
      }>(response);

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel recuperar o acesso.");
      }

      if (payload.inviteUrl) {
        setFirstAccessUrl(payload.inviteUrl);
      }

      setError(payload.message || "Recuperacao solicitada.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel recuperar o acesso.");
    } finally {
      setLoading(false);
    }
  }

  async function requestPasswordReset() {
    setError("");
    setFirstAccessUrl("");

    if (!email.trim()) {
      setError("Informe seu email para recuperar a senha.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const payload = await readJsonResponse<{
        error?: string;
        message?: string;
        resetUrl?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel solicitar recuperacao.");
      }

      if (payload.resetUrl) {
        setFirstAccessUrl(payload.resetUrl);
      }

      setError(payload.message || "Se este email estiver cadastrado, enviaremos um link de recuperacao.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel solicitar recuperacao.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-7" onSubmit={submit}>
      <label className="block">
        <span className="mb-3 block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Email
        </span>
        <span className="flex h-14 items-center gap-4 rounded-[18px] border border-border bg-input/55 px-4 transition focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10">
          <Mail className="size-5 shrink-0 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-foreground outline-none"
            aria-label="Email"
            required
          />
        </span>
      </label>

      <label className="block">
        <span className="mb-3 block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Senha
        </span>
        <span className="flex h-14 items-center gap-4 rounded-[18px] border border-border bg-input/55 px-4 transition focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10">
          <LockKeyhole className="size-5 shrink-0 text-muted-foreground" />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-foreground outline-none"
            aria-label="Senha"
            required
          />
        </span>
      </label>

      <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="size-4 rounded border-border accent-primary"
            aria-label="Manter conectado"
          />
          <span>Manter conectado</span>
        </label>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className="font-semibold text-primary" onClick={requestPasswordReset}>
            Esqueci minha senha
          </button>
          <button type="button" className="font-semibold text-primary" onClick={prepareSuperAdmin}>
            Criar acesso inicial
          </button>
          <button type="button" className="font-semibold text-primary" onClick={recoverSuperAdmin}>
            Recuperar acesso
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          className="text-xs font-bold text-muted-foreground transition hover:text-primary"
          onClick={() => setShowRecoverySecret((current) => !current)}
        >
          {showRecoverySecret ? "Ocultar codigo de recuperacao" : "Tenho codigo de recuperacao"}
        </button>
        {showRecoverySecret ? (
          <span className="flex h-11 items-center rounded-[16px] border border-border bg-input/45 px-4 transition focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10">
            <input
              type="password"
              value={recoverySecret}
              onChange={(event) => setRecoverySecret(event.target.value)}
              placeholder="Codigo configurado em AUTH_RECOVERY_SECRET"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none"
              aria-label="Codigo de recuperacao"
            />
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold leading-6 text-primary">
          <p>{error}</p>
          {firstAccessUrl ? (
            <a
              href={firstAccessUrl}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-xs font-black uppercase tracking-[0.08em] text-primary-foreground transition hover:brightness-105"
            >
              Abrir link de senha
            </a>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="flex h-14 w-full items-center justify-center rounded-[20px] bg-primary px-5 text-base font-extrabold text-primary-foreground shadow-[0_18px_44px_oklch(0.86_0.17_95_/_0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Validando..." : "Entrar no painel"}
      </button>
    </form>
  );
}
