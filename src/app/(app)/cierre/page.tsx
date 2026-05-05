import { listarMesesConCierre } from "@/server/actions/cierre";
import { CierreMesActions } from "@/components/cierre/CierreMesActions";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const fmtFechaCorta = new Intl.DateTimeFormat("es-SV", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function CierreMesPage() {
  const meses = await listarMesesConCierre({ limite: 12 });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl font-semibold text-foreground tracking-tight">
          Cierre de mes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cierra ejercicios mensuales para llevar trazabilidad. El cierre es suave: aún podrás editar
          movimientos del mes pero verás una advertencia.
        </p>
      </header>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Mes
              </th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Estado
              </th>
              <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Movimientos
              </th>
              <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Ingresos
              </th>
              <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Egresos
              </th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Cerrado por
              </th>
              <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {meses.map((m) => {
              const cerrado = m.estado === "CERRADO";
              return (
                <tr key={`${m.anio}-${m.mes}`} className="hover:bg-[hsl(var(--accent)/0.5)] transition-colors">
                  <td className="px-5 py-4">
                    <span className={cn("font-semibold", cerrado ? "text-muted-foreground" : "text-foreground")}>
                      {MESES[m.mes - 1]} {m.anio}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        cerrado
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-[hsl(var(--ring)/0.15)] text-[hsl(var(--ring))] border border-[hsl(var(--ring)/0.3)]",
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          cerrado ? "bg-primary" : "bg-[hsl(var(--ring))]",
                        )}
                      />
                      {cerrado ? "Cerrado" : "Abierto"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums text-foreground">
                    {m.count}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums text-[hsl(var(--income))] font-semibold">
                    {m.ingresos > 0 ? formatMoney(m.ingresos) : "—"}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums text-[hsl(var(--expense))] font-semibold">
                    {m.egresos > 0 ? formatMoney(m.egresos) : "—"}
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">
                    {cerrado && m.cerradoPor ? (
                      <div>
                        <p className="text-foreground">{m.cerradoPor.email ?? "—"}</p>
                        {m.cerradoAt ? (
                          <p className="text-[10px]">{fmtFechaCorta.format(m.cerradoAt)}</p>
                        ) : null}
                      </div>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <CierreMesActions resumen={m} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
