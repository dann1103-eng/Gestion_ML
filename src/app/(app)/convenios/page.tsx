import Link from "next/link";
import { listarConvenios } from "@/server/actions/convenios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConvenioStatusBadge, PlanBadge } from "@/components/convenios/ConvenioStatusBadge";
import { Badge } from "@/components/ui/badge";
import type { TipoPlan } from "@prisma/client";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const fmtFecha = new Intl.DateTimeFormat("es-SV", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function ConveniosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; estado?: string; anio?: string; mostrarAnulados?: string }>;
}) {
  const sp = await searchParams;
  const anio = sp.anio ? Number(sp.anio) : undefined;
  const incluirAnulados = sp.mostrarAnulados === "1";
  const convenios = await listarConvenios({
    q: sp.q,
    anio,
    plan: sp.plan as TipoPlan | undefined,
    estado: (sp.estado as "VIGENTE" | "POR_VENCER" | "VENCIDO" | "TODOS" | undefined) ?? undefined,
    incluirAnulados,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Convenios FE</h1>
          <p className="text-muted-foreground">
            Convenios de Formación Empresarial firmados con empresas.
          </p>
        </div>
        <Button asChild>
          <Link href="/convenios/nuevo">+ Nuevo convenio</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-sm font-medium" htmlFor="q">Empresa</label>
              <input
                id="q"
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="Razón social..."
                className="block h-10 rounded-md border border-input bg-background px-3 text-sm w-64"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="plan">Plan</label>
              <select
                id="plan"
                name="plan"
                defaultValue={sp.plan ?? ""}
                className="block h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Todos</option>
                <option value="GOLD">Gold</option>
                <option value="SILVER">Silver</option>
                <option value="BRONCE">Bronce</option>
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
                <option value="VIGENTE">Vigentes</option>
                <option value="POR_VENCER">Por vencer (30d)</option>
                <option value="VENCIDO">Vencidos</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="anio">Año firma</label>
              <input
                id="anio"
                name="anio"
                type="number"
                min="2020"
                max="2100"
                defaultValue={sp.anio ?? ""}
                placeholder="2026"
                className="block h-10 rounded-md border border-input bg-background px-3 text-sm w-24"
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium pb-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="mostrarAnulados"
                value="1"
                defaultChecked={incluirAnulados}
                className="h-4 w-4 accent-primary"
              />
              Mostrar anulados
            </label>
            <Button type="submit" variant="outline">Filtrar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado ({convenios.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Firma</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {convenios.map((c) => {
                const empresaNombre =
                  c.donante.empresaDetalle?.razonSocial ?? c.donante.nombre;
                return (
                  <TableRow key={c.id} className={c.anulado ? "opacity-60" : ""}>
                    <TableCell>
                      <Link href={`/convenios/${c.id}`} className="font-medium hover:underline">
                        {empresaNombre}
                      </Link>
                      {c.version > 1 ? (
                        <span className="text-xs text-muted-foreground ml-1.5">
                          v{c.version}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <PlanBadge tipo={c.plan.tipo} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtFecha.format(c.fechaFirma)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {fmtFecha.format(c.fechaInicio)} → {fmtFecha.format(c.fechaFin)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(c.montoTotal)}
                    </TableCell>
                    <TableCell>
                      {c.anulado ? (
                        <Badge variant="destructive">ANULADO</Badge>
                      ) : (
                        <ConvenioStatusBadge fechaFin={c.fechaFin} />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/convenios/${c.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {convenios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Sin convenios. Crea el primero con el botón superior derecho.
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
