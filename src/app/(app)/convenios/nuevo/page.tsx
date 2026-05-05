import { prisma } from "@/lib/prisma";
import { ConvenioForm } from "@/components/forms/ConvenioForm";
import { crearConvenio } from "@/server/actions/convenios";

export const dynamic = "force-dynamic";

export default async function NuevoConvenioPage() {
  const [empresas, planes] = await Promise.all([
    prisma.donante.findMany({
      where: { tipo: "EMPRESA_FE", estado: "ACTIVO" },
      include: { empresaDetalle: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.plan.findMany({
      where: { vigente: true },
      orderBy: { precio: "desc" },
    }),
  ]);

  async function onSubmit(formData: FormData) {
    "use server";
    const res = await crearConvenio(formData);
    if (res.ok) {
      return { ok: true, data: { id: res.data.id } };
    }
    return { ok: false, error: res.error, fieldErrors: res.fieldErrors };
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Nuevo convenio FE</h1>
        <p className="text-muted-foreground">
          Genera un nuevo convenio anual con una empresa de Formación Empresarial.
        </p>
      </header>

      <ConvenioForm
        empresas={empresas.map((e) => ({
          id: e.id,
          nombre: e.nombre,
          razonSocial: e.empresaDetalle?.razonSocial ?? null,
        }))}
        planes={planes.map((p) => ({
          id: p.id,
          tipo: p.tipo,
          precio: Number(p.precio),
          descuentoExtras: Number(p.descuentoExtras),
          cantidadConferencias: p.cantidadConferencias,
          horasCoaching: p.horasCoaching,
          vigente: p.vigente,
        }))}
        onSubmit={onSubmit}
        successUrl="/convenios/{id}"
        submitLabel="Crear convenio"
      />
    </div>
  );
}
