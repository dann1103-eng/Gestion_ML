import { FileText, Receipt, FileDown, FileSpreadsheet, TrendingUp, BarChart3 } from "lucide-react";
import { listarCuentas } from "@/server/actions/cuentas";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function ReportesPage() {
  const cuentas = await listarCuentas();
  const now = new Date();
  const anioActual = now.getUTCFullYear();
  const mesActual = now.getUTCMonth() + 1;
  const anios = [anioActual - 1, anioActual, anioActual + 1];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl font-semibold text-foreground tracking-tight">
          Reportes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Genera informes mensuales en PDF o CSV.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Caja Chica ──────────────────────────────────────────────── */}
        <Card className="p-8 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[hsl(var(--ring)/0.1)] mb-5">
            <FileText size={22} className="text-[hsl(var(--ring))]" strokeWidth={1.6} />
          </div>

          <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
            Caja Chica Mensual
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Reporte completo de movimientos del mes con totales agrupados por concepto y líneas de
            firma para AFCYD.
          </p>

          <FormReporte
            endpoint="/api/reportes/caja-chica"
            anios={anios}
            mesDefault={mesActual}
            anioDefault={anioActual}
            cuentas={cuentas}
          />
        </Card>

        {/* ── AFCYD ───────────────────────────────────────────────────── */}
        <Card className="p-8 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[hsl(var(--ring)/0.1)] mb-5">
            <Receipt size={22} className="text-[hsl(var(--ring))]" strokeWidth={1.6} />
          </div>

          <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
            Informe de Donantes AFCYD
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Listado mensual de ingresos con recibo fiscal — fecha, medio de pago, DUI, donante,
            monto, notas, correo. Formato fijo que AFCYD recibe.
          </p>

          <FormReporte
            endpoint="/api/reportes/afcyd"
            anios={anios}
            mesDefault={mesActual}
            anioDefault={anioActual}
          />
        </Card>

        {/* ── FE Mensual ──────────────────────────────────────────────── */}
        <Card className="p-8 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[hsl(var(--ring)/0.1)] mb-5">
            <TrendingUp size={22} className="text-[hsl(var(--ring))]" strokeWidth={1.6} />
          </div>

          <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
            Reporte FE Mensual
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Cobranza del mes por empresa (esperado vs recibido) y listado de sesiones realizadas y programadas.
          </p>

          <FormReporte
            endpoint="/api/reportes/fe-mensual"
            anios={anios}
            mesDefault={mesActual}
            anioDefault={anioActual}
          />
        </Card>

        {/* ── Resumen Anual ───────────────────────────────────────────────── */}
        <Card className="p-8 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[hsl(var(--ring)/0.1)] mb-5">
            <BarChart3 size={22} className="text-[hsl(var(--ring))]" strokeWidth={1.6} />
          </div>

          <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
            Resumen Anual
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Estado de resultados anual: todos los ingresos y egresos agrupados por concepto, balance neto. Útil para el informe anual de AFCYD.
          </p>

          <form method="get" action="/api/reportes/anual" className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1.5 block">
                Año
              </label>
              <select
                name="anio"
                defaultValue={anioActual}
                className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              >
                {anios.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3">
              <button
                type="submit"
                name="formato"
                value="pdf"
                className="flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all"
              >
                <FileDown size={14} />
                Descargar PDF
              </button>
              <button
                type="submit"
                name="formato"
                value="csv"
                className="flex items-center justify-center gap-2 h-10 rounded-md border border-input bg-card text-foreground font-semibold text-sm hover:bg-[hsl(var(--accent))] transition-colors"
              >
                <FileSpreadsheet size={14} />
                Descargar CSV
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function FormReporte({
  endpoint,
  anios,
  mesDefault,
  anioDefault,
  cuentas,
}: {
  endpoint: string;
  anios: number[];
  mesDefault: number;
  anioDefault: number;
  cuentas?: { id: string; nombre: string }[];
}) {
  return (
    <form method="get" action={endpoint} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1.5 block">
            Año
          </label>
          <select
            name="anio"
            defaultValue={anioDefault}
            className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          >
            {anios.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1.5 block">
            Mes
          </label>
          <select
            name="mes"
            defaultValue={mesDefault}
            className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          >
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {cuentas ? (
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1.5 block">
            Cuenta (opcional)
          </label>
          <select
            name="cuentaId"
            defaultValue=""
            className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          >
            <option value="">Todas las cuentas</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 pt-3">
        <button
          type="submit"
          name="formato"
          value="pdf"
          className="flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all"
        >
          <FileDown size={14} />
          Descargar PDF
        </button>
        <button
          type="submit"
          name="formato"
          value="csv"
          className="flex items-center justify-center gap-2 h-10 rounded-md border border-input bg-card text-foreground font-semibold text-sm hover:bg-[hsl(var(--accent))] transition-colors"
        >
          <FileSpreadsheet size={14} />
          Descargar CSV
        </button>
      </div>
    </form>
  );
}
