import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Movimiento = {
  id: string;
  fecha: Date;
  tipo: "INGRESO" | "EGRESO";
  monto: { toString: () => string } | string | number;
  descripcion: string;
  concepto: { nombre: string };
  donante?: { nombre: string } | null;
};

type Props = { movimientos: Movimiento[] };

const fmtFecha = new Intl.DateTimeFormat("es-SV", {
  day: "2-digit",
  month: "short",
});

export function MovimientosRecientesWidget({ movimientos }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 flex flex-col shadow-[0_1px_3px_rgba(15,30,50,0.04)]">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Movimientos recientes
        </span>
        <Link
          href="/movimientos"
          className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ring))] hover:underline"
        >
          Ver todos →
        </Link>
      </div>

      <div className="space-y-3 flex-1">
        {movimientos.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Sin movimientos recientes.</p>
        ) : (
          movimientos.slice(0, 6).map((m) => {
            const esIngreso = m.tipo === "INGRESO";
            const monto = Number(m.monto);
            // Título principal: descripción (lo más informativo).
            // Si no hay descripción, usa donante o concepto como fallback.
            const titulo =
              (m.descripcion && m.descripcion.trim()) ||
              m.donante?.nombre ||
              m.concepto.nombre;
            // Subtítulo: concepto + donante (si ambos existen y no están en el título)
            const subtitulo = [
              m.concepto.nombre,
              m.donante?.nombre && m.donante.nombre !== titulo ? m.donante.nombre : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={m.id} className="flex items-center gap-3 group">
                <span
                  className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-full shrink-0",
                    esIngreso
                      ? "bg-[hsl(var(--income-bg))] text-[hsl(var(--income))]"
                      : "bg-[hsl(var(--expense-bg))] text-[hsl(var(--expense))]",
                  )}
                >
                  {esIngreso ? <ArrowDownLeft size={13} strokeWidth={2.4} /> : <ArrowUpRight size={13} strokeWidth={2.4} />}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate" title={titulo}>
                    {titulo}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate" title={subtitulo}>
                    {subtitulo}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {fmtFecha.format(m.fecha)}
                  </p>
                  <p
                    className={cn(
                      "text-xs font-bold tabular-nums",
                      esIngreso ? "text-[hsl(var(--income))]" : "text-foreground",
                    )}
                  >
                    {esIngreso ? "+" : "−"}
                    {formatMoney(monto)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
