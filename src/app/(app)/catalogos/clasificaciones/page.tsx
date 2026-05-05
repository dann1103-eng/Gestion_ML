import {
  listarClasificaciones,
  crearClasificacionForm,
  toggleClasificacionActiva,
} from "@/server/actions/catalogos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const dynamic = "force-dynamic";

export default async function ClasificacionesPage() {
  const items = await listarClasificaciones();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Clasificaciones</h1>
        <p className="text-muted-foreground">
          Etiquetas auxiliares para agrupar movimientos (Plan de viernes, Mantenimiento, etc.).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Nueva clasificación</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={crearClasificacionForm} className="flex gap-3 items-end">
            <div className="flex-1">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" required />
            </div>
            <div>
              <Label htmlFor="orden">Orden</Label>
              <Input id="orden" name="orden" type="number" defaultValue="0" className="w-20" />
            </div>
            <Button type="submit">Crear</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell>
                    <Badge variant={c.activo ? "success" : "secondary"}>
                      {c.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={toggleClasificacionActiva.bind(null, c.id)}>
                      <Button variant="outline" size="sm" type="submit">
                        {c.activo ? "Desactivar" : "Activar"}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
