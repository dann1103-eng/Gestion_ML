import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { TipoDonante } from "@prisma/client";
import { getControl } from "@/lib/control/queries";
import { ControlMatriz } from "@/components/control/ControlMatriz";

export const dynamic = "force-dynamic";

type Vista = "supernumerarios" | "numerarios" | "club";

const VISTAS: {
  key: Vista;
  label: string;
  titulo: string;
  descripcion: string;
  tipos: TipoDonante[];
  modos: ("ingreso" | "egreso")[];
}[] = [
  {
    key: "supernumerarios",
    label: "Supernumerarios y cooperadores",
    titulo: "Mensualidades supernumerarios y cooperadores",
    descripcion:
      "Verde = cumplió aporte esperado · ámbar = pagó pero por debajo · rojo = no aportó",
    tipos: [TipoDonante.SUPERNUMERARIO, TipoDonante.COOPERADOR],
    modos: ["ingreso"],
  },
  {
    key: "numerarios",
    label: "Numerarios",
    titulo: "Numerarios",
    descripcion:
      "Aporte mensual a la caja del centro y pago de pensión a FESAL por cada numerario",
    tipos: [TipoDonante.NUMERARIO],
    modos: ["ingreso", "egreso"],
  },
  {
    key: "club",
    label: "Club",
    titulo: "Mensualidades Club",
    descripcion:
      "Mensualidades de socios del Club (donantes ocasionales). Define el aporte esperado en cada perfil para activar la validación de cumplimiento.",
    tipos: [TipoDonante.OCASIONAL],
    modos: ["ingreso"],
  },
];

export default async function ControlPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; anio?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const now = new Date();
  const anio = sp.anio ? parseInt(sp.anio) : now.getUTCFullYear();
  const anios = Array.from({ length: 4 }, (_, i) => now.getUTCFullYear() - 1 + i);

  const vistaActual: Vista =
    (VISTAS.find((v) => v.key === sp.vista)?.key ?? "supernumerarios") as Vista;
  const cfg = VISTAS.find((v) => v.key === vistaActual)!;

  const data = await getControl({ anio, tipos: cfg.tipos });

  const ingresoFilas = data.filas.map((f) => ({
    donanteId: f.donanteId,
    nombre: f.nombre,
    aporteEsperado: f.aporteEsperado?.toString() ?? null,
    mensual: f.ingresoMes.map((d) => d.toString()),
    total: f.totalIngreso.toString(),
  }));
  const egresoFilas = data.filas.map((f) => ({
    donanteId: f.donanteId,
    nombre: f.nombre,
    aporteEsperado: f.aporteEsperado?.toString() ?? null,
    mensual: f.egresoMes.map((d) => d.toString()),
    total: f.totalEgreso.toString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Control</h1>
        <p className="text-muted-foreground text-sm mt-1">{cfg.descripcion}</p>
      </div>

      {/* Selector de vista — tabs */}
      <div className="flex flex-wrap gap-1 border-b">
        {VISTAS.map((v) => (
          <Link
            key={v.key}
            href={`/control?vista=${v.key}&anio=${anio}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              vistaActual === v.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      <form method="GET" className="flex gap-3 items-end">
        <input type="hidden" name="vista" value={vistaActual} />
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Año
          </label>
          <select
            name="anio"
            defaultValue={String(anio)}
            className="border border-input rounded-md px-3 py-2 text-sm bg-background"
          >
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition"
        >
          Aplicar
        </button>
      </form>

      {cfg.modos.includes("ingreso") && (
        <ControlMatriz
          titulo={
            vistaActual === "numerarios" ? "Aportes a caja del Molino" : cfg.titulo
          }
          modo="ingreso"
          filas={ingresoFilas}
          totalesMensual={data.totales.ingresoMes.map((d) => d.toString())}
          totalGeneral={data.totales.totalIngreso.toString()}
        />
      )}

      {cfg.modos.includes("egreso") && (
        <ControlMatriz
          titulo="Pagos de pensión a FESAL"
          modo="egreso"
          filas={egresoFilas}
          totalesMensual={data.totales.egresoMes.map((d) => d.toString())}
          totalGeneral={data.totales.totalEgreso.toString()}
        />
      )}
    </div>
  );
}
