"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Sesion, ConferenciaCatalogo } from "@prisma/client";

type ConvenioOpcion = {
  id: string;
  empresaNombre: string;
};

type Props = {
  initial?: Sesion | null;
  convenios: ConvenioOpcion[];
  conferencias: ConferenciaCatalogo[];
  defaultConvenioId?: string;
  onSubmit: (formData: FormData) => Promise<{
    ok: boolean;
    error?: string;
    fieldErrors?: Record<string, string[]>;
  }>;
  onCancel?: () => void;
  submitLabel?: string;
};

const fmtDateTime = (d: Date | null | undefined) => {
  if (!d) return "";
  const dt = new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

export function SesionForm({
  initial,
  convenios,
  conferencias,
  defaultConvenioId,
  onSubmit,
  onCancel,
  submitLabel = "Guardar sesión",
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Agrupar conferencias por categoría para el select
  const conferenciasPorCat = new Map<string, ConferenciaCatalogo[]>();
  for (const c of conferencias) {
    if (!c.activo && c.id !== initial?.conferenciaId) continue;
    const arr = conferenciasPorCat.get(c.categoria) ?? [];
    arr.push(c);
    conferenciasPorCat.set(c.categoria, arr);
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setGlobalError(null);
    setFieldErrors({});
    // disabled selects are not included in FormData — inject manually
    if (defaultConvenioId && !formData.get("convenioId")) {
      formData.set("convenioId", defaultConvenioId);
    }
    const res = await onSubmit(formData);
    setPending(false);
    if (!res.ok) {
      setGlobalError(res.error ?? "Error al guardar");
      setFieldErrors(res.fieldErrors ?? {});
      return;
    }
    router.refresh();
    if (onCancel) onCancel();
  }

  const e = (k: string) => fieldErrors[k]?.[0];

  return (
    <form action={handleSubmit} className="space-y-4">
      {globalError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {globalError}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {initial ? "Editar sesión" : "Programar sesión"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="convenioId">Convenio *</Label>
            <Select
              id="convenioId"
              name="convenioId"
              required
              defaultValue={initial?.convenioId ?? defaultConvenioId ?? ""}
              disabled={!!defaultConvenioId && !initial}
            >
              <option value="">— Seleccionar —</option>
              {convenios.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.empresaNombre}
                </option>
              ))}
            </Select>
            {e("convenioId") ? (
              <p className="text-xs text-destructive mt-1">{e("convenioId")}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="conferenciaId">Conferencia *</Label>
            <Select
              id="conferenciaId"
              name="conferenciaId"
              required
              defaultValue={initial?.conferenciaId ?? ""}
            >
              <option value="">— Seleccionar conferencia —</option>
              {Array.from(conferenciasPorCat.entries()).map(([cat, lista]) => (
                <optgroup key={cat} label={cat}>
                  {lista.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.titulo}
                      {!c.activo ? " (inactiva)" : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
            {e("conferenciaId") ? (
              <p className="text-xs text-destructive mt-1">{e("conferenciaId")}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="fecha">Fecha y hora *</Label>
            <Input
              id="fecha"
              name="fecha"
              type="datetime-local"
              required
              defaultValue={
                initial?.fecha ? fmtDateTime(initial.fecha) : fmtDateTime(new Date())
              }
            />
          </div>

          <div>
            <Label htmlFor="modalidad">Modalidad *</Label>
            <Select
              id="modalidad"
              name="modalidad"
              required
              defaultValue={initial?.modalidad ?? "PRESENCIAL"}
            >
              <option value="PRESENCIAL">Presencial</option>
              <option value="VIRTUAL">Virtual</option>
              <option value="HIBRIDA">Híbrida</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="ponente">Ponente</Label>
            <Input
              id="ponente"
              name="ponente"
              defaultValue={initial?.ponente ?? ""}
              placeholder="Nombre del ponente"
            />
          </div>

          <div>
            <Label htmlFor="asistentes">Asistentes</Label>
            <Input
              id="asistentes"
              name="asistentes"
              type="number"
              min={0}
              defaultValue={initial?.asistentes ?? 0}
            />
          </div>

          <div>
            <Label htmlFor="estado">Estado *</Label>
            <Select
              id="estado"
              name="estado"
              required
              defaultValue={initial?.estado ?? "PROGRAMADA"}
            >
              <option value="PROGRAMADA">Programada</option>
              <option value="REALIZADA">Realizada</option>
              <option value="CANCELADA">Cancelada</option>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              name="notas"
              rows={2}
              defaultValue={initial?.notas ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
