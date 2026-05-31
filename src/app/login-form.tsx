"use client";

import { useState } from "react";
import { LockKeyhole, Mail } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("admin@autopro.ia");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember })
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel entrar.");
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
    setLoading(true);

    try {
      const response = await fetch("/api/auth/bootstrap", { method: "POST" });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel preparar o superadmin.");
      }

      setError("Superadmin preparado. Verifique o log do servidor ou o e-mail configurado para criar a senha.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel preparar o superadmin.");
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
        <button type="button" className="font-semibold text-primary" onClick={prepareSuperAdmin}>
          Criar acesso inicial
        </button>
      </div>

      {error ? (
        <p className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold leading-6 text-primary">
          {error}
        </p>
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
