import type { ResumenCobranza, EstadoCuota } from "@/lib/convenios/cobranza";
import { Badge } from "@/components/ui/badge";

const ESTADO_BADGE: Record<EstadoCuota, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  AL_DIA: { label: "Al día", variant: "success" },
  PARCIAL: { label: "Parcial", variant: "warning" },
  PENDIENTE: { label: "Pendiente", variant: "secondary" },
  VENCIDO: { label: "Vencido", variant: "destructive" },
};

function fmt(n: number): string {
  return `$ ${n.toFixed(2)}`;
}

export function CobranzaTable({ resumen }: { resumen: ResumenCobranza }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b border-border">
          <tr className="text-left">
            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Mes
            </th>
            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
              Esperado
            </th>
            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
              Recibido
            </th>
            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
              Diferencia
            </th>
            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Estado
            </th>
          </tr>
        </thead>
        <tbody>
          {resumen.cuotas.map((c, i) => {
            const meta = ESTADO_BADGE[c.estado];
            return (
              <tr key={i} className="border-b border-border hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{c.etiqueta}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(c.esperado)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(c.recibido)}</td>
                <td
                  className={`px-3 py-2 text-right tabular-nums ${c.diferencia < 0 ? "text-destructive" : c.diferencia > 0 ? "text-[hsl(var(--income))]" : "text-muted-foreground"}`}
                >
                  {c.diferencia >= 0 ? "+" : ""}
                  {fmt(c.diferencia)}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-muted/40 font-semibold">
            <td className="px-3 py-2">Totales</td>
            <td className="px-3 py-2 text-right tabular-nums">{fmt(resumen.totalEsperado)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{fmt(resumen.totalRecibido)}</td>
            <td className="px-3 py-2 text-right tabular-nums text-destructive">
              {resumen.totalPendiente > 0 ? `-${fmt(resumen.totalPendiente)}` : fmt(0)}
            </td>
            <td className="px-3 py-2 text-xs text-muted-foreground">
              {Math.round((resumen.totalRecibido / resumen.totalEsperado) * 100) || 0}% cobrado
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
