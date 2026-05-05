import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getResumen, NOMBRES_MESES } from "@/lib/resumen/queries";
import { serializeResumen } from "@/lib/resumen/serialize";
import { ResumenMatriz } from "@/components/resumen/ResumenMatriz";
import { NotasMensuales } from "@/components/resumen/NotasMensuales";
import { SaldoAnualEditor } from "@/components/resumen/SaldoAnualEditor";
import { ResumenCharts } from "@/components/resumen/charts/ResumenCharts";

export const dynamic = "force-dynamic";

export default async function ResumenPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;

  const now = new Date();
  const anio = sp.anio ? parseInt(sp.anio) : now.getUTCFullYear();
  const mesActivo = sp.mes ? parseInt(sp.mes) : now.getUTCMonth() + 1;

  const data = await getResumen({ anio, mesActivo });
  const ser = serializeResumen(data);

  const anioActual = now.getUTCFullYear();
  const anios = Array.from({ length: 4 }, (_, i) => anioActual - 1 + i);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Resumen</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ingresos vs presupuesto, egresos vs presupuesto y saldos —
            mes-a-mes y acumulado
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/resumen/pdf?anio=${anio}&mes=${mesActivo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition"
          >
            Exportar PDF
          </a>
          <a
            href={`/api/resumen/xlsx?anio=${anio}&mes=${mesActivo}`}
            className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition"
          >
            Exportar XLSX
          </a>
          <Link
            href="/presupuestos"
            className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition"
          >
            Editar presupuestos
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-b pb-4">
        <form method="GET" className="flex flex-wrap gap-3 items-end">
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
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Mes activo
            </label>
            <select
              name="mes"
              defaultValue={String(mesActivo)}
              className="border border-input rounded-md px-3 py-2 text-sm bg-background"
            >
              {NOMBRES_MESES.map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
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
        <div className="ml-auto">
          <SaldoAnualEditor anio={anio} saldoActual={ser.saldoAnualInicial} />
        </div>
      </div>

      <ResumenMatriz data={ser} />

      <div className="grid gap-6 lg:grid-cols-2">
        <NotasMensuales
          anio={anio}
          mes={mesActivo}
          seccion="INGRESOS"
          texto={ser.notas.ingresos}
        />
        <NotasMensuales
          anio={anio}
          mes={mesActivo}
          seccion="EGRESOS"
          texto={ser.notas.egresos}
        />
      </div>

      <ResumenCharts data={ser} />
    </div>
  );
}
