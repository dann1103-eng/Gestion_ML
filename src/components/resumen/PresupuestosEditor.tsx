"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertPresupuesto } from "@/server/actions/resumen";

type Item = {
  conceptoId: string;
  conceptoNombre: string;
  tipo: "INGRESO" | "EGRESO";
  montoMensual: string;
  notas: string;
};

function fmt(v: string): string {
  const n = Number(v);
  return n.toLocaleString("es-SV", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function FilaEditor({ anio, item }: { anio: number; item: Item }) {
  const [monto, setMonto] = useState(item.montoMensual);
  const [notas, setNotas] = useState(item.notas);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const router = useRouter();

  const guardar = () => {
    if (monto === item.montoMensual && notas === item.notas) return;
    startTransition(async () => {
      const r = await upsertPresupuesto({
        conceptoId: item.conceptoId,
        anio,
        montoMensual: monto || "0",
        notas,
      });
      if (!r.ok) alert(r.error);
      else {
        setSavedAt(new Date().toLocaleTimeString("es-SV"));
        router.refresh();
      }
    });
  };

  const totalAnual = Number(monto) * 12;

  return (
    <tr className="border-b">
      <td className="px-3 py-2 text-sm font-medium">{item.conceptoNombre}</td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          onBlur={guardar}
          disabled={pending}
          className="w-28 px-2 py-1 border border-input rounded text-right text-sm"
        />
      </td>
      <td className="px-3 py-2 text-right text-sm tabular-nums text-muted-foreground">
        {fmt(totalAnual.toString())}
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          onBlur={guardar}
          disabled={pending}
          placeholder="Justificación / referencia (opcional)"
          className="w-full px-2 py-1 border border-input rounded text-sm"
        />
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {savedAt ? `✓ ${savedAt}` : ""}
      </td>
    </tr>
  );
}

function Tabla({ items, titulo, anio }: { items: Item[]; titulo: string; anio: number }) {
  const totalMensual = items.reduce((a, b) => a + Number(b.montoMensual), 0);
  const totalAnual = totalMensual * 12;
  return (
    <div className="rounded-lg border">
      <h2 className="bg-primary text-primary-foreground px-4 py-2 font-semibold text-sm">
        {titulo}
      </h2>
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-xs">
          <tr>
            <th className="px-3 py-2 text-left">Concepto</th>
            <th className="px-3 py-2 text-right w-32">Mensual</th>
            <th className="px-3 py-2 text-right w-32">Anual</th>
            <th className="px-3 py-2 text-left">Notas</th>
            <th className="px-3 py-2 text-left w-24">Estado</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <FilaEditor key={it.conceptoId} anio={anio} item={it} />
          ))}
        </tbody>
        <tfoot className="bg-muted/40 font-semibold">
          <tr>
            <td className="px-3 py-2">Total</td>
            <td className="px-3 py-2 text-right tabular-nums">
              {fmt(totalMensual.toString())}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">
              {fmt(totalAnual.toString())}
            </td>
            <td colSpan={2}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function PresupuestosEditor({
  anio,
  ingresos,
  egresos,
}: {
  anio: number;
  items: Item[];
  ingresos: Item[];
  egresos: Item[];
}) {
  return (
    <div className="space-y-6">
      <Tabla items={ingresos} titulo="Ingresos" anio={anio} />
      <Tabla items={egresos} titulo="Egresos" anio={anio} />
      <p className="text-xs text-muted-foreground">
        Los cambios se guardan automáticamente al salir de cada celda.
      </p>
    </div>
  );
}
