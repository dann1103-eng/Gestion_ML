import Link from "next/link";
import { listarPlanillas } from "@/server/actions/planillas";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const MESES = [
  "","Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: "bg-yellow-100 text-yellow-700",
  APROBADA: "bg-blue-100 text-blue-700",
  PAGADA:   "bg-green-100 text-green-700",
};

export default async function PlanillasPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  const params = await searchParams;
  const anioFiltro = params.anio ? Number(params.anio) : undefined;
  const planillas = await listarPlanillas(anioFiltro);

  const anioActual = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Planillas</h1>
          <p className="text-muted-foreground">{planillas.length} planilla(s)</p>
        </div>
        <Button asChild>
          <Link href="/planillas/nueva">Nueva planilla</Link>
        </Button>
      </div>

      {/* Filtro año */}
      <div className="flex gap-2">
        {[anioActual - 1, anioActual, anioActual + 1].map((a) => (
          <Link
            key={a}
            href={`/planillas?anio=${a}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium border transition-colors ${
              anioFiltro === a
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-muted"
            }`}
          >
            {a}
          </Link>
        ))}
        {anioFiltro ? (
          <Link href="/planillas" className="rounded-md px-3 py-1.5 text-sm border border-border hover:bg-muted">
            Todas
          </Link>
        ) : null}
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Período</th>
              <th className="px-4 py-3 text-left font-medium">Fecha pago</th>
              <th className="px-4 py-3 text-right font-medium">Bruto</th>
              <th className="px-4 py-3 text-right font-medium">Descuentos</th>
              <th className="px-4 py-3 text-right font-medium">Neto</th>
              <th className="px-4 py-3 text-center font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {planillas.map((p) => (
              <tr key={p.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">
                  {p.quincena === 1 ? "1ª" : "2ª"} Quincena — {MESES[p.mes]} {p.anio}
                </td>
                <td className="px-4 py-3">
                  {new Intl.DateTimeFormat("es-SV", { dateStyle: "medium", timeZone: "UTC" }).format(p.fechaPago)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(p.totalBruto)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-destructive">{formatMoney(p.totalDescuentos)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{formatMoney(p.totalNeto)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[p.estado]}`}>
                    {p.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/planillas/${p.id}`} className="text-primary text-xs hover:underline">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
            {planillas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No hay planillas. Crea la primera con el botón de arriba.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
