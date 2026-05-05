"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ConferenciaCatalogo } from "@prisma/client";

type Props = {
  initial?: ConferenciaCatalogo | null;
  categoriasExistentes: string[];
  onSubmit: (formData: FormData) => Promise<{
    ok: boolean;
    error?: string;
    fieldErrors?: Record<string, string[]>;
  }>;
  onCancel?: () => void;
};

export function ConferenciaForm({
  initial,
  categoriasExistentes,
  onSubmit,
  onCancel,
}: Props) {
  const router = useRouter();
  const [usarOtra, setUsarOtra] = useState(false);
  const [pending, setPending] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setGlobalError(null);
    setFieldErrors({});
    if (usarOtra) {
      const otra = formData.get("categoriaOtra")?.toString() ?? "";
      formData.set("categoria", otra);
    }
    formData.delete("categoriaOtra");
    const res = await onSubmit(formData);
    setPending(false);
    if (!res.ok) {
      setGlobalError(res.error ?? "Error al guardar");
      setFieldErrors(res.fieldErrors ?? {});
      return;
    }
    router.refresh();
    if (onCancel) onCancel();
  }

  const e = (k: string) => fieldErrors[k]?.[0];

  return (
    <form action={handleSubmit} className="space-y-4 rounded-md border border-border bg-card p-4">
      {globalError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {globalError}
        </div>
      ) : null}

      <div>
        <Label htmlFor="titulo">Título *</Label>
        <Input
          id="titulo"
          name="titulo"
          required
          defaultValue={initial?.titulo ?? ""}
        />
        {e("titulo") ? (
          <p className="text-xs text-destructive mt-1">{e("titulo")}</p>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="categoria">Categoría *</Label>
          {usarOtra ? (
            <Input
              name="categoriaOtra"
              required
              placeholder="Nueva categoría"
              autoFocus
            />
          ) : (
            <Select
              id="categoria"
              name="categoria"
              required
              defaultValue={initial?.categoria ?? ""}
            >
              <option value="">— Seleccionar —</option>
              {categoriasExistentes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          )}
          <button
            type="button"
            className="text-xs text-primary mt-1 hover:underline"
            onClick={() => setUsarOtra(!usarOtra)}
          >
            {usarOtra ? "← Usar categoría existente" : "+ Usar nueva categoría"}
          </button>
          {e("categoria") ? (
            <p className="text-xs text-destructive mt-1">{e("categoria")}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="duracionMin">Duración (min)</Label>
          <Input
            id="duracionMin"
            name="duracionMin"
            type="number"
            min={15}
            max={480}
            defaultValue={initial?.duracionMin ?? 60}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea
          id="descripcion"
          name="descripcion"
          rows={2}
          defaultValue={initial?.descripcion ?? ""}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="activo"
          name="activo"
          type="checkbox"
          value="true"
          defaultChecked={initial?.activo ?? true}
        />
        <Label htmlFor="activo">Activa (aparece al programar sesiones)</Label>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-border">
        {onCancel ? (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Guardando..." : initial ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}
