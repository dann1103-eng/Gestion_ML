"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { upsertPresupuesto } from "@/server/actions/resumen";
import type {
  SerResumenData,
  SerConceptoFila,
  SerTotalFila,
} from "@/lib/resumen/serialize";

const NOMBRES_MESES_CORTOS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function fmt(v: string | number): string {
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-SV", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function pctText(p: number | null): string {
  if (p == null) return "—";
  return (p * 100).toFixed(1) + "%";
}

function pctClass(p: number | null, esIngreso: boolean): string {
  if (p == null) return "text-muted-foreground";
  if (esIngreso) {
    if (p >= 0.95) return "text-green-700 font-medium";
    if (p >= 0.7) return "text-amber-600 font-medium";
    return "text-red-700 font-medium";
  }
  if (p > 1.0) return "text-red-700 font-medium";
  if (p >= 0.95) return "text-amber-600 font-medium";
  return "text-green-700 font-medium";
}

function PresupuestoCell({
  conceptoId,
  anio,
  valor,
  notas,
}: {
  conceptoId: string;
  anio: number;
  valor: string;
  notas: string | null;
}) {
  const [val, setVal] = useState(valor);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const save = () => {
    if (val === valor) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const r = await upsertPresupuesto({
        conceptoId,
        anio,
        montoMensual: val || "0",
        notas: notas ?? "",
      });
      if (!r.ok) {
        alert(r.error);
        setVal(valor);
      } else {
        router.refresh();
      }
      setEditing(false);
    });
  };

  if (editing) {
    return (
      <input
        type="text"
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setVal(valor);
            setEditing(false);
          }
        }}
        disabled={pending}
        className="w-24 px-1 py-0.5 border border-primary rounded text-right text-sm"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title={notas ?? "Click para editar"}
      className="w-full text-right hover:bg-accent/50 px-1 rounded transition"
    >
      {fmt(valor)}
    </button>
  );
}

function FilaConcepto({
  fila,
  anio,
  mesActivo,
  esIngreso,
  numero,
}: {
  fila: SerConceptoFila;
  anio: number;
  mesActivo: number;
  esIngreso: boolean;
  numero: number;
}) {
  const tipoQuery = esIngreso ? "INGRESO" : "EGRESO";
  return (
    <tr className="border-b hover:bg-muted/40">
      <td className="px-2 py-1.5 text-xs text-muted-foreground text-center">
        {numero}
      </td>
      <td className="px-2 py-1.5 text-sm font-medium sticky left-0 bg-background">
        {fila.nombre}
      </td>
      <td className="px-2 py-1.5 text-right text-sm tabular-nums">
        <Link
          href={`/movimientos?anio=${anio}&mes=${mesActivo}&conceptoId=${fila.conceptoId}&tipo=${tipoQuery}`}
          className="hover:underline"
        >
          {fmt(fila.realMensual)}
        </Link>
      </td>
      <td className="px-2 py-1.5 text-right text-sm tabular-nums">
        <PresupuestoCell
          conceptoId={fila.conceptoId}
          anio={anio}
          valor={fila.presupuestoMensual}
          notas={fila.notasPresupuesto}
        />
      </td>
      <td className={`px-2 py-1.5 text-right text-xs tabular-nums ${pctClass(fila.pctMes, esIngreso)}`}>
        {pctText(fila.pctMes)}
      </td>
      <td className="px-2 py-1.5 text-right text-sm tabular-nums">
        {fmt(fila.realAcumulado)}
      </td>
      <td className="px-2 py-1.5 text-right text-sm tabular-nums">
        {fmt(fila.presupuestoAcumulado)}
      </td>
      <td className={`px-2 py-1.5 text-right text-xs tabular-nums ${pctClass(fila.pctAcum, esIngreso)}`}>
        {pctText(fila.pctAcum)}
      </td>
      {fila.mensual.map((m, i) => (
        <td
          key={i}
          className={`px-2 py-1.5 text-right text-xs tabular-nums ${
            i === mesActivo - 1 ? "bg-amber-50" : ""
          } ${Number(m) === 0 ? "text-muted-foreground/50" : ""}`}
        >
          {Number(m) === 0 ? (
            "—"
          ) : (
            <Link
              href={`/movimientos?anio=${anio}&mes=${i + 1}&conceptoId=${fila.conceptoId}&tipo=${tipoQuery}`}
              className="hover:underline"
              title={`Ver movimientos de ${fila.nombre} en ${i + 1}/${anio}`}
            >
              {fmt(m)}
            </Link>
          )}
        </td>
      ))}
    </tr>
  );
}

function FilaTotal({
  total,
  esIngreso,
  mesActivo,
}: {
  total: SerTotalFila;
  esIngreso: boolean;
  mesActivo: number;
}) {
  return (
    <tr className="border-t-2 border-foreground/20 bg-primary/10 font-semibold">
      <td className="px-2 py-2 text-xs text-center"></td>
      <td className="px-2 py-2 text-sm sticky left-0 bg-primary/10">TOTAL</td>
      <td className="px-2 py-2 text-right text-sm tabular-nums">
        {fmt(total.realMensual)}
      </td>
      <td className="px-2 py-2 text-right text-sm tabular-nums">
        {fmt(total.presupuestoMensual)}
      </td>
      <td className={`px-2 py-2 text-right text-xs tabular-nums ${pctClass(total.pctMes, esIngreso)}`}>
        {pctText(total.pctMes)}
      </td>
      <td className="px-2 py-2 text-right text-sm tabular-nums">
        {fmt(total.realAcumulado)}
      </td>
      <td className="px-2 py-2 text-right text-sm tabular-nums">
        {fmt(total.presupuestoAcumulado)}
      </td>
      <td className={`px-2 py-2 text-right text-xs tabular-nums ${pctClass(total.pctAcum, esIngreso)}`}>
        {pctText(total.pctAcum)}
      </td>
      {total.mensual.map((m, i) => (
        <td
          key={i}
          className={`px-2 py-2 text-right text-xs tabular-nums ${
            i === mesActivo - 1 ? "bg-amber-100" : ""
          }`}
        >
          {Number(m) === 0 ? "—" : fmt(m)}
        </td>
      ))}
    </tr>
  );
}

export function ResumenMatriz({ data }: { data: SerResumenData }) {
  const { anio, mesActivo } = data;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-primary text-primary-foreground sticky top-0">
            <th colSpan={2} className="px-3 py-2 text-left text-xs uppercase tracking-wide font-bold">
              I — Ingresos
            </th>
            <th colSpan={4} className="px-3 py-2 text-center text-xs uppercase font-medium border-l border-primary-foreground/20">
              Mes
            </th>
            <th colSpan={2} className="px-3 py-2 text-center text-xs uppercase font-medium border-l border-primary-foreground/20">
              Acumulado
            </th>
            <th colSpan={12} className="px-3 py-2 text-center text-xs uppercase font-medium border-l border-primary-foreground/20">
              Desglose anual
            </th>
          </tr>
          <tr className="bg-muted/60 text-xs">
            <th className="px-2 py-1.5 w-8 text-center">#</th>
            <th className="px-2 py-1.5 text-left">Concepto</th>
            <th className="px-2 py-1.5 text-right">Real</th>
            <th className="px-2 py-1.5 text-right">Presupuesto</th>
            <th className="px-2 py-1.5 text-right">%</th>
            <th className="px-2 py-1.5 text-right border-l">Real acum.</th>
            <th className="px-2 py-1.5 text-right">Presup. acum.</th>
            <th className="px-2 py-1.5 text-right">%</th>
            {NOMBRES_MESES_CORTOS.map((m, i) => (
              <th
                key={m}
                className={`px-2 py-1.5 text-right ${
                  i === mesActivo - 1 ? "bg-amber-100" : ""
                } ${i === 0 ? "border-l" : ""}`}
              >
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.ingresos.map((f, i) => (
            <FilaConcepto
              key={f.conceptoId}
              fila={f}
              anio={anio}
              mesActivo={mesActivo}
              esIngreso={true}
              numero={i + 1}
            />
          ))}
          <FilaTotal total={data.totales.ingresos} esIngreso={true} mesActivo={mesActivo} />

          <tr>
            <td colSpan={20} className="bg-primary text-primary-foreground px-3 py-2 text-xs uppercase tracking-wide font-bold">
              II — Egresos
            </td>
          </tr>
          {data.egresos.map((f, i) => (
            <FilaConcepto
              key={f.conceptoId}
              fila={f}
              anio={anio}
              mesActivo={mesActivo}
              esIngreso={false}
              numero={i + 1}
            />
          ))}
          <FilaTotal total={data.totales.egresos} esIngreso={false} mesActivo={mesActivo} />

          {/* Saldos */}
          <tr>
            <td colSpan={20} className="bg-primary text-primary-foreground px-3 py-2 text-xs uppercase tracking-wide font-bold">
              III — Saldos
            </td>
          </tr>
          <tr className="border-b font-medium">
            <td className="px-2 py-1.5 text-xs text-center">III</td>
            <td className="px-2 py-1.5 text-sm">Saldo</td>
            <td className="px-2 py-1.5 text-right text-sm tabular-nums">
              {fmt(data.saldos.saldoMensual)}
            </td>
            <td colSpan={2}></td>
            <td className="px-2 py-1.5 text-right text-sm tabular-nums">
              {fmt(data.saldos.saldoAcumulado)}
            </td>
            <td colSpan={2}></td>
            {data.saldos.saldoMes.map((m, i) => (
              <td
                key={i}
                className={`px-2 py-1.5 text-right text-xs tabular-nums ${
                  i === mesActivo - 1 ? "bg-amber-50" : ""
                } ${Number(m) < 0 ? "text-red-700" : ""}`}
              >
                {fmt(m)}
              </td>
            ))}
          </tr>
          <tr className="border-b">
            <td className="px-2 py-1.5 text-xs text-center">IV</td>
            <td className="px-2 py-1.5 text-sm">Saldo anterior</td>
            <td colSpan={6}></td>
            {data.saldos.saldoAnterior.map((m, i) => (
              <td
                key={i}
                className={`px-2 py-1.5 text-right text-xs tabular-nums text-muted-foreground ${
                  i === mesActivo - 1 ? "bg-amber-50" : ""
                }`}
              >
                {fmt(m)}
              </td>
            ))}
          </tr>
          <tr className="border-b font-semibold bg-secondary/30">
            <td className="px-2 py-1.5 text-xs text-center">V</td>
            <td className="px-2 py-1.5 text-sm">Saldo mes próximo</td>
            <td colSpan={6}></td>
            {data.saldos.saldoMesProximo.map((m, i) => (
              <td
                key={i}
                className={`px-2 py-1.5 text-right text-xs tabular-nums ${
                  i === mesActivo - 1 ? "bg-amber-100" : ""
                } ${Number(m) < 0 ? "text-red-700" : ""}`}
              >
                {fmt(m)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
