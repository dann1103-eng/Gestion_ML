"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { SerResumenData, SerConceptoFila } from "@/lib/resumen/serialize";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const COLORS = {
  ingreso: "#1E5C2E",
  egreso: "#B14040",
  saldo: "#1A3550",
  oro: "#F0AA1C",
  verde: "#1E5C2E",
  amarillo: "#F0AA1C",
  rojo: "#B14040",
};

const PIE_COLORS = [
  "#1A3550",
  "#F0AA1C",
  "#1E5C2E",
  "#B14040",
  "#5B7090",
  "#C8841A",
  "#3F8048",
  "#7A4040",
  "#8898B0",
  "#E8C470",
  "#5FAE6B",
  "#D87878",
];

const fmt = (v: number) =>
  v.toLocaleString("es-SV", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtTip = (v: number) =>
  v.toLocaleString("es-SV", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

function ChartCard({ title, children, full }: { title: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`rounded-lg border bg-card p-4 ${full ? "lg:col-span-2" : ""}`}>
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

export function ResumenCharts({ data }: { data: SerResumenData }) {
  const seriesTendencia = MESES.map((m, i) => ({
    mes: m,
    Ingresos: Number(data.totales.ingresos.mensual[i]),
    Egresos: Number(data.totales.egresos.mensual[i]),
  }));

  const seriesSaldo = MESES.map((m, i) => ({
    mes: m,
    Saldo: Number(data.saldos.saldoMesProximo[i]),
  }));

  // Real vs Presupuesto Acumulado: hasta mesActivo
  const ingPresupMensual = Number(data.totales.ingresos.presupuestoMensual);
  const egrPresupMensual = Number(data.totales.egresos.presupuestoMensual);
  const seriesRealVsPresup = MESES.slice(0, data.mesActivo).map((m, i) => {
    const realIng = data.totales.ingresos.mensual.slice(0, i + 1).reduce((a, b) => a + Number(b), 0);
    const realEgr = data.totales.egresos.mensual.slice(0, i + 1).reduce((a, b) => a + Number(b), 0);
    return {
      mes: m,
      "Ingresos real": realIng,
      "Ingresos presup.": ingPresupMensual * (i + 1),
      "Egresos real": realEgr,
      "Egresos presup.": egrPresupMensual * (i + 1),
    };
  });

  // Composición del mes activo (top + Otros)
  const composicion = (filas: SerConceptoFila[]) => {
    const items = filas
      .map((f) => ({ nombre: f.nombre, valor: Number(f.realMensual) }))
      .filter((x) => x.valor > 0)
      .sort((a, b) => b.valor - a.valor);
    if (items.length <= 6) return items;
    const top = items.slice(0, 5);
    const otros = items.slice(5).reduce((a, b) => a + b.valor, 0);
    return [...top, { nombre: "Otros", valor: otros }];
  };
  const compIng = composicion(data.ingresos);
  const compEgr = composicion(data.egresos);

  // Cumplimiento por concepto (% real acum / presup acum)
  const cumplimiento = (filas: SerConceptoFila[]) =>
    filas
      .map((f) => ({
        nombre: f.nombre,
        pct: f.pctAcum != null ? Math.round(f.pctAcum * 100) : 0,
        presupuesto: Number(f.presupuestoAcumulado),
      }))
      .filter((x) => x.presupuesto > 0)
      .sort((a, b) => b.pct - a.pct);

  const [tabRvP, setTabRvP] = useState<"INGRESOS" | "EGRESOS">("INGRESOS");
  const [tabCump, setTabCump] = useState<"INGRESOS" | "EGRESOS">("INGRESOS");

  const colorBar = (pct: number, esIngreso: boolean) => {
    if (esIngreso) {
      if (pct >= 95) return COLORS.verde;
      if (pct >= 70) return COLORS.amarillo;
      return COLORS.rojo;
    }
    if (pct > 100) return COLORS.rojo;
    if (pct >= 95) return COLORS.amarillo;
    return COLORS.verde;
  };

  const cumpData = (tabCump === "INGRESOS" ? cumplimiento(data.ingresos) : cumplimiento(data.egresos)).map(
    (x) => ({ ...x, fill: colorBar(x.pct, tabCump === "INGRESOS") }),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Tendencia mensual: Ingresos vs Egresos" full>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={seriesTendencia}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="mes" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={fmt} />
            <Tooltip formatter={(v) => fmtTip(Number(v))} />
            <Legend />
            <Line type="monotone" dataKey="Ingresos" stroke={COLORS.ingreso} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Egresos" stroke={COLORS.egreso} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Saldo mensual (acumulado al cierre del mes)" full>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={seriesSaldo}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="mes" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={fmt} />
            <Tooltip formatter={(v) => fmtTip(Number(v))} />
            <ReferenceLine y={0} stroke={COLORS.oro} strokeDasharray="4 4" />
            <Area type="monotone" dataKey="Saldo" stroke={COLORS.saldo} fill={COLORS.saldo} fillOpacity={0.18} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Real vs Presupuesto acumulado" full>
        <div className="flex gap-2 mb-2">
          {(["INGRESOS", "EGRESOS"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTabRvP(t)}
              className={`text-xs px-3 py-1 rounded ${tabRvP === t ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={seriesRealVsPresup}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="mes" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={fmt} />
            <Tooltip formatter={(v) => fmtTip(Number(v))} />
            <Legend />
            {tabRvP === "INGRESOS" ? (
              <>
                <Line type="monotone" dataKey="Ingresos real" stroke={COLORS.ingreso} strokeWidth={2.5} />
                <Line type="monotone" dataKey="Ingresos presup." stroke={COLORS.ingreso} strokeDasharray="5 5" strokeWidth={1.5} />
              </>
            ) : (
              <>
                <Line type="monotone" dataKey="Egresos real" stroke={COLORS.egreso} strokeWidth={2.5} />
                <Line type="monotone" dataKey="Egresos presup." stroke={COLORS.egreso} strokeDasharray="5 5" strokeWidth={1.5} />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={`Composición de ingresos — ${MESES[data.mesActivo - 1]}`}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={compIng} dataKey="valor" nameKey="nombre" innerRadius={50} outerRadius={90} paddingAngle={2}>
              {compIng.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => fmtTip(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={`Composición de egresos — ${MESES[data.mesActivo - 1]}`}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={compEgr} dataKey="valor" nameKey="nombre" innerRadius={50} outerRadius={90} paddingAngle={2}>
              {compEgr.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => fmtTip(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Cumplimiento por concepto (acumulado)" full>
        <div className="flex gap-2 mb-2">
          {(["INGRESOS", "EGRESOS"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTabCump(t)}
              className={`text-xs px-3 py-1 rounded ${tabCump === t ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={Math.max(280, cumpData.length * 28)}>
          <BarChart data={cumpData} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" fontSize={11} tickFormatter={(v) => `${v}%`} />
            <YAxis dataKey="nombre" type="category" fontSize={11} width={140} />
            <Tooltip formatter={(v) => `${Number(v)}%`} />
            <ReferenceLine x={100} stroke={COLORS.oro} strokeDasharray="4 4" />
            <Bar dataKey="pct">
              {cumpData.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
