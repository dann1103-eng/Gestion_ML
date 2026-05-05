import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { CambiarPasswordForm } from "@/components/auth/CambiarPasswordForm";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Mi perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cambia tu contraseña cuando lo necesites.
        </p>
      </header>

      <Card className="p-6">
        <div className="grid gap-3 text-sm">
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user.email ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID</span>
            <span className="font-mono text-xs text-muted-foreground">{user.id}</span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-1">Cambiar contraseña</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Mínimo 8 caracteres. Una vez guardada, la usarás para iniciar sesión.
        </p>
        <CambiarPasswordForm />
      </Card>
    </div>
  );
}
