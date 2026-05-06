import { AlertTriangle, Banknote, CalendarDays, CircleAlert, UserMinus } from "lucide-react";
import type { Alerta } from "@/server/actions/dashboard";

type Props = { alertas: Alerta[] };

const ICONO = {
  "saldo-bajo": Banknote,
  "convenio-vence": AlertTriangle,
  "sesion-proxima": CalendarDays,
  "fe-atrasada": CircleAlert,
  "donante-atrasado": UserMinus,
};

export function AlertasWidget({ alertas }: Props) {
  return (
    <div className="bg-card border border-border border-l-2 border-l-[hsl(var(--ring))] rounded-lg p-6 flex flex-col shadow-[0_1px_3px_rgba(15,30,50,0.04)]">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Alertas
        </span>
        {alertas.length > 0 ? (
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded bg-[hsl(var(--ring))] text-primary-foreground text-[10px] font-bold tabular-nums">
            {alertas.length}
          </span>
        ) : null}
      </div>

      <div className="space-y-2.5 flex-1">
        {alertas.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Sin alertas. Todo en orden.</p>
        ) : (
          alertas.slice(0, 5).map((a, i) => {
            const Icon = ICONO[a.tipo];
            return (
              <div
                key={i}
                className={`flex gap-3 items-start p-2.5 rounded transition-colors ${
                  a.tipo === "fe-atrasada" || a.tipo === "donante-atrasado"
                    ? "bg-red-50 hover:bg-red-100"
                    : "hover:bg-[hsl(var(--accent))]"
                }`}
              >
                <Icon
                  size={14}
                  className={`shrink-0 mt-0.5 ${
                    a.tipo === "fe-atrasada" || a.tipo === "donante-atrasado"
                      ? "text-red-600"
                      : "text-[hsl(var(--ring))]"
                  }`}
                  strokeWidth={2}
                />
                <p className="text-xs text-foreground leading-relaxed flex-1">{a.mensaje}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
