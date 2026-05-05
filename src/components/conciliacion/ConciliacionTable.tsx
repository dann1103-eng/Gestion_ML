"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TipoMovimiento } from "@prisma/client";
import type { ConciliacionRow } from "@/lib/conciliacion/queries";
import { toggleConciliado, marcarLoteConciliados } from "@/server/actions/conciliacion";
import { formatMoney } from "@/lib/money";

type Props = { movimientos: ConciliacionRow[] };

export function ConciliacionTable({ movimientos: inicial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [saldoBanco, setSaldoBanco] = useState("");

  const rows = inicial.map((r) => ({
    ...r,
    conciliado: optimistic[r.id] ?? r.conciliado,
  }));

  const noAnulados = rows.filter((r) => !r.anulado);
  const conciliados = noAnulados.filter((r) => r.conciliado);
  const saldoSistema = noAnulados.reduce(
    (s, r) => s + (r.tipo === TipoMovimiento.INGRESO ? r.monto : -r.monto),
    0,
  );
  const saldoBancoNum = parseFloat(saldoBanco.replace(",", ".")) || 0;
  const diferencia = saldoBancoNum - saldoSistema;
  const cuadra = saldoBanco !== "" && Math.abs(diferencia) < 0.01;

  function handleToggle(id: string, current: boolean) {
    setOptimistic((prev) => ({ ...prev, [id]: !current }));
    startTransition(async () => {
      const res = await toggleConciliado(id, !current);
      if (!res.ok) {
        setOptimistic((prev) => ({ ...prev, [id]: current }));
      } else {
        router.refresh();
      }
    });
  }

  function handleMarcarTodos() {
    const ids = noAnulados.filter((r) => !r.conciliado).map((r) => r.id);
    if (ids.length === 0) return;
    ids.forEach((id) => setOptimistic((prev) => ({ ...prev, [id]: true })));
    startTransition(async () => {
      await marcarLoteConciliados(ids);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Saldo sistema" value={formatMoney(saldoSistema)} sub="según movimientos" />
        <div className="rounded-lg border border-[hsl(var(--ring))] bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Saldo banco
          </p>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={saldoBanco}
            onChange={(e) => setSaldoBanco(e.target.value)}
            className="w-full text-base font-bold tabular-nums border border-input rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
          />
          <p className="text-[10px] text-muted-foreground mt-1">ingresa el saldo real</p>
        </div>
        <div
          className={`rounded-lg border p-4 ${
            saldoBanco === ""
              ? "bg-card border-border"
              : cuadra
              ? "bg-green-50 border-green-300"
              : "bg-red-50 border-red-300"
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Diferencia
          </p>
          {saldoBanco === "" ? (
            <p className="text-base font-bold text-muted-foreground">—</p>
          ) : cuadra ? (
            <p className="text-base font-bold text-green-700">✅ Todo cuadra</p>
          ) : (
            <>
              <p className="text-base font-bold text-red-700 tabular-nums">
                {diferencia >= 0 ? "+" : ""}
                {formatMoney(diferencia)}
              </p>
              <p className="text-[10px] text-red-600">revisa pendientes</p>
            </>
          )}
        </div>
        <StatCard
          label="Conciliados"
          value={`${conciliados.length} / ${noAnulados.length}`}
          sub={`${noAnulados.length - conciliados.length} pendientes`}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
            <tr>
              <th className="w-10 px-3 py-3" />
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide font-semibold">Fecha</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide font-semibold">Vale</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide font-semibold">Concepto</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide font-semibold">Descripción</th>
              <th className="px-3 py-3 text-right text-[11px] uppercase tracking-wide font-semibold">Monto</th>
              <th className="px-3 py-3 text-center text-[11px] uppercase tracking-wide font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No hay movimientos para esta cuenta en el período seleccionado.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-t border-border ${i % 2 === 1 ? "bg-muted/30" : ""} ${
                    r.anulado ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={r.conciliado}
                      disabled={r.anulado || isPending}
                      onChange={() => handleToggle(r.id, r.conciliado)}
                      className="accent-green-600 w-4 h-4"
                    />
                  </td>
                  <td className="px-3 py-3 tabular-nums text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("es-SV", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(r.fecha)}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground font-mono">{r.valeNumero ?? "—"}</td>
                  <td className="px-3 py-3 font-medium">{r.concepto}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground truncate max-w-[180px]">
                    {r.descripcion}
                  </td>
                  <td className={`px-3 py-3 text-right font-semibold tabular-nums ${
                    r.tipo === TipoMovimiento.INGRESO ? "text-green-700" : "text-destructive"
                  }`}>
                    {r.tipo === TipoMovimiento.INGRESO ? "+" : "−"}{formatMoney(r.monto)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {r.anulado ? (
                      <span className="text-xs text-muted-foreground">Anulado</span>
                    ) : r.conciliado ? (
                      <span className="inline-block rounded-full bg-green-100 text-green-700 text-[10px] px-2 py-0.5">
                        ✓ Conciliado
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5">
                        ⏳ Pendiente
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk action */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>{rows.length} movimientos · {rows.filter((r) => !r.anulado && !r.conciliado).length} pendientes</span>
        <button
          onClick={handleMarcarTodos}
          disabled={isPending || rows.filter((r) => !r.anulado && !r.conciliado).length === 0}
          className="rounded-md bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-40 transition"
        >
          Marcar visibles como conciliados
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
