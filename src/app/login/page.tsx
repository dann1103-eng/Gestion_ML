"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Tab = "password" | "magic";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("password");

  // Password login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pwPending, setPwPending] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Magic link state
  const [magicEmail, setMagicEmail] = useState("");
  const [magicStatus, setMagicStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [magicError, setMagicError] = useState<string | null>(null);

  async function onPasswordLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwPending(true);
    setPwError(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setPwPending(false);
      // Mensajes de error en español
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        setPwError("Email o contraseña incorrectos.");
      } else if (error.message.toLowerCase().includes("email not confirmed")) {
        setPwError("Tu email no ha sido confirmado. Usa el enlace mágico para verificarlo.");
      } else {
        setPwError(error.message);
      }
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function onMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMagicStatus("sending");
    setMagicError(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      setMagicStatus("idle");
      setMagicError(error.message);
    } else {
      setMagicStatus("sent");
    }
  }

  return (
    <main className="container mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-lg border bg-card p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Gestión ML</h1>
          <p className="mt-1 text-xs text-muted-foreground uppercase tracking-wider">
            Centro Cultural El Molino
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex border-b border-border">
          <button
            type="button"
            onClick={() => setTab("password")}
            className={`flex-1 pb-2.5 text-sm font-medium transition-colors ${
              tab === "password"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Con contraseña
          </button>
          <button
            type="button"
            onClick={() => setTab("magic")}
            className={`flex-1 pb-2.5 text-sm font-medium transition-colors ${
              tab === "magic"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Enlace mágico
          </button>
        </div>

        {/* Tab: Password */}
        {tab === "password" ? (
          <form onSubmit={onPasswordLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="tu@correo.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
              />
            </div>
            {pwError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {pwError}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={pwPending}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {pwPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              ¿Primera vez? Usa el <button type="button" onClick={() => setTab("magic")} className="text-primary hover:underline">enlace mágico</button> y luego configura tu contraseña en tu perfil.
            </p>
          </form>
        ) : null}

        {/* Tab: Magic link */}
        {tab === "magic" ? (
          magicStatus === "sent" ? (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              Te enviamos un enlace a <strong>{magicEmail}</strong>. Revisa tu bandeja
              (y spam) para iniciar sesión.
            </div>
          ) : (
            <form onSubmit={onMagicLink} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Recibirás un enlace en tu correo para entrar sin contraseña.
              </p>
              <div>
                <label htmlFor="magic-email" className="text-sm font-medium">
                  Correo electrónico
                </label>
                <input
                  id="magic-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={magicEmail}
                  onChange={(e) => setMagicEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="tu@correo.com"
                />
              </div>
              {magicError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {magicError}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={magicStatus === "sending"}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {magicStatus === "sending" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar enlace"
                )}
              </button>
            </form>
          )
        ) : null}
      </div>
    </main>
  );
}
