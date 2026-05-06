import { requireUser } from "@/lib/auth";
import { TipoDonante } from "@prisma/client";
import { getControl } from "@/lib/control/queries";
import { ControlMatriz } from "@/components/control/ControlMatriz";

export const dynamic = "force-dynamic";

export default async function ControlClubPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const now = new Date();
  const anio = sp.anio ? parseInt(sp.anio) : now.getUTCFullYear();
  const anios = Array.from({ length: 4 }, (_, i) => now.getUTCFullYear() - 1 + i);

  const data = await getControl({
    anio,
    tipos: [TipoDonante.OCASIONAL],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Control Club</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Mensualidades de socios del Club (donantes ocasionales). Define el
          aporte mensual esperado en cada perfil para activar la validación de
          cumplimiento.
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

      <ControlMatriz
        titulo="Mensualidades Club"
        modo="ingreso"
        filas={data.filas.map((f) => ({
          donanteId: f.donanteId,
          nombre: f.nombre,
          aporteEsperado: f.aporteEsperado?.toString() ?? null,
          mensual: f.ingresoMes.map((d) => d.toString()),
          total: f.totalIngreso.toString(),
        }))}
        totalesMensual={data.totales.ingresoMes.map((d) => d.toString())}
        totalGeneral={data.totales.totalIngreso.toString()}
      />
    </div>
  );
}
