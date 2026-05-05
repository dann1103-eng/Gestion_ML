"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="container mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Recibirás un enlace mágico en tu correo para entrar.
        </p>

        {status === "sent" ? (
          <div className="mt-6 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Te enviamos un enlace a <strong>{email}</strong>. Revisa tu bandeja
            (y spam) para iniciar sesión.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="tu@correo.com"
              />
            </div>
            {errorMsg ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {errorMsg}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {status === "sending" ? "Enviando..." : "Enviar enlace mágico"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
