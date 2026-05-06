import Link from "next/link";
import { listarDonantes } from "@/server/actions/donantes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TipoDonante } from "@prisma/client";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<TipoDonante, string> = {
  COOPERADOR: "Cooperador",
  SUPERNUMERARIO: "Supernumerario",
  EMPRESA_FE: "Empresa FE",
  OCASIONAL: "Ocasional",
  NUMERARIO: "Numerario",
};

export default async function DonantesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const donantes = await listarDonantes({
    q: sp.q,
    tipo: sp.tipo as TipoDonante | undefined,
    estado: sp.estado as "ACTIVO" | "PAUSADO" | "INACTIVO" | undefined,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Donantes</h1>
          <p className="text-muted-foreground">
            Cooperadores, supernumerarios, empresas FE y donantes ocasionales.
          </p>
        </div>
        <Button asChild>
          <Link href="/donantes/nuevo">+ Nuevo donante</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-sm font-medium" htmlFor="q">Búsqueda</label>
              <input
                id="q"
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="Nombre, DUI, NIT, correo"
                className="block h-10 rounded-md border border-input bg-background px-3 text-sm w-72"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="tipo">Tipo</label>
              <select id="tipo" name="tipo" defaultValue={sp.tipo ?? ""}
                className="block h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Todos</option>
                <option value="COOPERADOR">Cooperador</option>
                <option value="SUPERNUMERARIO">Supernumerario</option>
                <option value="EMPRESA_FE">Empresa FE</option>
                <option value="OCASIONAL">Ocasional</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="estado">Estado</label>
              <select id="estado" name="estado" defaultValue={sp.estado ?? ""}
                className="block h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Todos</option>
                <option value="ACTIVO">Activo</option>
                <option value="PAUSADO">Pausado</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </div>
            <Button type="submit" variant="outline">Filtrar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado ({donantes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>DUI / NIT</TableHead>
                <TableHead>Plan FE</TableHead>
                <TableHead>AFCYD</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donantes.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link href={`/donantes/${d.id}`} className="font-medium hover:underline">
                      {d.nombre}
                    </Link>
                  </TableCell>
                  <TableCell>{TIPO_LABEL[d.tipo]}</TableCell>
                  <TableCell className="text-xs">
                    {d.dui ? <div>DUI: {d.dui}</div> : null}
                    {d.nit ? <div>NIT: {d.nit}</div> : null}
                    {d.empresaDetalle?.nitEmpresa ? <div>NIT emp: {d.empresaDetalle.nitEmpresa}</div> : null}
                  </TableCell>
                  <TableCell>
                    {d.empresaDetalle?.planFE ? (
                      <Badge variant="default">{d.empresaDetalle.planFE}</Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {d.entregaReciboFiscal ? <Badge variant="success">Sí</Badge> : <span className="text-muted-foreground">No</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.estado === "ACTIVO" ? "success" : d.estado === "PAUSADO" ? "warning" : "secondary"}>
                      {d.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/donantes/${d.id}`}>Ver / editar</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {donantes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Sin resultados.
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
