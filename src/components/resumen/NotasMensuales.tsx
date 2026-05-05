"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertNotaMensual } from "@/server/actions/resumen";

const TITULOS = {
  INGRESOS: "Observaciones — Ingresos",
  EGRESOS: "Observaciones — Egresos",
} as const;

export function NotasMensuales({
  anio,
  mes,
  seccion,
  texto,
}: {
  anio: number;
  mes: number;
  seccion: "INGRESOS" | "EGRESOS";
  texto: string;
}) {
  const [val, setVal] = useState(texto);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const router = useRouter();

  const guardar = () => {
    if (val === texto) return;
    startTransition(async () => {
      const r = await upsertNotaMensual({ anio, mes, seccion, texto: val });
      if (!r.ok) alert(r.error);
      else {
        setSavedAt(new Date().toLocaleTimeString("es-SV"));
        router.refresh();
      }
    });
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">{TITULOS[seccion]}</h3>
        {savedAt && (
          <span className="text-xs text-muted-foreground">
            Guardado a las {savedAt}
          </span>
        )}
      </div>
      <textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={guardar}
        disabled={pending}
        rows={4}
        placeholder="Notas, comentarios, contexto del mes…"
        className="w-full rounded border border-input px-3 py-2 text-sm bg-background resize-y"
      />
    </div>
  );
}
