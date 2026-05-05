import { listarCuentas, crearCuentaForm, toggleCuentaActiva } from "@/server/actions/cuentas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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

export const dynamic = "force-dynamic";

export default async function CuentasPage() {
  const cuentas = await listarCuentas();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Cuentas</h1>
        <p className="text-muted-foreground">
          Caja chica y cuentas bancarias. Cada movimiento se enlaza a una cuenta.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Nueva cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={crearCuentaForm} className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" required />
            </div>
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select id="tipo" name="tipo" required defaultValue="CAJA_CHICA">
                <option value="CAJA_CHICA">Caja Chica</option>
                <option value="BANCO">Banco</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="banco">Banco (opcional)</Label>
              <Input id="banco" name="banco" />
            </div>
            <div>
              <Label htmlFor="numeroCuenta">Número de cuenta (opcional)</Label>
              <Input id="numeroCuenta" name="numeroCuenta" />
            </div>
            <div>
              <Label htmlFor="saldoInicial">Saldo inicial</Label>
              <Input
                id="saldoInicial"
                name="saldoInicial"
                type="number"
                step="0.01"
                defaultValue="0"
              />
            </div>
            <div>
              <Label htmlFor="orden">Orden</Label>
              <Input id="orden" name="orden" type="number" defaultValue="0" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Crear cuenta</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Saldo inicial</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cuentas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell>
                    {c.tipo === "CAJA_CHICA" ? "Caja chica" : "Banco"}
                  </TableCell>
                  <TableCell>{c.banco ?? "—"}</TableCell>
                  <TableCell>{formatMoney(c.saldoInicial)}</TableCell>
                  <TableCell>
                    <Badge variant={c.activo ? "success" : "secondary"}>
                      {c.activo ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={toggleCuentaActiva.bind(null, c.id)}>
                      <Button variant="outline" size="sm" type="submit">
                        {c.activo ? "Desactivar" : "Activar"}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {cuentas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Sin cuentas. Crea la primera arriba.
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
