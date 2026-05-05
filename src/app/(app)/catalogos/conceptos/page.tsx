import { listarConceptos, crearConceptoForm, toggleConceptoActivo } from "@/server/actions/catalogos";
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

export const dynamic = "force-dynamic";

export default async function ConceptosPage() {
  const conceptos = await listarConceptos();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Conceptos</h1>
        <p className="text-muted-foreground">
          Catálogo de conceptos de ingreso y egreso. El flag &quot;genera AFCYD&quot; sugiere
          si el concepto suele requerir respaldo fiscal (la decisión final viene
          del flag del donante).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo concepto</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={crearConceptoForm} className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" required />
            </div>
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select id="tipo" name="tipo" required defaultValue="EGRESO">
                <option value="INGRESO">Ingreso</option>
                <option value="EGRESO">Egreso</option>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <input id="generaAfcyd" name="generaAfcyd" type="checkbox" value="true" />
              <Label htmlFor="generaAfcyd">Genera AFCYD</Label>
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Crear concepto</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado ({conceptos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>AFCYD</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conceptos.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell>
                    <Badge variant={c.tipo === "INGRESO" ? "success" : "secondary"}>
                      {c.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {c.generaAfcyd ? <Badge variant="default">Sí</Badge> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.activo ? "success" : "secondary"}>
                      {c.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={toggleConceptoActivo.bind(null, c.id)}>
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
