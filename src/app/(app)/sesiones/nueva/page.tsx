import { redirect } from "next/navigation";
import { listarConvenios } from "@/server/actions/convenios";
import { listarConferencias } from "@/server/actions/conferencias";
import { crearSesion } from "@/server/actions/sesiones";
import { SesionForm } from "@/components/forms/SesionForm";

export const dynamic = "force-dynamic";

export default async function NuevaSesionPage() {
  const [convenios, conferencias] = await Promise.all([
    listarConvenios({ estado: "VIGENTE" }),
    listarConferencias({ activo: true }),
  ]);

  // Filtrar convenios anulados (no se les puede programar sesiones nuevas)
  const conveniosOpciones = convenios
    .filter((c) => !c.anulado)
    .map((c) => ({
      id: c.id,
      empresaNombre: c.donante.empresaDetalle?.razonSocial ?? c.donante.nombre,
    }));

  async function onSubmit(formData: FormData) {
    "use server";
    const res = await crearSesion(formData);
    if (res.ok) {
      redirect("/sesiones");
    }
    return res.ok
      ? { ok: true }
      : { ok: false, error: res.error, fieldErrors: res.fieldErrors };
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          Programar sesión
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Selecciona un convenio activo y la conferencia a impartir.
        </p>
      </header>

      {conveniosOpciones.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No hay convenios vigentes activos. Crea o renueva un convenio antes de programar sesiones.
        </div>
      ) : (
        <SesionForm
          convenios={conveniosOpciones}
          conferencias={conferencias}
          onSubmit={onSubmit}
          submitLabel="Programar sesión"
        />
      )}
    </div>
  );
}
