"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { agregarPartida } from "@/server/actions/planillas";
import { useRouter } from "next/navigation";

type Props = {
  planillaId: string;
  empleadoId: string;
  onDone: () => void;
};

export function AgregarPartidaInline({ planillaId, empleadoId, onDone }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await agregarPartida(planillaId, empleadoId, formData);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Error al agregar");
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <form action={handleSubmit} className="flex items-end gap-2 pt-2">
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="w-40">
        <Select name="tipo" defaultValue="BONO" className="text-sm">
          <option value="BONO">Bono</option>
          <option value="HORA_EXTRA">Hora extra</option>
          <option value="DESCUENTO_OTRO">Descuento otro</option>
        </Select>
      </div>
      <div className="flex-1">
        <Input name="descripcion" placeholder="Descripción (opcional)" className="text-sm" />
      </div>
      <div className="w-28">
        <Input
          name="monto"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Monto"
          required
          className="text-sm"
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "..." : "Agregar"}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onDone}>
        Cancelar
      </Button>
    </form>
  );
}
