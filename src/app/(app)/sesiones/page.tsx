import Link from "next/link";
import {
  listarSesiones,
  cambiarEstadoSesion,
  eliminarSesion,
} from "@/server/actions/sesiones";
import { listarCategoriasConferencias } from "@/server/actions/conferencias";
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
import type { EstadoSesion, ModalidadSesion } from "@prisma/client";

export const dynamic = "force-dynamic";

const fmtFecha = new Intl.DateTimeFormat("es-SV", {
  day: "2-digit",
  month: "short",
});

const fmtHora = new Intl.DateTimeFormat("es-SV", {
  hour: "2-digit",
  minute: "2-digit",
});

const ESTADO_VARIANT: Record<EstadoSesion, "default" | "success" | "secondary"> = {
  PROGRAMADA: "default",
  REALIZADA: "success",
  CANCELADA: "secondary",
};

const MODALIDAD_LABEL: Record<ModalidadSesion, string> = {
  PRESENCIAL: "Presencial",
  VIRTUAL: "Virtual",
  HIBRIDA: "Híbrida",
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function SesionesPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string; estado?: string; modalidad?: string; categoria?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const anio = sp.anio ? Number(sp.anio) : now.getUTCFullYear();
  const mes = sp.mes ? Number(sp.mes) : now.getUTCMonth() + 1;

  const [sesiones, categorias] = await Promise.all([
    listarSesiones({
      anio,
      mes,
      estado: sp.estado as EstadoSesion | undefined,
      modalidad: sp.modalidad as ModalidadSesion | undefined,
      categoria: sp.categoria,
    }),
    listarCategoriasConferencias(),
  ]);

  async function marcarRealizada(id: string) {
    "use server";
    await cambiarEstadoSesion(id, "REALIZADA");
  }

  async function cancelar(id: string) {
    "use server";
    await cambiarEstadoSesion(id, "CANCELADA");
  }

  async function eliminarSesionAction(id: string) {
    "use server";
    await eliminarSesion(id);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Sesiones FE</h1>
          <p className="text-muted-foreground">
            Sesiones programadas, realizadas y canceladas — vista cross-convenio.
          </p>
        </div>
        <Button asChild>
          <Link href="/sesiones/nueva">+ Programar sesión</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-sm font-medium" htmlFor="anio">Año</label>
              <select
                id="anio"
                name="anio"
                defaultValue={anio}
                className="block h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Array.from({ length: 6 }, (_, i) => now.getUTCFullYear() - 2 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="mes">Mes</label>
              <select
                id="mes"
                name="mes"
                defaultValue={mes}
                className="block h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {MESES.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="estado">Estado</label>
              <select
                id="estado"
                name="estado"
                defaultValue={sp.estado ?? ""}
                className="block h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Todos</option>
                <option value="PROGRAMADA">Programada</option>
                <option value="REALIZADA">Realizada</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="modalidad">Modalidad</label>
              <select
                id="modalidad"
                name="modalidad"
                defaultValue={sp.modalidad ?? ""}
                className="block h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Todas</option>
                <option value="PRESENCIAL">Presencial</option>
                <option value="VIRTUAL">Virtual</option>
                <option value="HIBRIDA">Híbrida</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="categoria">Categoría</label>
              <select
                id="categoria"
                name="categoria"
                defaultValue={sp.categoria ?? ""}
                className="block h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="outline">Filtrar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {MESES[mes - 1]} {anio} ({sesiones.length} sesiones)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Empresa</TableHead>
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
              {sesiones.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">{fmtFecha.format(s.fecha)}</TableCell>
                  <TableCell className="text-xs">{fmtHora.format(s.fecha)}</TableCell>
                  <TableCell>
                    <Link
                      href={`/convenios/${s.convenioId}`}
                      className="font-medium hover:underline"
                    >
                      {s.convenio.donante.nombre}
                    </Link>
                  </TableCell>
                  <TableCell>{s.conferencia.titulo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.conferencia.categoria}
                  </TableCell>
                  <TableCell className="text-xs">{MODALIDAD_LABEL[s.modalidad]}</TableCell>
                  <TableCell className="text-xs">{s.ponente ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.asistentes}</TableCell>
                  <TableCell>
                    <Badge variant={ESTADO_VARIANT[s.estado]}>{s.estado}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {s.estado === "PROGRAMADA" ? (
                      <>
                        <form action={marcarRealizada.bind(null, s.id)} className="inline">
                          <SubmitButton variant="outline" size="sm" className="h-7 text-xs" pendingLabel="...">
                            Realizada
                          </SubmitButton>
                        </form>
                        <form action={cancelar.bind(null, s.id)} className="inline">
                          <SubmitButton variant="outline" size="sm" className="h-7 text-xs" pendingLabel="...">
                            Cancelar
                          </SubmitButton>
                        </form>
                        <form action={eliminarSesionAction.bind(null, s.id)} className="inline">
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
                      <form action={eliminarSesionAction.bind(null, s.id)} className="inline">
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
                    ) : (
                      <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                        <Link href={`/convenios/${s.convenioId}`}>Ver convenio</Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {sesiones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    Sin sesiones en este período.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
