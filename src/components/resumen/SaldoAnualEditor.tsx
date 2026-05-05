"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertSaldoAnualInicial } from "@/server/actions/resumen";

function fmt(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-SV", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export function SaldoAnualEditor({
  anio,
  saldoActual,
}: {
  anio: number;
  saldoActual: string;
}) {
  const [val, setVal] = useState(saldoActual);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const save = () => {
    if (val === saldoActual) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const r = await upsertSaldoAnualInicial({ anio, monto: val || "0" });
      if (!r.ok) {
        alert(r.error);
        setVal(saldoActual);
      } else {
        router.refresh();
      }
      setEditing(false);
    });
  };

  return (
    <div className="text-right">
      <div className="text-xs text-muted-foreground mb-1">
        Saldo año anterior ({anio - 1})
      </div>
      {editing ? (
        <input
          type="text"
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setVal(saldoActual);
              setEditing(false);
            }
          }}
          disabled={pending}
          className="w-32 px-2 py-1 border border-primary rounded text-right text-sm"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-base font-semibold hover:bg-accent/50 px-2 py-1 rounded transition"
          title="Click para editar"
        >
          {fmt(saldoActual)}
        </button>
      )}
    </div>
  );
}
