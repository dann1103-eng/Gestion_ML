"use client";

import { useState } from "react";
import { SesionForm } from "@/components/forms/SesionForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { ConferenciaCatalogo } from "@prisma/client";

type Props = {
  convenioId: string;
  empresaNombre: string;
  conferencias: ConferenciaCatalogo[];
  onSubmit: (formData: FormData) => Promise<{
    ok: boolean;
    error?: string;
    fieldErrors?: Record<string, string[]>;
  }>;
};

export function SesionFormToggle({ convenioId, empresaNombre, conferencias, onSubmit }: Props) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
        <Plus size={14} className="mr-1" /> Programar sesión
      </Button>
    );
  }

  return (
    <SesionForm
      convenios={[{ id: convenioId, empresaNombre }]}
      conferencias={conferencias}
      defaultConvenioId={convenioId}
      onSubmit={onSubmit}
      onCancel={() => setAbierto(false)}
      submitLabel="Programar"
    />
  );
}
