"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TipoPlan } from "@prisma/client";

type EmpresaOpcion = {
  id: string;
  nombre: string;
  razonSocial: string | null;
};

type PlanOpcion = {
  id: string;
  tipo: TipoPlan;
  precio: number;
  descuentoExtras: number;
  cantidadConferencias: number;
  horasCoaching: number;
  vigente: boolean;
};

type ConvenioInicial = {
  donanteId: string;
  planId: string;
  fechaFirma: Date;
  fechaInicio: Date;
  fechaFin: Date;
  montoTotal: string;
  ciudadFirma: string | null;
  notas: string | null;
};

type Props = {
  initial?: ConvenioInicial | null;
  empresas: EmpresaOpcion[];
  planes: PlanOpcion[];
  initialPlanTipo?: TipoPlan;
  onSubmit: (formData: FormData) => Promise<{
    ok: boolean;
    error?: string;
    fieldErrors?: Record<string, string[]>;
    data?: { id: string };
  }>;
  /** URL a la que redirigir tras éxito. Usa {id} para insertar el ID del convenio creado/editado. */
  successUrl?: string;
  submitLabel?: string;
};

const fmtDate = (d: Date | null | undefined) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

const todayStr = () => new Date().toISOString().slice(0, 10);

function addYears(dateStr: string, years: number): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCFullYear(dt.getUTCFullYear() + years);
  return dt.toISOString().slice(0, 10);
}

function mesesEntreStr(inicio: string, fin: string): number {
  if (!inicio || !fin) return 1;
  const [yi, mi] = inicio.split("-").map(Number);
  const [yf, mf] = fin.split("-").map(Number);
  return Math.max(1, (yf - yi) * 12 + (mf - mi) + 1);
}

export function ConvenioForm({
  initial,
  empresas,
  planes,
  initialPlanTipo,
  onSubmit,
  successUrl,
  submitLabel = "Guardar convenio",
}: Props) {
  const router = useRouter();

  const planByTipo = useMemo(() => {
    const m = new Map<TipoPlan, PlanOpcion>();
    for (const p of planes) m.set(p.tipo, p);
    return m;
  }, [planes]);

  const initialPlanFromInitial = (() => {
    if (!initial) return undefined;
    const p = planes.find((p) => p.id === initial.planId);
    return p?.tipo;
  })();

  const [donanteId, setDonanteId] = useState(initial?.donanteId ?? "");
  const [planTipo, setPlanTipo] = useState<TipoPlan>(
    initialPlanFromInitial ?? initialPlanTipo ?? "GOLD",
  );
  const [fechaFirma, setFechaFirma] = useState(
    fmtDate(initial?.fechaFirma) || todayStr(),
  );
  const [fechaInicio, setFechaInicio] = useState(
    fmtDate(initial?.fechaInicio) || todayStr(),
  );
  const [fechaFin, setFechaFin] = useState(
    fmtDate(initial?.fechaFin) || addYears(todayStr(), 1),
  );
  const [montoTotal, setMontoTotal] = useState(
    initial ? String(initial.montoTotal) : "",
  );
  const [montoOverride, setMontoOverride] = useState(false);

  const [pending, setPending] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const planActivo = planByTipo.get(planTipo);
  const meses = mesesEntreStr(fechaInicio, fechaFin);
  const montoCalculado = planActivo
    ? (Number(planActivo.precio) * meses).toFixed(2)
    : "0.00";
  const montoEnUso = montoOverride ? montoTotal : montoCalculado;

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setGlobalError(null);
    setFieldErrors({});
    if (!montoOverride) formData.set("montoTotal", montoCalculado);
    const res = await onSubmit(formData);
    setPending(false);
    if (!res.ok) {
      setGlobalError(res.error ?? "Error al guardar");
      setFieldErrors(res.fieldErrors ?? {});
      return;
    }
    const id = res.data?.id ?? "";
    const target = successUrl ? successUrl.replace("{id}", id) : "/convenios";
    router.push(target);
    router.refresh();
  }

  const e = (k: string) => fieldErrors[k]?.[0];

  return (
    <form action={handleSubmit} className="space-y-6">
      {globalError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="font-medium">{globalError}</div>
          {Object.keys(fieldErrors).length > 0 ? (
            <ul className="mt-2 list-disc pl-5 text-xs space-y-0.5">
              {Object.entries(fieldErrors).map(([field, msgs]) => (
                <li key={field}>
                  <strong>{field}</strong>: {msgs.join(", ")}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Empresa y plan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="donanteId">Empresa *</Label>
            <Select
              id="donanteId"
              name="donanteId"
              required
              value={donanteId}
              onChange={(ev) => setDonanteId(ev.target.value)}
            >
              <option value="">— Selecciona empresa —</option>
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.razonSocial ?? emp.nombre}
                </option>
              ))}
            </Select>
            {empresas.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">
                No hay donantes con tipo Empresa FE.{" "}
                <a href="/donantes/nuevo" className="text-primary hover:underline">
                  Crear nueva empresa →
                </a>
              </p>
            ) : null}
            {e("donanteId") ? (
              <p className="text-xs text-destructive mt-1">{e("donanteId")}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="planTipo">Plan *</Label>
            <Select
              id="planTipo"
              name="planTipo"
              required
              value={planTipo}
              onChange={(ev) => setPlanTipo(ev.target.value as TipoPlan)}
            >
              {planes.map((p) => (
                <option key={p.id} value={p.tipo}>
                  {p.tipo} — ${Number(p.precio).toFixed(2)}/mes ·{" "}
                  {p.cantidadConferencias} conf
                  {p.horasCoaching > 0 ? ` + ${p.horasCoaching}h coach` : ""}
                </option>
              ))}
            </Select>
          </div>

          {planActivo ? (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs space-y-1">
              <div className="font-medium text-foreground">
                Resumen de plan {planActivo.tipo}
              </div>
              <div>Precio mensual: ${Number(planActivo.precio).toFixed(2)}</div>
              <div>Conferencias incluidas: {planActivo.cantidadConferencias}</div>
              <div>Horas de coaching: {planActivo.horasCoaching}</div>
              <div>Descuento en extras: {Number(planActivo.descuentoExtras)}%</div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fechas y monto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="fechaFirma">Fecha de firma *</Label>
            <Input
              id="fechaFirma"
              name="fechaFirma"
              type="date"
              required
              value={fechaFirma}
              onChange={(ev) => setFechaFirma(ev.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fechaInicio">Inicio *</Label>
            <Input
              id="fechaInicio"
              name="fechaInicio"
              type="date"
              required
              value={fechaInicio}
              onChange={(ev) => setFechaInicio(ev.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fechaFin">Fin *</Label>
            <Input
              id="fechaFin"
              name="fechaFin"
              type="date"
              required
              value={fechaFin}
              onChange={(ev) => setFechaFin(ev.target.value)}
            />
            {e("fechaFin") ? (
              <p className="text-xs text-destructive mt-1">{e("fechaFin")}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="ciudadFirma">Ciudad de firma</Label>
            <Input
              id="ciudadFirma"
              name="ciudadFirma"
              defaultValue={initial?.ciudadFirma ?? "Santa Ana"}
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="montoTotal">
              Monto total{" "}
              <span className="text-xs text-muted-foreground">
                ({meses} {meses === 1 ? "mes" : "meses"} × $
                {planActivo ? Number(planActivo.precio).toFixed(2) : "0.00"} ={" "}
                ${montoCalculado})
              </span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="montoTotal"
                name="montoTotal"
                placeholder="0.00"
                value={montoEnUso}
                disabled={!montoOverride}
                onChange={(ev) => setMontoTotal(ev.target.value)}
                className="flex-1"
              />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={montoOverride}
                  onChange={(ev) => {
                    setMontoOverride(ev.target.checked);
                    if (ev.target.checked) setMontoTotal(montoCalculado);
                  }}
                />
                Editar manualmente
              </label>
            </div>
            {e("montoTotal") ? (
              <p className="text-xs text-destructive mt-1">{e("montoTotal")}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notas</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            id="notas"
            name="notas"
            rows={3}
            defaultValue={initial?.notas ?? ""}
            placeholder="Observaciones internas sobre el convenio..."
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
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
