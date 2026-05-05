import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { obtenerMovimientosConciliacion } from "@/lib/conciliacion/queries";
import { ConciliacionTable } from "@/components/conciliacion/ConciliacionTable";

export const dynamic = "force-dynamic";

export default async function ConciliacionPage({
  searchParams,
}: {
  searchParams: Promise<{ cuentaId?: string; anio?: string; mes?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;

  const now = new Date();
  const anio = sp.anio ? parseInt(sp.anio) : now.getUTCFullYear();
  const mes = sp.mes ? parseInt(sp.mes) : now.getUTCMonth() + 1;

  const cuentas = await prisma.cuenta.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });

  const cuentaId = sp.cuentaId ?? cuentas[0]?.id ?? "";
  const cuentaActual = cuentas.find((c) => c.id === cuentaId);

  const movimientos = cuentaId
    ? await obtenerMovimientosConciliacion(cuentaId, anio, mes)
    : [];

  const anioActual = now.getUTCFullYear();
  const anios = Array.from({ length: 4 }, (_, i) => anioActual - 1 + i);

  const MESES = [
    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Conciliación bancaria</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Marca los movimientos que confirmaste en el estado de cuenta del banco
        </p>
      </div>

      <form method="GET" className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Cuenta</label>
          <select
            name="cuentaId"
            defaultValue={cuentaId}
            className="border border-input rounded-md px-3 py-2 text-sm bg-background"
          >
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Mes</label>
          <select
            name="mes"
            defaultValue={String(mes)}
            className="border border-input rounded-md px-3 py-2 text-sm bg-background"
          >
            {MESES.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Año</label>
          <select
            name="anio"
            defaultValue={String(anio)}
            className="border border-input rounded-md px-3 py-2 text-sm bg-background"
          >
            {anios.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition"
        >
          Filtrar
        </button>
      </form>

      {cuentaActual && (
        <p className="text-sm text-muted-foreground">
          {cuentaActual.nombre} · {MESES[mes]} {anio}
        </p>
      )}

      <ConciliacionTable movimientos={movimientos} />
    </div>
  );
}
