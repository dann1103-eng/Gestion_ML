import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerConvenio, actualizarConvenio } from "@/server/actions/convenios";
import { ConvenioForm } from "@/components/forms/ConvenioForm";

export const dynamic = "force-dynamic";

export default async function EditarConvenioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [conv, empresas, planes] = await Promise.all([
    obtenerConvenio(id),
    prisma.donante.findMany({
      where: { tipo: "EMPRESA_FE", estado: "ACTIVO" },
      include: { empresaDetalle: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.plan.findMany({ where: { vigente: true }, orderBy: { precio: "desc" } }),
  ]);

  if (!conv) notFound();

  async function onSubmit(formData: FormData) {
    "use server";
    const res = await actualizarConvenio(id, formData);
    return res.ok
      ? { ok: true, data: { id } }
      : { ok: false, error: res.error, fieldErrors: res.fieldErrors };
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Editar convenio</h1>
        <p className="text-muted-foreground">
          {conv.donante.empresaDetalle?.razonSocial ?? conv.donante.nombre}
        </p>
      </header>

      <ConvenioForm
        initial={{
          donanteId: conv.donanteId,
          planId: conv.planId,
          fechaFirma: conv.fechaFirma,
          fechaInicio: conv.fechaInicio,
          fechaFin: conv.fechaFin,
          montoTotal: String(conv.montoTotal),
          ciudadFirma: conv.ciudadFirma,
          notas: conv.notas,
        }}
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
        successUrl={`/convenios/${id}`}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
