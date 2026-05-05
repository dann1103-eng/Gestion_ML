import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TipoMovimiento } from "@prisma/client";
import { PresupuestosEditor } from "@/components/resumen/PresupuestosEditor";

export const dynamic = "force-dynamic";

export default async function PresupuestosPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;

  const now = new Date();
  const anio = sp.anio ? parseInt(sp.anio) : now.getUTCFullYear();
  const anios = Array.from({ length: 4 }, (_, i) => now.getUTCFullYear() - 1 + i);

  const [conceptos, presupuestos] = await Promise.all([
    prisma.concepto.findMany({
      where: { activo: true },
      orderBy: [{ tipo: "asc" }, { orden: "asc" }, { nombre: "asc" }],
    }),
    prisma.presupuesto.findMany({ where: { anio } }),
  ]);

  const presupMap = new Map(presupuestos.map((p) => [p.conceptoId, p]));

  const items = conceptos.map((c) => {
    const p = presupMap.get(c.id);
    return {
      conceptoId: c.id,
      conceptoNombre: c.nombre,
      tipo: c.tipo,
      montoMensual: p ? p.montoMensual.toString() : "0",
      notas: p?.notas ?? "",
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Presupuestos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Monto mensual presupuestado por concepto. Cambia el año para editar
          un periodo distinto.
        </p>
      </div>

      <form method="GET" className="flex gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Año
          </label>
          <select
            name="anio"
            defaultValue={String(anio)}
            className="border border-input rounded-md px-3 py-2 text-sm bg-background"
          >
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition"
        >
          Aplicar
        </button>
      </form>

      <PresupuestosEditor
        anio={anio}
        items={items}
        ingresos={items.filter((i) => i.tipo === TipoMovimiento.INGRESO)}
        egresos={items.filter((i) => i.tipo === TipoMovimiento.EGRESO)}
      />
    </div>
  );
}
