"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AgregarPartidaInline } from "./AgregarPartidaInline";
import {
  aplicarDeducciones,
  quitarDeducciones,
  actualizarPartida,
  eliminarPartida,
} from "@/server/actions/planillas";
import { formatMoney } from "@/lib/money";
import { TipoPartida } from "@prisma/client";

type Partida = {
  id: string;
  tipo: TipoPartida;
  monto: number;
  descripcion: string | null;
};

type Empleado = {
  id: string;
  nombre: string;
  cargo: string | null;
  sueldoBase: number;
  isss: string | null;
  afp: string | null;
  partidas: Partida[];
};

type Props = {
  planillaId: string;
  empleado: Empleado;
  editable: boolean;
};

const TIPO_LABEL: Record<TipoPartida, string> = {
  SUELDO:          "Sueldo quincenal",
  BONO:            "Bono",
  HORA_EXTRA:      "Hora extra",
  DESCUENTO_ISSS:  "ISSS",
  DESCUENTO_AFP:   "AFP",
  DESCUENTO_ISR:   "ISR",
  DESCUENTO_OTRO:  "Descuento",
};

const DESCUENTOS: TipoPartida[] = [
  TipoPartida.DESCUENTO_ISSS,
  TipoPartida.DESCUENTO_AFP,
  TipoPartida.DESCUENTO_ISR,
  TipoPartida.DESCUENTO_OTRO,
];

export function EmpleadoPartidas({ planillaId, empleado, editable }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAgregar, setShowAgregar] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMonto, setEditMonto] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const tieneDeducciones = empleado.partidas.some((p) => DESCUENTOS.includes(p.tipo));
  const isssWarning = !empleado.isss || !empleado.afp;

  const bruto = empleado.partidas
    .filter((p) => !DESCUENTOS.includes(p.tipo))
    .reduce((sum, p) => sum + p.monto, 0);
  const descuentos = empleado.partidas
    .filter((p) => DESCUENTOS.includes(p.tipo))
    .reduce((sum, p) => sum + p.monto, 0);
  const neto = bruto - descuentos;

  function handleToggleDeducciones(checked: boolean) {
    setActionError(null);
    startTransition(async () => {
      const fn = checked ? aplicarDeducciones : quitarDeducciones;
      const res = await fn(planillaId, empleado.id);
      if (!res.ok) setActionError(res.error ?? "Error");
      else router.refresh();
    });
  }

  function startEdit(p: Partida) {
    setEditingId(p.id);
    setEditMonto(String(p.monto));
  }

  async function saveEdit(partidaId: string) {
    setActionError(null);
    const res = await actualizarPartida(partidaId, editMonto);
    if (!res.ok) {
      setActionError(res.error ?? "Error");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function handleEliminar(partidaId: string) {
    setActionError(null);
    const res = await eliminarPartida(partidaId);
    if (!res.ok) setActionError(res.error ?? "Error");
    else router.refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{empleado.nombre}</CardTitle>
            {empleado.cargo ? (
              <p className="text-xs text-muted-foreground">{empleado.cargo}</p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Neto</p>
            <p className="text-lg font-bold tabular-nums">{formatMoney(neto)}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {actionError ? (
          <p className="text-xs text-destructive">{actionError}</p>
        ) : null}

        {/* Partidas table */}
        <div className="space-y-1">
          {empleado.partidas.map((p) => {
            const esDescuento = DESCUENTOS.includes(p.tipo);
            return (
              <div key={p.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/30 text-sm">
                <span className="flex-1 text-muted-foreground">
                  {TIPO_LABEL[p.tipo]}
                  {p.descripcion ? ` — ${p.descripcion}` : ""}
                </span>
                {editable && editingId === p.id ? (
                  <>
                    <Input
                      className="w-24 h-7 text-sm"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editMonto}
                      onChange={(e) => setEditMonto(e.target.value)}
                    />
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={() => saveEdit(p.id)}>
                      OK
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingId(null)}>
                      ✕
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className={`tabular-nums font-medium ${esDescuento ? "text-destructive" : ""}`}
                    >
                      {esDescuento ? "−" : "+"}{formatMoney(p.monto)}
                    </span>
                    {editable ? (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="text-xs text-primary hover:underline"
                        >
                          Editar
                        </button>
                        {p.tipo !== TipoPartida.SUELDO ? (
                          <button
                            type="button"
                            onClick={() => handleEliminar(p.id)}
                            className="text-xs text-destructive hover:underline"
                          >
                            ✕
                          </button>
                        ) : null}
                      </>
                    ) : null}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Totals row */}
        <div className="flex justify-end gap-6 border-t pt-2 text-sm">
          <span className="text-muted-foreground">Bruto: {formatMoney(bruto)}</span>
          <span className="text-destructive">Desc.: {formatMoney(descuentos)}</span>
          <span className="font-bold">Neto: {formatMoney(neto)}</span>
        </div>

        {/* Controls (BORRADOR only) */}
        {editable ? (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* Deducciones toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={tieneDeducciones}
                disabled={isPending}
                onChange={(e) => handleToggleDeducciones(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Aplicar deducciones legales
            </label>

            {tieneDeducciones && isssWarning ? (
              <span className="text-xs text-amber-600">
                ⚠ Empleado sin número ISSS/AFP registrado
              </span>
            ) : null}

            {/* Add extra button */}
            {!showAgregar ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowAgregar(true)}
              >
                + Extra
              </Button>
            ) : null}
          </div>
        ) : null}

        {showAgregar ? (
          <AgregarPartidaInline
            planillaId={planillaId}
            empleadoId={empleado.id}
            onDone={() => setShowAgregar(false)}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
