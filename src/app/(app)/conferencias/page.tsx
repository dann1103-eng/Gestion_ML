import {
  listarConferencias,
  listarCategoriasConferencias,
  crearConferencia,
  actualizarConferencia,
} from "@/server/actions/conferencias";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConferenciaItem } from "@/components/convenios/ConferenciaItem";
import { NuevaConferenciaToggle } from "@/components/convenios/NuevaConferenciaToggle";
import type { ConferenciaCatalogo } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ConferenciasPage() {
  const [conferencias, categorias] = await Promise.all([
    listarConferencias(),
    listarCategoriasConferencias(),
  ]);

  // Agrupar por categoría
  const porCategoria = new Map<string, ConferenciaCatalogo[]>();
  for (const c of conferencias) {
    const arr = porCategoria.get(c.categoria) ?? [];
    arr.push(c);
    porCategoria.set(c.categoria, arr);
  }

  async function onCrear(formData: FormData) {
    "use server";
    const res = await crearConferencia(formData);
    return res.ok
      ? { ok: true }
      : { ok: false, error: res.error, fieldErrors: res.fieldErrors };
  }

  async function onActualizar(id: string, formData: FormData) {
    "use server";
    const res = await actualizarConferencia(id, formData);
    return res.ok
      ? { ok: true }
      : { ok: false, error: res.error, fieldErrors: res.fieldErrors };
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Catálogo de Conferencias</h1>
          <p className="text-muted-foreground">
            {conferencias.length} conferencias en {porCategoria.size} categorías. Anexo II del convenio FE.
          </p>
        </div>
        <NuevaConferenciaToggle categorias={categorias} onSubmit={onCrear} />
      </header>

      <div className="space-y-6">
        {Array.from(porCategoria.entries()).map(([cat, lista]) => (
          <Card key={cat}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>{cat}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {lista.length} {lista.length === 1 ? "conferencia" : "conferencias"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {lista.map((c) => (
                <ConferenciaItem
                  key={c.id}
                  conferencia={c}
                  categorias={categorias}
                  onSubmit={onActualizar.bind(null, c.id)}
                />
              ))}
            </CardContent>
          </Card>
        ))}
        {conferencias.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            Catálogo vacío. Crea la primera conferencia con el botón superior derecho.
          </p>
        ) : null}
      </div>
    </div>
  );
}
