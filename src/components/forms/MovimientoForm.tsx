"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DonanteAutocomplete } from "./DonanteAutocomplete";
import type { Movimiento, Concepto, Cuenta, Clasificacion, Donante } from "@prisma/client";

type Props = {
  initial?:
    | (Movimiento & {
        donante: Donante | null;
      })
    | null;
  conceptos: Concepto[];
  cuentas: Cuenta[];
  clasificaciones: Clasificacion[];
  onSubmit: (formData: FormData) => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string[]> }>;
  redirectTo: string;
  submitLabel?: string;
};

export function MovimientoForm({
  initial,
  conceptos,
  cuentas,
  clasificaciones,
  onSubmit,
  redirectTo,
  submitLabel = "Registrar",
}: Props) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"INGRESO" | "EGRESO">(initial?.tipo ?? "EGRESO");
  const [pending, setPending] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const conceptosFiltrados = conceptos.filter((c) => c.tipo === tipo && c.activo);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setGlobalError(null);
    setFieldErrors({});
    const res = await onSubmit(formData);
    setPending(false);
    if (!res.ok) {
      setGlobalError(res.error ?? "Error al guardar");
      setFieldErrors(res.fieldErrors ?? {});
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  const e = (k: string) => fieldErrors[k]?.[0];
  const fmtDate = (d: Date | null | undefined) =>
    d ? new Date(d).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  return (
    <form action={handleSubmit} className="space-y-6">
      {globalError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {globalError}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Datos del movimiento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="fecha">Fecha *</Label>
            <Input
              id="fecha"
              name="fecha"
              type="date"
              required
              defaultValue={fmtDate(initial?.fecha)}
            />
          </div>

          <div>
            <Label htmlFor="tipo">Tipo *</Label>
            <Select
              id="tipo"
              name="tipo"
              required
              value={tipo}
              onChange={(ev) => setTipo(ev.target.value as "INGRESO" | "EGRESO")}
            >
              <option value="INGRESO">Ingreso</option>
              <option value="EGRESO">Egreso</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="conceptoId">Concepto *</Label>
            <Select
              id="conceptoId"
              name="conceptoId"
              required
              defaultValue={initial?.conceptoId ?? ""}
            >
              <option value="">Selecciona un concepto</option>
              {conceptosFiltrados.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.generaAfcyd ? "(AFCYD)" : ""}
                </option>
              ))}
            </Select>
            {e("conceptoId") ? <p className="text-xs text-destructive mt-1">{e("conceptoId")}</p> : null}
          </div>

          <div>
            <Label htmlFor="clasificacionId">Clasificación</Label>
            <Select
              id="clasificacionId"
              name="clasificacionId"
              defaultValue={initial?.clasificacionId ?? ""}
            >
              <option value="">—</option>
              {clasificaciones.filter((c) => c.activo).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="cuentaId">Cuenta *</Label>
            <Select
              id="cuentaId"
              name="cuentaId"
              required
              defaultValue={initial?.cuentaId ?? ""}
            >
              <option value="">Selecciona una cuenta</option>
              {cuentas.filter((c) => c.activo).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </Select>
            {e("cuentaId") ? <p className="text-xs text-destructive mt-1">{e("cuentaId")}</p> : null}
          </div>

          <div>
            <Label htmlFor="medioPago">Medio de pago</Label>
            <Select
              id="medioPago"
              name="medioPago"
              defaultValue={initial?.medioPago ?? "EFECTIVO"}
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="CHEQUE">Cheque</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="REMESA">Remesa</option>
              <option value="OTRO">Otro</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="monto">Monto (USD) *</Label>
            <Input
              id="monto"
              name="monto"
              type="number"
              step="0.01"
              min="0.01"
              required
              defaultValue={initial?.monto?.toString() ?? ""}
            />
            {e("monto") ? <p className="text-xs text-destructive mt-1">{e("monto")}</p> : null}
          </div>

          <div className="md:col-span-2">
            <Label>Donante (opcional)</Label>
            <DonanteAutocomplete
              defaultValue={initial?.donante ? { id: initial.donante.id, nombre: initial.donante.nombre } : null}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Si el donante tiene activado &quot;entrega recibo fiscal&quot;, se generará automáticamente un registro AFCYD.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Si el donante es <strong>numerario</strong>, también se generará automáticamente un egreso espejo a FESAL por el mismo monto.
            </p>
            <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                name="generarFesal"
                value="true"
                defaultChecked
                className="rounded border-input"
              />
              Generar egreso espejo a FESAL (sólo para numerarios)
            </label>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="descripcion">Descripción *</Label>
            <Input
              id="descripcion"
              name="descripcion"
              required
              defaultValue={initial?.descripcion ?? ""}
              placeholder="Detalle breve del movimiento"
            />
            {e("descripcion") ? <p className="text-xs text-destructive mt-1">{e("descripcion")}</p> : null}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea id="notas" name="notas" defaultValue={initial?.notas ?? ""} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
