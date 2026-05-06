import { Prisma, TipoMovimiento } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type EstadoCumplimiento = "AL_DIA" | "ATRASADO" | "NO_APLICA";

export type CumplimientoMes = {
  mes: number; // 1-12
  estado: EstadoCumplimiento;
  aportadoMes: Prisma.Decimal;
  esperado: Prisma.Decimal | null;
};

/**
 * Calcula cumplimiento por mes para un donante en un año dado.
 * AL_DIA si aportadoMes >= aporteMensualEsperado (con esperado > 0)
 * ATRASADO si aportadoMes < esperado y el mes ya pasó (mes <= mesActual)
 * NO_APLICA si esperado es null/0 o el mes está en el futuro
 */
export async function cumplimientoDonanteAnual(
  donanteId: string,
  anio: number,
): Promise<CumplimientoMes[]> {
  const donante = await prisma.donante.findUnique({
    where: { id: donanteId },
    select: { aporteMensualEsperado: true },
  });
  const esperado = donante?.aporteMensualEsperado ?? null;

  const start = new Date(Date.UTC(anio, 0, 1));
  const end = new Date(Date.UTC(anio + 1, 0, 1));
  const movimientos = await prisma.movimiento.findMany({
    where: {
      donanteId,
      fecha: { gte: start, lt: end },
      anulado: false,
      tipo: TipoMovimiento.INGRESO,
    },
    select: { fecha: true, monto: true },
  });

  const aportadoPorMes: Prisma.Decimal[] = Array.from(
    { length: 12 },
    () => new Prisma.Decimal(0),
  );
  for (const m of movimientos) {
    const i = m.fecha.getUTCMonth();
    aportadoPorMes[i] = aportadoPorMes[i].plus(m.monto);
  }

  const ahora = new Date();
  const mesActualReal =
    anio < ahora.getUTCFullYear()
      ? 12
      : anio > ahora.getUTCFullYear()
        ? 0
        : ahora.getUTCMonth() + 1;

  return aportadoPorMes.map((aportado, i) => {
    const mes = i + 1;
    if (!esperado || esperado.isZero())
      return { mes, estado: "NO_APLICA", aportadoMes: aportado, esperado: null };
    if (mes > mesActualReal)
      return { mes, estado: "NO_APLICA", aportadoMes: aportado, esperado };
    return {
      mes,
      estado: aportado.gte(esperado) ? "AL_DIA" : "ATRASADO",
      aportadoMes: aportado,
      esperado,
    };
  });
}

/**
 * Lista donantes con N o más meses consecutivos atrasados (incluyendo el actual)
 * dentro del año en curso. Útil para alertas.
 */
export async function donantesAtrasados(
  minMesesConsecutivos = 2,
): Promise<{ donanteId: string; nombre: string; tipo: string; mesesAtrasados: number; ultimoMes: number }[]> {
  const ahora = new Date();
  const anio = ahora.getUTCFullYear();
  const mesActual = ahora.getUTCMonth() + 1;

  const donantes = await prisma.donante.findMany({
    where: {
      aporteMensualEsperado: { not: null },
      estado: "ACTIVO",
    },
    select: { id: true, nombre: true, tipo: true, aporteMensualEsperado: true },
  });

  const resultados: {
    donanteId: string;
    nombre: string;
    tipo: string;
    mesesAtrasados: number;
    ultimoMes: number;
  }[] = [];

  for (const d of donantes) {
    const cumpl = await cumplimientoDonanteAnual(d.id, anio);
    // contar consecutivos hasta el mes actual
    let consecutivos = 0;
    for (let i = mesActual - 1; i >= 0; i--) {
      if (cumpl[i].estado === "ATRASADO") consecutivos++;
      else break;
    }
    if (consecutivos >= minMesesConsecutivos) {
      resultados.push({
        donanteId: d.id,
        nombre: d.nombre,
        tipo: d.tipo,
        mesesAtrasados: consecutivos,
        ultimoMes: mesActual,
      });
    }
  }

  return resultados.sort((a, b) => b.mesesAtrasados - a.mesesAtrasados);
}
