"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Donante, EmpresaDetalle } from "@prisma/client";

type Props = {
  initial?: (Donante & { empresaDetalle: EmpresaDetalle | null }) | null;
  onSubmit: (formData: FormData) => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string[]> }>;
  redirectTo: string;
  submitLabel?: string;
};

export function DonanteForm({ initial, onSubmit, redirectTo, submitLabel = "Guardar" }: Props) {
  const router = useRouter();
  const [tipo, setTipo] = useState(initial?.tipo ?? "COOPERADOR");
  const [pending, setPending] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

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
  const isEmpresa = tipo === "EMPRESA_FE";

  const fmtDate = (d: Date | null | undefined) =>
    d ? new Date(d).toISOString().slice(0, 10) : "";

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
          <CardTitle>Tipo y datos básicos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="tipo">Tipo de donante *</Label>
            <Select
              id="tipo"
              name="tipo"
              required
              value={tipo}
              onChange={(ev) => setTipo(ev.target.value as typeof tipo)}
            >
              <option value="COOPERADOR">Cooperador</option>
              <option value="SUPERNUMERARIO">Supernumerario</option>
              <option value="EMPRESA_FE">Empresa (Formación Empresarial)</option>
              <option value="OCASIONAL">Donante ocasional</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="estado">Estado</Label>
            <Select id="estado" name="estado" defaultValue={initial?.estado ?? "ACTIVO"}>
              <option value="ACTIVO">Activo</option>
              <option value="PAUSADO">Pausado</option>
              <option value="INACTIVO">Inactivo</option>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="nombre">{isEmpresa ? "Nombre comercial *" : "Nombre completo *"}</Label>
            <Input id="nombre" name="nombre" required defaultValue={initial?.nombre ?? ""} />
            {e("nombre") ? <p className="text-xs text-destructive mt-1">{e("nombre")}</p> : null}
          </div>

          <div>
            <Label htmlFor="dui">DUI</Label>
            <Input id="dui" name="dui" placeholder="12345678-9" defaultValue={initial?.dui ?? ""} />
            {e("dui") ? <p className="text-xs text-destructive mt-1">{e("dui")}</p> : null}
          </div>

          <div>
            <Label htmlFor="nit">NIT (persona)</Label>
            <Input id="nit" name="nit" placeholder="0000-000000-000-0" defaultValue={initial?.nit ?? ""} />
            {e("nit") ? <p className="text-xs text-destructive mt-1">{e("nit")}</p> : null}
          </div>

          {!isEmpresa ? (
            <>
              <div>
                <Label htmlFor="fechaNacimiento">Fecha nacimiento</Label>
                <Input
                  id="fechaNacimiento"
                  name="fechaNacimiento"
                  type="date"
                  defaultValue={fmtDate(initial?.fechaNacimiento)}
                />
              </div>
              <div>
                <Label htmlFor="genero">Género</Label>
                <Select id="genero" name="genero" defaultValue={initial?.genero ?? ""}>
                  <option value="">—</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="OTRO">Otro</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="profesion">Profesión / Ocupación</Label>
                <Input id="profesion" name="profesion" defaultValue={initial?.profesion ?? ""} />
              </div>
            </>
          ) : null}

          <div className="flex items-end gap-2 md:col-span-2">
            <input
              id="entregaReciboFiscal"
              name="entregaReciboFiscal"
              type="checkbox"
              value="true"
              defaultChecked={initial?.entregaReciboFiscal ?? false}
            />
            <Label htmlFor="entregaReciboFiscal">
              Entrega recibo fiscal (sus ingresos van a Informes AFCYD)
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="telefonoPrincipal">Teléfono principal</Label>
            <Input id="telefonoPrincipal" name="telefonoPrincipal" defaultValue={initial?.telefonoPrincipal ?? ""} />
          </div>
          <div>
            <Label htmlFor="telefonoSecundario">Teléfono secundario</Label>
            <Input id="telefonoSecundario" name="telefonoSecundario" defaultValue={initial?.telefonoSecundario ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="correo">Correo electrónico</Label>
            <Input id="correo" name="correo" type="email" defaultValue={initial?.correo ?? ""} />
            {e("correo") ? <p className="text-xs text-destructive mt-1">{e("correo")}</p> : null}
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input id="direccion" name="direccion" defaultValue={initial?.direccion ?? ""} />
          </div>
          <div>
            <Label htmlFor="ciudad">Ciudad</Label>
            <Input id="ciudad" name="ciudad" defaultValue={initial?.ciudad ?? ""} />
          </div>
          <div>
            <Label htmlFor="departamento">Departamento</Label>
            <Input id="departamento" name="departamento" defaultValue={initial?.departamento ?? ""} />
          </div>
        </CardContent>
      </Card>

      {isEmpresa ? (
        <Card>
          <CardHeader>
            <CardTitle>Datos de empresa (Formación Empresarial)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="razonSocial">Razón social</Label>
              <Input id="razonSocial" name="razonSocial" defaultValue={initial?.empresaDetalle?.razonSocial ?? ""} />
              {e("razonSocial") ? <p className="text-xs text-destructive mt-1">{e("razonSocial")}</p> : null}
            </div>
            <div>
              <Label htmlFor="nitEmpresa">NIT empresa</Label>
              <Input id="nitEmpresa" name="nitEmpresa" defaultValue={initial?.empresaDetalle?.nitEmpresa ?? ""} />
              {e("nitEmpresa") ? <p className="text-xs text-destructive mt-1">{e("nitEmpresa")}</p> : null}
            </div>
            <div>
              <Label htmlFor="nrc">NRC</Label>
              <Input id="nrc" name="nrc" defaultValue={initial?.empresaDetalle?.nrc ?? ""} />
            </div>
            <div>
              <Label htmlFor="giro">Giro</Label>
              <Input id="giro" name="giro" defaultValue={initial?.empresaDetalle?.giro ?? ""} />
            </div>
            <div>
              <Label htmlFor="rubro">Rubro</Label>
              <Input id="rubro" name="rubro" defaultValue={initial?.empresaDetalle?.rubro ?? ""} />
            </div>
            <div>
              <Label htmlFor="personeria">Personería</Label>
              <Input id="personeria" name="personeria" defaultValue={initial?.empresaDetalle?.personeria ?? ""} />
            </div>
            <div>
              <Label htmlFor="representanteLegal">Representante legal</Label>
              <Input id="representanteLegal" name="representanteLegal" defaultValue={initial?.empresaDetalle?.representanteLegal ?? ""} />
            </div>
            <div>
              <Label htmlFor="planFE">Plan FE *</Label>
              <Select id="planFE" name="planFE" defaultValue={initial?.empresaDetalle?.planFE ?? ""}>
                <option value="">—</option>
                <option value="GOLD">Gold ($600/mes — 2 conferencias + 2h coaching)</option>
                <option value="SILVER">Silver ($400/mes — 2 conferencias)</option>
                <option value="BRONCE">Bronce ($200/mes — 1 conferencia)</option>
              </Select>
              {e("planFE") ? <p className="text-xs text-destructive mt-1">{e("planFE")}</p> : null}
            </div>
            <div>
              <Label htmlFor="fechaInicioConvenio">Inicio del convenio</Label>
              <Input
                id="fechaInicioConvenio"
                name="fechaInicioConvenio"
                type="date"
                defaultValue={fmtDate(initial?.empresaDetalle?.fechaInicioConvenio)}
              />
            </div>
            <div>
              <Label htmlFor="fechaVencimientoConvenio">Vencimiento</Label>
              <Input
                id="fechaVencimientoConvenio"
                name="fechaVencimientoConvenio"
                type="date"
                defaultValue={fmtDate(initial?.empresaDetalle?.fechaVencimientoConvenio)}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {(tipo === "COOPERADOR" || tipo === "SUPERNUMERARIO") && (
        <Card>
          <CardHeader>
            <CardTitle>Aporte mensual esperado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="aporteMensualEsperado">
              Monto mensual ($) — opcional
            </Label>
            <Input
              id="aporteMensualEsperado"
              name="aporteMensualEsperado"
              type="text"
              inputMode="decimal"
              placeholder="ej. 100.00"
              defaultValue={
                initial?.aporteMensualEsperado != null
                  ? String(initial.aporteMensualEsperado)
                  : ""
              }
            />
            {e("aporteMensualEsperado") && (
              <p className="text-xs text-red-600">{e("aporteMensualEsperado")}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Si se define, el sistema marcará al donante como atrasado cuando
              no cubra este monto en el mes corriente.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Notas</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea name="notas" defaultValue={initial?.notas ?? ""} placeholder="Notas internas sobre el donante" />
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
