"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConferenciaForm } from "@/components/forms/ConferenciaForm";
import type { ConferenciaCatalogo } from "@prisma/client";
import { Edit3 } from "lucide-react";

type Props = {
  conferencia: ConferenciaCatalogo;
  categorias: string[];
  onSubmit: (formData: FormData) => Promise<{
    ok: boolean;
    error?: string;
    fieldErrors?: Record<string, string[]>;
  }>;
};

export function ConferenciaItem({ conferencia, categorias, onSubmit }: Props) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <div className="py-2">
        <ConferenciaForm
          initial={conferencia}
          categoriasExistentes={categorias}
          onSubmit={onSubmit}
          onCancel={() => setEditando(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-muted/30 rounded-md gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{conferencia.titulo}</span>
          {!conferencia.activo ? (
            <Badge variant="secondary">Inactiva</Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>{conferencia.codigo}</span>
          <span>·</span>
          <span>{conferencia.duracionMin} min</span>
          {conferencia.descripcion ? (
            <>
              <span>·</span>
              <span className="truncate">{conferencia.descripcion}</span>
            </>
          ) : null}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
        <Edit3 size={12} />
      </Button>
    </div>
  );
}
