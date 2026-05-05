import Link from "next/link";
import { Wallet, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { getDashboardData } from "@/server/actions/dashboard";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SaldosCuentaWidget } from "@/components/dashboard/SaldosCuentaWidget";
import { MovimientosRecientesWidget } from "@/components/dashboard/MovimientosRecientesWidget";
import { AlertasWidget } from "@/components/dashboard/AlertasWidget";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const anio = sp.anio ? Number(sp.anio) : undefined;
  const mes = sp.mes ? Number(sp.mes) : undefined;

  const data = await getDashboardData({ anio, mes });
  const labelMes = `${MESES[data.mes - 1]} ${data.anio}`;
  const labelMesAnterior = `vs ${MESES[(data.mes - 2 + 12) % 12].toLowerCase().slice(0, 3)}`;

  return (
    <div className="space-y-8">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Resumen financiero — <span className="text-foreground font-medium">{labelMes}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SelectorPeriodo anio={data.anio} mes={data.mes} />
          <Button asChild variant="outline">
            <Link href="/reportes" className="flex items-center gap-2">
              <FileText size={14} />
              Generar reporte
            </Link>
          </Button>
        </div>
      </header>

      {/* ── Grid 3×2 ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <KpiCard
          label="Saldo total"
          monto={data.saldoTotal}
          icon={Wallet}
          sub={`${data.cuentasActivas} ${data.cuentasActivas === 1 ? "cuenta activa" : "cuentas activas"}`}
        />

        <KpiCard
          label={`Ingresos — ${MESES[data.mes - 1]}`}
          monto={data.ingresosMes}
          icon={TrendingUp}
          variacion={data.variacionIngresos}
          variacionLabel={labelMesAnterior}
        />

        <KpiCard
          label={`Egresos — ${MESES[data.mes - 1]}`}
          monto={data.egresosMes}
          icon={TrendingDown}
          variacion={data.variacionEgresos}
          variacionLabel={labelMesAnterior}
        />

        <SaldosCuentaWidget cuentas={data.cuentasConSaldo} saldoTotal={data.saldoTotal} />

        <MovimientosRecientesWidget movimientos={data.movimientosRecientes} />

        <AlertasWidget alertas={data.alertas} />
      </div>
    </div>
  );
}

// ── Selector de mes/año (form GET inline) ────────────────────────────────
function SelectorPeriodo({ anio, mes }: { anio: number; mes: number }) {
  const aniosDisponibles = [anio - 1, anio, anio + 1];
  return (
    <form method="get" className="flex items-center gap-2">
      <select
        name="mes"
        defaultValue={mes}
        className="h-9 rounded-md border border-input bg-card px-3 text-xs font-medium uppercase tracking-wider text-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
      >
        {MESES.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        name="anio"
        defaultValue={anio}
        className="h-9 rounded-md border border-input bg-card px-3 text-xs font-medium tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
      >
        {aniosDisponibles.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
      <button
        type="submit"
        className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ring))] hover:underline px-2"
      >
        Aplicar
      </button>
    </form>
  );
}
