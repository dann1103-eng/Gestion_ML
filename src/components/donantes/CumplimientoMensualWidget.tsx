type SerCumplimiento = {
  mes: number;
  estado: "AL_DIA" | "ATRASADO" | "NO_APLICA";
  aportadoMes: string;
  esperado: string | null;
};

const MESES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const fmt = (v: string) =>
  Number(v).toLocaleString("es-SV", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

const ESTILOS = {
  AL_DIA: { bg: "bg-green-100", text: "text-green-800", icon: "✓" },
  ATRASADO: { bg: "bg-red-100", text: "text-red-800", icon: "✗" },
  NO_APLICA: { bg: "bg-muted", text: "text-muted-foreground", icon: "—" },
} as const;

export function CumplimientoMensualWidget({
  aporteEsperado,
  cumplimiento,
  anio,
}: {
  donanteId: string;
  aporteEsperado: string;
  cumplimiento: SerCumplimiento[];
  anio: number;
}) {
  const atrasados = cumplimiento.filter((c) => c.estado === "ATRASADO").length;
  const alDia = cumplimiento.filter((c) => c.estado === "AL_DIA").length;
  const aportadoTotal = cumplimiento.reduce(
    (s, c) => s + Number(c.aportadoMes),
    0,
  );

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Cumplimiento mensual {anio}</h2>
        <p className="text-sm text-muted-foreground">
          Aporte esperado:{" "}
          <strong className="text-foreground">{fmt(aporteEsperado)}</strong> / mes
        </p>
      </div>

      <div className="flex gap-4 text-sm">
        <div>
          <span className="text-green-700 font-semibold">{alDia}</span>{" "}
          <span className="text-muted-foreground">al día</span>
        </div>
        <div>
          <span className="text-red-700 font-semibold">{atrasados}</span>{" "}
          <span className="text-muted-foreground">atrasados</span>
        </div>
        <div className="ml-auto">
          <span className="text-muted-foreground">Total recibido: </span>
          <strong>{fmt(aportadoTotal.toString())}</strong>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
        {cumplimiento.map((c) => {
          const est = ESTILOS[c.estado];
          return (
            <div
              key={c.mes}
              className={`rounded-md p-2 text-center ${est.bg}`}
              title={`${MESES[c.mes - 1]}: aportado ${fmt(c.aportadoMes)}${c.esperado ? ` / esperado ${fmt(c.esperado)}` : ""}`}
            >
              <div className="text-xs text-muted-foreground">
                {MESES[c.mes - 1]}
              </div>
              <div className={`text-lg font-bold ${est.text}`}>{est.icon}</div>
              <div className="text-[10px] tabular-nums text-muted-foreground">
                {Number(c.aportadoMes) > 0
                  ? `$${Number(c.aportadoMes).toFixed(0)}`
                  : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
