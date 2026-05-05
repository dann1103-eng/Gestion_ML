import { Badge } from "@/components/ui/badge";
import { estadoConvenio, diasRestantes } from "@/lib/convenios/estado";

export function ConvenioStatusBadge({ fechaFin }: { fechaFin: Date }) {
  const estado = estadoConvenio(fechaFin);
  const dias = diasRestantes(fechaFin);

  if (estado === "VENCIDO") {
    return <Badge variant="destructive">Vencido hace {Math.abs(dias)}d</Badge>;
  }
  if (estado === "POR_VENCER") {
    return <Badge variant="warning">Vence en {dias}d</Badge>;
  }
  return <Badge variant="success">Vigente</Badge>;
}

export function PlanBadge({ tipo }: { tipo: "GOLD" | "SILVER" | "BRONCE" }) {
  const cls =
    tipo === "GOLD"
      ? "bg-amber-100 text-amber-900 border-amber-300"
      : tipo === "SILVER"
        ? "bg-slate-100 text-slate-800 border-slate-300"
        : "bg-orange-100 text-orange-900 border-orange-300";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide ${cls}`}
    >
      {tipo}
    </span>
  );
}
