import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import {
  listarMovimientos,
  type MovimientoFilters,
} from "@/server/actions/movimientos";
import { listarCuentas } from "@/server/actions/cuentas";
import { listarConceptos } from "@/server/actions/catalogos";
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
import { formatMoney } from "@/lib/money";
import type { TipoMovimiento } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const now = new Date();

  const filters: MovimientoFilters = {
    anio: sp.anio ? Number(sp.anio) : now.getUTCFullYear(),
    mes: sp.mes ? Number(sp.mes) : now.getUTCMonth() + 1,
    tipo: (sp.tipo as TipoMovimiento) || undefined,
    cuentaId: sp.cuentaId || undefined,
    conceptoId: sp.conceptoId || undefined,
    q: sp.q || undefined,
    page: sp.page ? Number(sp.page) : 1,
    pageSize: 50,
  };

  const exportParams = new URLSearchParams();
  if (filters.anio)       exportParams.set("anio", String(filters.anio));
  if (filters.mes)        exportParams.set("mes", String(filters.mes));
  if (filters.tipo)       exportParams.set("tipo", filters.tipo);
  if (filters.cuentaId)   exportParams.set("cuentaId", filters.cuentaId);
  if (filters.conceptoId) exportParams.set("conceptoId", filters.conceptoId);
  if (filters.q)          exportParams.set("q", filters.q);
  const csvHref = `/api/movimientos/csv?${exportParams.toString()}`;

  const [{ items, total, page, pageSize }, cuentas, conceptos] = await Promise.all([
    listarMovimientos(filters),
    listarCuentas(),
    listarConceptos(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const ingresos = items
    .filter((m) => m.tipo === "INGRESO")
    .reduce((s, m) => s + Number(m.monto), 0);
  const egresos = items
    .filter((m) => m.tipo === "EGRESO")
    .reduce((s, m) => s + Number(m.monto), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Movimientos</h1>
          <p className="text-muted-foreground">
            Ingresos y egresos. Mostrando {items.length} de {total} resultados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={csvHref}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar CSV
          </a>
          <Button asChild>
            <Link href="/movimientos/nuevo">+ Nuevo movimiento</Link>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Ingresos (vista actual)</p>
            <p className="text-2xl font-bold text-green-700">{formatMoney(ingresos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Egresos (vista actual)</p>
            <p className="text-2xl font-bold text-red-700">{formatMoney(egresos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Diferencia</p>
            <p className="text-2xl font-bold">{formatMoney(ingresos - egresos)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-sm font-medium">Año</label>
              <input
                name="anio"
                type="number"
                defaultValue={filters.anio}
                className="block h-10 w-24 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mes</label>
              <select
                name="mes"
                defaultValue={filters.mes}
                className="block h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <select
                name="tipo"
                defaultValue={filters.tipo ?? ""}
                className="block h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Todos</option>
                <option value="INGRESO">Ingreso</option>
                <option value="EGRESO">Egreso</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Cuenta</label>
              <select
                name="cuentaId"
                defaultValue={filters.cuentaId ?? ""}
                className="block h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Todas</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Concepto</label>
              <select
                name="conceptoId"
                defaultValue={filters.conceptoId ?? ""}
                className="block h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Todos</option>
                {conceptos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="text-sm font-medium">Búsqueda</label>
              <input
                name="q"
                defaultValue={filters.q ?? ""}
                placeholder="Descripción o vale"
                className="block h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <Button type="submit" variant="outline">Filtrar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vale</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>Donante</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>AFCYD</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.valeNumero}</TableCell>
                  <TableCell>{new Date(m.fecha).toLocaleDateString("es-SV")}</TableCell>
                  <TableCell>
                    <Badge variant={m.tipo === "INGRESO" ? "success" : "secondary"}>
                      {m.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>{m.concepto.nombre}</TableCell>
                  <TableCell className="max-w-[260px]">
                    <span className="block truncate text-sm" title={m.descripcion ?? ""}>
                      {m.descripcion || "—"}
                    </span>
                    {m.notas ? (
                      <span className="block text-[11px] text-muted-foreground truncate" title={m.notas}>
                        {m.notas}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs">{m.cuenta.nombre}</TableCell>
                  <TableCell className="text-xs">{m.donante?.nombre ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(m.monto)}
                  </TableCell>
                  <TableCell>
                    {m.movimientoAfcyd ? (
                      <Badge variant={m.movimientoAfcyd.anulado ? "secondary" : "default"}>
                        {m.movimientoAfcyd.correlativo}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/movimientos/${m.id}`}>Ver</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    Sin movimientos en este período.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          {totalPages > 1 ? (
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`?${new URLSearchParams({ ...sp, page: String(page - 1) })}`}>
                      ← Anterior
                    </Link>
                  </Button>
                ) : null}
                {page < totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`?${new URLSearchParams({ ...sp, page: String(page + 1) })}`}>
                      Siguiente →
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
