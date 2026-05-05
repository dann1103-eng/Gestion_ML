"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { anularConvenio } from "@/server/actions/convenios";

export function AnularConvenioButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const motivo = window.prompt(
      "Motivo de anulación (mínimo 3 caracteres):\n\nLas sesiones futuras se cancelarán automáticamente.",
    );
    if (!motivo || motivo.trim().length < 3) return;
    setError(null);
    startTransition(async () => {
      const res = await anularConvenio(id, motivo.trim());
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error ?? "Error anulando");
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={handleClick}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Anulando...
          </>
        ) : (
          "Anular"
        )}
      </Button>
      {error ? (
        <span className="text-xs text-red-600 ml-2">{error}</span>
      ) : null}
    </>
  );
}
