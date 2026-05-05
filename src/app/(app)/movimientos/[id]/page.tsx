import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerMovimiento, actualizarMovimiento, anularMovimientoForm } from "@/server/actions/movimientos";
import { listarCuentas } from "@/server/actions/cuentas";
import { listarConceptos, listarClasificaciones } from "@/server/actions/catalogos";
import { MovimientoForm } from "@/components/forms/MovimientoForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import { AdjuntosManager } from "@/components/forms/AdjuntosManager";

export default async function MovimientoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [m, conceptos, cuentas, clasificaciones] = await Promise.all([
    obtenerMovimiento(id),
    listarConceptos({ soloActivos: true }),
    listarCuentas(),
    listarClasificaciones({ soloActivas: true }),
  ]);
  if (!m) notFound();

  async function onSubmit(formData: FormData) {
    "use server";
    return actualizarMovimiento(id, formData);
  }

  const onAnular = anularMovimientoForm.bind(null, id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Movimiento {m.valeNumero}</h1>
          <p className="text-muted-foreground">
            {new Date(m.fecha).toLocaleDateString("es-SV")} · {formatMoney(m.monto)}
            {m.anulado ? " · ANULADO" : ""}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/movimientos">← Volver</Link>
        </Button>
      </header>

      {m.anulado ? (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm font-medium">Este movimiento está anulado.</p>
            {m.motivoAnulacion ? (
              <p className="text-sm text-muted-foreground mt-1">
                Motivo: {m.motivoAnulacion}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {m.movimientoAfcyd ? (
        <Card>
          <CardHeader>
            <CardTitle>Registro AFCYD asociado</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>
              Correlativo:{" "}
              <Badge variant={m.movimientoAfcyd.anulado ? "secondary" : "default"}>
                {m.movimientoAfcyd.correlativo}
              </Badge>
            </div>
            <div>Donante (snapshot): {m.movimientoAfcyd.snapshotNombre}</div>
            {m.movimientoAfcyd.snapshotDui ? <div>DUI: {m.movimientoAfcyd.snapshotDui}</div> : null}
            {m.movimientoAfcyd.snapshotNit ? <div>NIT: {m.movimientoAfcyd.snapshotNit}</div> : null}
            {m.movimientoAfcyd.snapshotCorreo ? <div>Correo: {m.movimientoAfcyd.snapshotCorreo}</div> : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Adjuntos ({m.adjuntos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AdjuntosManager movimientoId={m.id} adjuntos={m.adjuntos} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Editar</CardTitle>
        </CardHeader>
        <CardContent>
          <MovimientoForm
            initial={m}
            conceptos={conceptos}
            cuentas={cuentas.filter((c) => c.activo)}
            clasificaciones={clasificaciones}
            onSubmit={onSubmit}
            redirectTo={`/movimientos/${m.id}`}
            submitLabel="Guardar cambios"
          />
        </CardContent>
      </Card>

      {!m.anulado ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Anular movimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={onAnular} className="flex gap-3 items-end">
              <div className="flex-1">
                <Label htmlFor="motivoAnulacion">Motivo</Label>
                <Input
                  id="motivoAnulacion"
                  name="motivoAnulacion"
                  required
                  placeholder="Razón de la anulación"
                />
              </div>
              <SubmitButton
                variant="destructive"
                pendingLabel="Anulando..."
                confirm="¿Confirmas la anulación de este movimiento? Esta acción no se puede deshacer."
              >
                Anular
              </SubmitButton>
            </form>
            <p className="text-xs text-muted-foreground mt-2">
              Anular es lógico (no destructivo) y también anulará el registro AFCYD si existe.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Auditoría</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <div>
            Creado el {new Date(m.createdAt).toLocaleString("es-SV")}
            {m.createdBy ? ` por ${m.createdBy.nombre}` : ""}
          </div>
          <div>
            Actualizado el {new Date(m.updatedAt).toLocaleString("es-SV")}
            {m.updatedBy ? ` por ${m.updatedBy.nombre}` : ""}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
