import Link from "next/link";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const fmt = (v: string) => {
  const n = Number(v);
  if (n === 0) return "—";
  return n.toLocaleString("es-SV", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
};

const fmt2 = (v: string) =>
  Number(v).toLocaleString("es-SV", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

type Fila = {
  donanteId: string;
  nombre: string;
  aporteEsperado: string | null;
  mensual: string[];
  total: string;
};

export function ControlMatriz({
  titulo,
  modo,
  filas,
  totalesMensual,
  totalGeneral,
}: {
  titulo: string;
  modo: "ingreso" | "egreso";
  filas: Fila[];
  totalesMensual: string[];
  totalGeneral: string;
}) {
  const cumple = (mensual: string, esperado: string | null) => {
    if (modo !== "ingreso" || !esperado) return null;
    return Number(mensual) >= Number(esperado);
  };

  return (
    <div className="rounded-lg border overflow-x-auto">
      <h2 className="bg-primary text-primary-foreground px-4 py-2 font-semibold text-sm">
        {titulo}
      </h2>
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-xs">
          <tr>
            <th className="px-3 py-2 text-left">Donante</th>
            <th className="px-3 py-2 text-right">Esperado</th>
            {MESES.map((m) => (
              <th key={m} className="px-2 py-2 text-right">
                {m}
              </th>
            ))}
            <th className="px-3 py-2 text-right border-l">Total</th>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td colSpan={15} className="px-3 py-6 text-center text-muted-foreground italic">
                No hay donantes en este grupo.
              </td>
            </tr>
          )}
          {filas.map((f) => (
            <tr key={f.donanteId} className="border-b hover:bg-muted/40">
              <td className="px-3 py-1.5">
                <Link
                  href={`/donantes/${f.donanteId}`}
                  className="font-medium hover:underline"
                >
                  {f.nombre}
                </Link>
              </td>
              <td className="px-3 py-1.5 text-right text-muted-foreground tabular-nums">
                {f.aporteEsperado ? fmt2(f.aporteEsperado) : "—"}
              </td>
              {f.mensual.map((m, i) => {
                const ok = cumple(m, f.aporteEsperado);
                return (
                  <td
                    key={i}
                    className={`px-2 py-1.5 text-right text-xs tabular-nums ${
                      ok === true
                        ? "bg-green-50"
                        : ok === false && Number(m) > 0
                          ? "bg-amber-50"
                          : ok === false
                            ? "bg-red-50/40"
                            : ""
                    }`}
                  >
                    {fmt(m)}
                  </td>
                );
              })}
              <td className="px-3 py-1.5 text-right font-semibold tabular-nums border-l">
                {fmt(f.total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-primary/10 font-semibold">
          <tr>
            <td className="px-3 py-2">Total</td>
            <td></td>
            {totalesMensual.map((m, i) => (
              <td key={i} className="px-2 py-2 text-right text-xs tabular-nums">
                {fmt(m)}
              </td>
            ))}
            <td className="px-3 py-2 text-right tabular-nums border-l">
              {fmt2(totalGeneral)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
