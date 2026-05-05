"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ConferenciaForm } from "@/components/forms/ConferenciaForm";

type Props = {
  categorias: string[];
  onSubmit: (formData: FormData) => Promise<{
    ok: boolean;
    error?: string;
    fieldErrors?: Record<string, string[]>;
  }>;
};

export function NuevaConferenciaToggle({ categorias, onSubmit }: Props) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <Button onClick={() => setAbierto(true)}>
        <Plus size={14} className="mr-1" /> Nueva conferencia
      </Button>
    );
  }

  return (
    <ConferenciaForm
      categoriasExistentes={categorias}
      onSubmit={onSubmit}
      onCancel={() => setAbierto(false)}
    />
  );
}
