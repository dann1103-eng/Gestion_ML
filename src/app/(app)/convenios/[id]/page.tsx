import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerConvenio, cobranzaConvenio } from "@/server/actions/convenios";
import { listarConferencias } from "@/server/actions/conferencias";
import { crearSesion, cambiarEstadoSesion, eliminarSesion } from "@/server/actions/sesiones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ConvenioStatusBadge,
  PlanBadge,
} from "@/components/convenios/ConvenioStatusBadge";
import { CobranzaTable } from "@/components/convenios/CobranzaTable";
import { SesionFormToggle } from "@/components/convenios/SesionFormToggle";
import { RenovarButton } from "@/components/convenios/RenovarButton";
import { AnularConvenioButton } from "@/components/convenios/AnularConvenioButton";
import { formatMoney } from "@/lib/money";
import { FileDown, Edit3 } from "lucide-react";

export const dynamic = "force-dynamic";

const fmtFecha = new Intl.DateTimeFormat("es-SV", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const fmtFechaCorta = new Intl.DateTimeFormat("es-SV", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const fmtHora = new Intl.DateTimeFormat("es-SV", {
  hour: "2-digit",
  minute: "2-digit",
});

const ESTADO_BADGE_VARIANT = {
  PROGRAMADA: "default",
  REALIZADA: "success",
  CANCELADA: "secondary",
} as const;

const MODALIDAD_LABEL = {
  PRESENCIAL: "Presencial",
  VIRTUAL: "Virtual",
  HIBRIDA: "Híbrida",
} as const;

export default async function ConvenioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [conv, conferencias, cobranza] = await Promise.all([
    obtenerConvenio(id),
    listarConferencias({ activo: true }),
    cobranzaConvenio(id),
  ]);

  if (!conv) notFound();

  const empresa = conv.donante;
  const detalle = empresa.empresaDetalle;
  const empresaNombre = detalle?.razonSocial ?? empresa.nombre;

  const sesionesProgramadas = conv.sesiones.filter((s) => s.estado !== "CANCELADA");
  const cantidadEsperada = conv.plan.cantidadConferencias;

  async function onCrearSesion(formData: FormData) {
    "use server";
    const res = await crearSesion(formData);
    return res.ok
      ? { ok: true }
      : { ok: false, error: res.error, fieldErrors: res.fieldErrors };
  }

  async function marcarRealizadaForm(sesionId: string) {
    "use server";
    await cambiarEstadoSesion(sesionId, "REALIZADA");
  }

  async function cancelarSesionForm(sesionId: string) {
    "use server";
    await cambiarEstadoSesion(sesionId, "CANCELADA");
  }

  async function eliminarSesionFormAction(sesionId: string) {
    "use server";
    await eliminarSesion(sesionId);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Banner de anulado */}
      {conv.anulado ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">⚠ Convenio anulado</p>
          {conv.motivoAnulacion ? (
            <p className="text-xs text-red-600 mt-1">Motivo: {conv.motivoAnulacion}</p>
          ) : null}
        </div>
      ) : null}

      {/* Cabecera */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{empresaNombre}</h1>
            <PlanBadge tipo={conv.plan.tipo} />
            <ConvenioStatusBadge fechaFin={conv.fechaFin} />
            {conv.version > 1 ? (
              <Badge variant="outline">v{conv.version}</Badge>
            ) : null}
            {conv.anulado ? <Badge variant="destructive">ANULADO</Badge> : null}
          </div>
          <p className="text-muted-foreground mt-1">
            {fmtFecha.format(conv.fechaInicio)} → {fmtFecha.format(conv.fechaFin)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/convenios/${conv.id}/pdf`} target="_blank" rel="noopener">
              <FileDown size={14} className="mr-1" /> Descargar PDF
            </a>
          </Button>
          {!conv.anulado ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/convenios/${conv.id}/editar`}>
                  <Edit3 size={14} className="mr-1" /> Editar
                </Link>
              </Button>
              <RenovarButton id={conv.id} />
              <AnularConvenioButton id={conv.id} />
            </>
          ) : null}
        </div>
      </header>

      {/* 1. Datos del convenio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del convenio</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 md:grid-cols-3 text-sm">
            <DLItem label="Razón social" value={detalle?.razonSocial ?? empresa.nombre} />
            <DLItem label="NIT empresa" value={detalle?.nitEmpresa ?? "—"} />
            <DLItem label="NRC" value={detalle?.nrc ?? "—"} />
            <DLItem label="Giro" value={detalle?.giro ?? "—"} />
            <DLItem label="Rubro" value={detalle?.rubro ?? "—"} />
            <DLItem label="Personería" value={detalle?.personeria ?? "—"} />
            <DLItem label="Representante legal" value={detalle?.representanteLegal ?? "—"} />
            <DLItem label="Ciudad / dirección" value={[empresa.ciudad, empresa.direccion].filter(Boolean).join(", ") || "—"} />
            <DLItem label="Correo" value={empresa.correo ?? "—"} />

            <DLItem label="Fecha de firma" value={fmtFecha.format(conv.fechaFirma)} />
            <DLItem label="Ciudad de firma" value={conv.ciudadFirma ?? "—"} />
            <DLItem label="Monto total" value={formatMoney(conv.montoTotal)} highlight />
          </dl>

          <div className="mt-5 pt-4 border-t border-border grid gap-4 md:grid-cols-4 text-sm">
            <DLItem
              label="Conferencias plan"
              value={`${sesionesProgramadas.length} de ${cantidadEsperada}`}
              highlight
            />
            <DLItem label="Horas de coaching" value={`${conv.plan.horasCoaching}h`} />
            <DLItem label="Precio mensual" value={formatMoney(conv.plan.precio)} />
            <DLItem
              label="Descuento extras"
              value={`${Number(conv.plan.descuentoExtras)}%`}
            />
          </div>

          {conv.notas ? (
            <div className="mt-5 pt-4 border-t border-border">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                Notas
              </p>
              <p className="text-sm">{conv.notas}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* 2. Sesiones */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Sesiones programadas</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {sesionesProgramadas.length} de {cantidadEsperada} conferencias del plan
            </p>
          </div>
          <SesionFormToggle
            convenioId={conv.id}
            empresaNombre={empresaNombre}
            conferencias={conferencias}
            onSubmit={onCrearSesion}
          />
        </CardHeader>
        <CardContent>
          {conv.sesiones.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-6 text-center">
              Aún no hay sesiones programadas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Conferencia</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Ponente</TableHead>
                  <TableHead className="text-right">Asist.</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conv.sesiones.map((s) => {
                  const variant = ESTADO_BADGE_VARIANT[s.estado];
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{fmtFechaCorta.format(s.fecha)}</TableCell>
                      <TableCell className="text-xs">{fmtHora.format(s.fecha)}</TableCell>
                      <TableCell className="font-medium">{s.conferencia.titulo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.conferencia.categoria}</TableCell>
                      <TableCell className="text-xs">{MODALIDAD_LABEL[s.modalidad]}</TableCell>
                      <TableCell className="text-xs">{s.ponente ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.asistentes}</TableCell>
                      <TableCell>
                        <Badge variant={variant}>{s.estado}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {s.estado === "PROGRAMADA" ? (
                          <>
                            <form action={marcarRealizadaForm.bind(null, s.id)} className="inline">
                              <SubmitButton variant="outline" size="sm" className="h-7 text-xs" pendingLabel="...">
                                Realizada
                              </SubmitButton>
                            </form>
                            <form action={cancelarSesionForm.bind(null, s.id)} className="inline">
                              <SubmitButton variant="outline" size="sm" className="h-7 text-xs" pendingLabel="...">
                                Cancelar
                              </SubmitButton>
                            </form>
                            <form action={eliminarSesionFormAction.bind(null, s.id)} className="inline">
                              <SubmitButton
                                variant="destructive"
                                size="sm"
                                className="h-7 text-xs"
                                pendingLabel="..."
                                confirm="¿Eliminar definitivamente esta sesión?"
                              >
                                Eliminar
                              </SubmitButton>
                            </form>
                          </>
                        ) : s.estado === "CANCELADA" ? (
                          <form action={eliminarSesionFormAction.bind(null, s.id)} className="inline">
                            <SubmitButton
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              pendingLabel="..."
                              confirm="¿Eliminar esta sesión cancelada?"
                            >
                              Eliminar
                            </SubmitButton>
                          </form>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 3. Cobranza */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cobranza mensual (vista derivada)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Ingresos del donante en cada mes, comparados contra el precio mensual del plan.
            Las donaciones puntuales fuera del convenio también suman aquí.
          </p>
        </CardHeader>
        <CardContent>
          {cobranza ? (
            <CobranzaTable resumen={cobranza} />
          ) : (
            <p className="text-sm text-muted-foreground italic">No se pudo calcular la cobranza.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DLItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={
          highlight
            ? "text-base font-semibold text-foreground tabular-nums"
            : "text-sm text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
