"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, X, Info } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { cerrarMes, reabrirMes } from "@/server/actions/cierre";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type Resumen = {
  anio: number;
  mes: number;
  count: number;
  ingresos: number;
  egresos: number;
};

type Props = {
  resumen: Resumen;
  modo: "cerrar" | "reabrir";
  onClose: () => void;
};

export function CerrarMesDialog({ resumen, modo, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const balance = resumen.ingresos - resumen.egresos;
  const labelMes = `${MESES[resumen.mes - 1]} ${resumen.anio}`;

  function handleConfirm() {
    startTransition(async () => {
      if (modo === "cerrar") await cerrarMes(resumen.anio, resumen.mes);
      else await reabrirMes(resumen.anio, resumen.mes);
      onClose();
      router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[480px] bg-card rounded-xl shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground transition-colors"
          type="button"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-5">
          <h3 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
            {modo === "cerrar" ? "Cerrar" : "Reabrir"} {labelMes}
          </h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {modo === "cerrar"
              ? "Está a punto de cerrar el ejercicio mensual. Revise el resumen antes de proceder."
              : "Está a punto de reabrir un mes cerrado. Después del cierre se podrán seguir editando movimientos."}
          </p>
        </div>

        {/* Resumen */}
        <div className="mx-8 mb-6 p-5 bg-[hsl(var(--accent))] rounded-lg border border-[hsl(var(--ring)/0.2)] grid grid-cols-2 gap-y-4 gap-x-6">
          <Stat label="Movimientos" value={String(resumen.count)} />
          <Stat label="Balance" value={formatMoney(balance)} highlight />
          <Stat label="Total ingresos" value={`+${formatMoney(resumen.ingresos)}`} color="income" />
          <Stat label="Total egresos" value={`−${formatMoney(resumen.egresos)}`} color="expense" />
        </div>

        {/* Aviso */}
        <div className="px-8 pb-2">
          <div className="flex gap-3 p-3 bg-muted rounded text-xs text-muted-foreground">
            <Info size={14} className="shrink-0 mt-0.5 text-[hsl(var(--ring))]" />
            <p className="leading-relaxed">
              {modo === "cerrar"
                ? "El cierre queda registrado con tu nombre y fecha. Aún podrás editar movimientos del mes pero verás una advertencia."
                : "Reabrir el mes elimina el registro de cierre. Podrás volver a cerrarlo cuando quieras."}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 py-6 flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            className="bg-primary text-primary-foreground hover:brightness-110 gap-2"
          >
            <Lock size={14} />
            {pending ? "Procesando..." : (modo === "cerrar" ? "Confirmar cierre" : "Confirmar reapertura")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  color,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  color?: "income" | "expense";
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1">
        {label}
      </p>
      <p
        className={
          "font-semibold tabular-nums " +
          (highlight ? "text-xl text-foreground" : "text-base ") +
          (color === "income" ? " text-[hsl(var(--income))]" : "") +
          (color === "expense" ? " text-[hsl(var(--expense))]" : "") +
          (!color && !highlight ? " text-foreground" : "")
        }
      >
        {value}
      </p>
    </div>
  );
}
