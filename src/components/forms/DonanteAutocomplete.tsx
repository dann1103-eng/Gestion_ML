"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { buscarDonantesAutocomplete } from "@/server/actions/donantes";

type Match = {
  id: string;
  nombre: string;
  tipo: string;
  dui: string | null;
  nit: string | null;
  entregaReciboFiscal: boolean;
};

type Props = {
  name?: string;
  defaultValue?: { id: string; nombre: string } | null;
  onChange?: (donante: Match | null) => void;
};

export function DonanteAutocomplete({ name = "donanteId", defaultValue, onChange }: Props) {
  const [query, setQuery] = useState(defaultValue?.nombre ?? "");
  const [selected, setSelected] = useState<{ id: string; nombre: string } | null>(
    defaultValue ?? null,
  );
  const [matches, setMatches] = useState<Match[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected && query === selected.nombre) {
      setMatches([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setMatches([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await buscarDonantesAutocomplete(query);
      setMatches(results);
    }, 250);
  }, [query, selected]);

  function pick(m: Match) {
    setSelected({ id: m.id, nombre: m.nombre });
    setQuery(m.nombre);
    setMatches([]);
    setOpen(false);
    onChange?.(m);
  }

  function clear() {
    setSelected(null);
    setQuery("");
    setMatches([]);
    onChange?.(null);
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar donante por nombre, DUI o NIT..."
        />
        {selected ? (
          <button
            type="button"
            onClick={clear}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        ) : null}
      </div>

      {open && matches.length > 0 ? (
        <ul className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-md border bg-popover shadow-md">
          {matches.map((m) => (
            <li
              key={m.id}
              onClick={() => pick(m)}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{m.nombre}</span>
                <span className="flex gap-1">
                  <Badge variant="outline">{m.tipo}</Badge>
                  {m.entregaReciboFiscal ? (
                    <Badge variant="success">AFCYD</Badge>
                  ) : null}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {m.dui ? `DUI ${m.dui}` : null}
                {m.dui && m.nit ? " · " : null}
                {m.nit ? `NIT ${m.nit}` : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
