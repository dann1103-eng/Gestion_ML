import { LucideIcon, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

type Props = {
  label: string;
  monto: number;
  icon: LucideIcon;
  variacion?: number | null;
  variacionLabel?: string;
  sub?: string;
};

export function KpiCard({ label, monto, icon: Icon, variacion, variacionLabel, sub }: Props) {
  const positivo = variacion != null && variacion > 0;
  const negativo = variacion != null && variacion < 0;

  return (
    <div className="bg-card border border-border rounded-lg p-6 flex flex-col gap-4 shadow-[0_1px_3px_rgba(15,30,50,0.04)] hover:shadow-[0_4px_12px_rgba(15,30,50,0.06)] transition-shadow">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </span>
        <span className="flex items-center justify-center w-9 h-9 rounded-md bg-[hsl(var(--ring)/0.1)]">
          <Icon size={16} className="text-[hsl(var(--ring))]" strokeWidth={1.8} />
        </span>
      </div>

      <div>
        <p className="font-serif text-3xl font-semibold text-foreground tabular-nums tracking-tight leading-none">
          {formatMoney(monto)}
        </p>

        {sub ? (
          <p className="text-xs text-muted-foreground mt-2">{sub}</p>
        ) : null}

        {variacion != null ? (
          <div className="flex items-center gap-2 mt-2">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums",
                positivo && "bg-[hsl(var(--income-bg))] text-[hsl(var(--income))]",
                negativo && "bg-[hsl(var(--expense-bg))] text-[hsl(var(--expense))]",
                variacion === 0 && "bg-muted text-muted-foreground",
              )}
            >
              {positivo ? <ArrowUp size={10} strokeWidth={2.6} /> : negativo ? <ArrowDown size={10} strokeWidth={2.6} /> : null}
              {variacion >= 0 ? "+" : ""}{variacion.toFixed(0)}%
            </span>
            {variacionLabel ? (
              <span className="text-[11px] text-muted-foreground">{variacionLabel}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
