"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EmpleadoInicial = {
  nombre: string;
  dui?: string | null;
  nit?: string | null;
  isss?: string | null;
  afp?: string | null;
  cargo?: string | null;
  sueldoBase: string; // serialized as string
  fechaIngreso: Date;
  fechaSalida?: Date | null;
  cuentaBanco?: string | null;
  activo: boolean;
};

type Props = {
  initial?: EmpleadoInicial | null;
  onSubmit: (formData: FormData) => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string[]> }>;
  submitLabel?: string;
};

const fmtDate = (d: Date | null | undefined) => {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
};

export function EmpleadoForm({ initial, onSubmit, submitLabel = "Guardar empleado" }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const e = (k: string) => fieldErrors[k]?.[0];

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
    router.push("/empleados");
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {globalError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {globalError}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="nombre">Nombre completo *</Label>
            <Input id="nombre" name="nombre" required defaultValue={initial?.nombre ?? ""} />
            {e("nombre") ? <p className="text-xs text-destructive mt-1">{e("nombre")}</p> : null}
          </div>

          <div>
            <Label htmlFor="dui">DUI</Label>
            <Input id="dui" name="dui" placeholder="12345678-9" defaultValue={initial?.dui ?? ""} />
            {e("dui") ? <p className="text-xs text-destructive mt-1">{e("dui")}</p> : null}
          </div>

          <div>
            <Label htmlFor="nit">NIT</Label>
            <Input id="nit" name="nit" defaultValue={initial?.nit ?? ""} />
            {e("nit") ? <p className="text-xs text-destructive mt-1">{e("nit")}</p> : null}
          </div>

          <div>
            <Label htmlFor="isss">Número ISSS</Label>
            <Input id="isss" name="isss" defaultValue={initial?.isss ?? ""} />
          </div>

          <div>
            <Label htmlFor="afp">Número AFP</Label>
            <Input id="afp" name="afp" defaultValue={initial?.afp ?? ""} />
          </div>

          <div>
            <Label htmlFor="cargo">Cargo</Label>
            <Input id="cargo" name="cargo" defaultValue={initial?.cargo ?? ""} />
          </div>

          <div>
            <Label htmlFor="cuentaBanco">Cuenta banco</Label>
            <Input id="cuentaBanco" name="cuentaBanco" defaultValue={initial?.cuentaBanco ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contrato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="sueldoBase">Sueldo base mensual *</Label>
            <Input
              id="sueldoBase"
              name="sueldoBase"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={initial?.sueldoBase ?? ""}
            />
            {e("sueldoBase") ? <p className="text-xs text-destructive mt-1">{e("sueldoBase")}</p> : null}
          </div>

          <div>
            <Label htmlFor="fechaIngreso">Fecha de ingreso *</Label>
            <Input
              id="fechaIngreso"
              name="fechaIngreso"
              type="date"
              required
              defaultValue={fmtDate(initial?.fechaIngreso)}
            />
            {e("fechaIngreso") ? <p className="text-xs text-destructive mt-1">{e("fechaIngreso")}</p> : null}
          </div>

          <div>
            <Label htmlFor="fechaSalida">Fecha de salida</Label>
            <Input
              id="fechaSalida"
              name="fechaSalida"
              type="date"
              defaultValue={fmtDate(initial?.fechaSalida)}
            />
            <p className="text-xs text-muted-foreground mt-1">Al llenarla el empleado queda inactivo.</p>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="activo"
              name="activo"
              value="true"
              defaultChecked={initial?.activo ?? true}
              className="h-4 w-4 rounded border-border"
            />
            <Label htmlFor="activo">Activo</Label>
          </div>
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
