import { notFound } from "next/navigation";
import { obtenerDonante, actualizarDonante } from "@/server/actions/donantes";
import { DonanteForm } from "@/components/forms/DonanteForm";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { TipoDonante } from "@prisma/client";
import { calcularCobranza } from "@/lib/convenios/cobranza";

export const dynamic = "force-dynamic";

export default async function DonanteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const donante = await obtenerDonante(id);
  if (!donante) notFound();

  async function onSubmit(formData: FormData) {
    "use server";
    return actualizarDonante(id, formData);
  }

  // Query movements
  const movimientos = await prisma.movimiento.findMany({
    where: { donanteId: id, anulado: false },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    include: { concepto: true, cuenta: true },
    take: 200,
  });

  // Compute stats
  const totalIngresos = movimientos
    .filter((m) => m.tipo === "INGRESO")
    .reduce((s, m) => s + Number(m.monto), 0);
  const totalEgresos = movimientos
    .filter((m) => m.tipo === "EGRESO")
    .reduce((s, m) => s + Number(m.monto), 0);
  const primera = movimientos.at(-1)?.fecha;
  const ultima = movimientos.at(0)?.fecha;

  const fmtDate = new Intl.DateTimeFormat("es-SV", {
    dateStyle: "short",
    timeZone: "UTC",
  });

  // FE cobranza summary
  let cobranzaResumen: {
    totalEsperado: number;
    totalRecibido: number;
    mesesAtrasados: number;
  } | null = null;

  if (donante.tipo === TipoDonante.EMPRESA_FE) {
    const convenioActivo = await prisma.convenio.findFirst({
      where: {
        donanteId: id,
        fechaFin: { gte: new Date() },
      },
      include: { plan: true },
      orderBy: { fechaFin: "desc" },
    });

    if (convenioActivo) {
      const movimientosIngreso = movimientos.filter(
        (m) => m.tipo === "INGRESO"
      );

      const resumen = calcularCobranza({
        fechaInicio: convenioActivo.fechaInicio,
        fechaFin: convenioActivo.fechaFin,
        precioMensual: Number(convenioActivo.plan.precio),
        movimientosIngreso,
      });

      cobranzaResumen = {
        totalEsperado: resumen.totalEsperado,
        totalRecibido: resumen.totalRecibido,
        mesesAtrasados: resumen.cuotas.filter((c) => c.estado === "VENCIDO")
          .length,
      };
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Editar donante</h1>
      <DonanteForm
        initial={donante}
        onSubmit={onSubmit}
        redirectTo="/donantes"
        submitLabel="Guardar cambios"
      />

      {/* Historial section — only show if there are movements */}
      {movimientos.length > 0 && (
        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Historial de movimientos</h2>

          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total ingresos
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-green-700">
                {formatMoney(totalIngresos)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total egresos
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-red-700">
                {formatMoney(totalEgresos)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Movimientos
              </p>
              <p className="mt-1 text-xl font-bold">{movimientos.length}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Período
              </p>
              <p className="mt-1 text-sm font-medium">
                {primera
                  ? `${fmtDate.format(primera)} – ${fmtDate.format(ultima!)}`
                  : "—"}
              </p>
            </div>
          </div>

          {/* FE cobranza summary (only for EMPRESA_FE with active convenio) */}
          {cobranzaResumen && (
            <div className="rounded-lg border bg-amber-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Cobranza FE — convenio activo
              </p>
              <div className="flex gap-6 text-sm">
                <span>
                  Esperado:{" "}
                  <strong className="tabular-nums">
                    {formatMoney(cobranzaResumen.totalEsperado)}
                  </strong>
                </span>
                <span>
                  Recibido:{" "}
                  <strong className="tabular-nums text-green-700">
                    {formatMoney(cobranzaResumen.totalRecibido)}
                  </strong>
                </span>
                <span>
                  Pendiente:{" "}
                  <strong className="tabular-nums text-red-700">
                    {formatMoney(
                      cobranzaResumen.totalEsperado -
                        cobranzaResumen.totalRecibido
                    )}
                  </strong>
                </span>
                {cobranzaResumen.mesesAtrasados > 0 && (
                  <span className="text-red-600 font-medium">
                    ⚠ {cobranzaResumen.mesesAtrasados} mes(es) atrasado(s)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Movements table */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Fecha</th>
                  <th className="px-4 py-2 text-left font-medium">Vale</th>
                  <th className="px-4 py-2 text-left font-medium">Concepto</th>
                  <th className="px-4 py-2 text-left font-medium">Cuenta</th>
                  <th className="px-4 py-2 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m, i) => (
                  <tr
                    key={m.id}
                    className={
                      i % 2 === 0 ? "bg-background" : "bg-muted/20"
                    }
                  >
                    <td className="px-4 py-2 tabular-nums">
                      {fmtDate.format(m.fecha)}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {m.valeNumero}
                    </td>
                    <td className="px-4 py-2">{m.concepto.nombre}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {m.cuenta.nombre}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-semibold tabular-nums ${
                        m.tipo === "INGRESO"
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {m.tipo === "INGRESO" ? "+" : "−"}
                      {formatMoney(m.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {movimientos.length === 200 && (
            <p className="text-xs text-muted-foreground text-right">
              Mostrando los últimos 200 movimientos
            </p>
          )}
        </section>
      )}
    </div>
  );
}
