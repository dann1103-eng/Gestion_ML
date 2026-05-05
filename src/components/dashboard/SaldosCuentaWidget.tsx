import Link from "next/link";
import { Wallet } from "lucide-react";
import { formatMoney } from "@/lib/money";

type Cuenta = {
  id: string;
  nombre: string;
  saldo: number;
};

type Props = { cuentas: Cuenta[]; saldoTotal: number };

export function SaldosCuentaWidget({ cuentas, saldoTotal }: Props) {
  // Para las barras: proporción relativa al saldo más alto (no al total, da mejor visual)
  const max = Math.max(...cuentas.map((c) => Math.abs(c.saldo)), 1);

  return (
    <div className="bg-card border border-border rounded-lg p-6 flex flex-col shadow-[0_1px_3px_rgba(15,30,50,0.04)]">
      <div className="flex items-center justify-between mb-5">
        <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          <Wallet size={12} className="text-[hsl(var(--ring))]" />
          Saldos por cuenta
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {cuentas.length} {cuentas.length === 1 ? "cuenta" : "cuentas"}
        </span>
      </div>

      <div className="space-y-4 flex-1">
        {cuentas.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Sin cuentas activas.</p>
        ) : (
          cuentas.map((c) => {
            const pct = (Math.abs(c.saldo) / max) * 100;
            return (
              <div key={c.id}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-sm font-medium text-foreground truncate pr-3">{c.nombre}</span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatMoney(c.saldo)}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(var(--ring))]"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <Link
        href="/cuentas"
        className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ring))] hover:underline mt-5"
      >
        Ver todas →
      </Link>
    </div>
  );
}
