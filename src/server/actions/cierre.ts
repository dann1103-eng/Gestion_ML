"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { EstadoCierre, TipoMovimiento } from "@prisma/client";

export type ResumenMes = {
  anio: number;
  mes: number;
  count: number;
  ingresos: number;
  egresos: number;
  estado: EstadoCierre;
  cerradoPor: { email: string | null } | null;
  cerradoAt: Date | null;
};

/**
 * Lista los últimos N meses con resumen y estado de cierre.
 * Por default: últimos 12 meses contando desde el actual.
 */
export async function listarMesesConCierre(opts?: { limite?: number }) {
  const limite = opts?.limite ?? 12;
  const now = new Date();
  const mesActual = now.getUTCMonth() + 1;
  const anioActual = now.getUTCFullYear();

  // Generar la lista de (anio, mes) hacia atrás
  const periodos: { anio: number; mes: number }[] = [];
  for (let i = 0; i < limite; i++) {
    const m = mesActual - i;
    if (m > 0) periodos.push({ anio: anioActual, mes: m });
    else periodos.push({ anio: anioActual - 1, mes: m + 12 });
  }

  // Cierres existentes en estos periodos
  const cierres = await prisma.cierreMes.findMany({
    where: {
      OR: periodos.map((p) => ({ anio: p.anio, mes: p.mes })),
    },
    include: { cerradoPor: { select: { email: true } } },
  });
  const mapaCierres = new Map(cierres.map((c) => [`${c.anio}-${c.mes}`, c]));

  // groupBy de Prisma no permite agrupar por fecha truncada,
  // hacemos N queries pequeñas en paralelo:
  const datosPorPeriodo = await Promise.all(
    periodos.map(async (p) => {
      const start = new Date(Date.UTC(p.anio, p.mes - 1, 1));
      const end = new Date(Date.UTC(p.anio, p.mes, 1));
      const [agg, count] = await Promise.all([
        prisma.movimiento.groupBy({
          by: ["tipo"],
          where: { anulado: false, fecha: { gte: start, lt: end } },
          _sum: { monto: true },
        }),
        prisma.movimiento.count({
          where: { anulado: false, fecha: { gte: start, lt: end } },
        }),
      ]);

      let ingresos = 0,
        egresos = 0;
      for (const row of agg) {
        const monto = Number(row._sum.monto ?? 0);
        if (row.tipo === TipoMovimiento.INGRESO) ingresos = monto;
        else egresos = monto;
      }

      const cierre = mapaCierres.get(`${p.anio}-${p.mes}`);

      return {
        anio: p.anio,
        mes: p.mes,
        count,
        ingresos,
        egresos,
        estado: cierre?.estado ?? EstadoCierre.ABIERTO,
        cerradoPor: cierre?.cerradoPor ?? null,
        cerradoAt: cierre?.cerradoAt ?? null,
      } satisfies ResumenMes;
    }),
  );

  return datosPorPeriodo;
}

/**
 * Resumen rápido de UN mes específico (usado en el modal de cierre).
 */
export async function resumenDeMes(anio: number, mes: number): Promise<Omit<ResumenMes, "estado" | "cerradoPor" | "cerradoAt">> {
  const start = new Date(Date.UTC(anio, mes - 1, 1));
  const end = new Date(Date.UTC(anio, mes, 1));

  const [agg, count] = await Promise.all([
    prisma.movimiento.groupBy({
      by: ["tipo"],
      where: { anulado: false, fecha: { gte: start, lt: end } },
      _sum: { monto: true },
    }),
    prisma.movimiento.count({
      where: { anulado: false, fecha: { gte: start, lt: end } },
    }),
  ]);

  let ingresos = 0,
    egresos = 0;
  for (const row of agg) {
    const monto = Number(row._sum.monto ?? 0);
    if (row.tipo === TipoMovimiento.INGRESO) ingresos = monto;
    else egresos = monto;
  }

  return { anio, mes, count, ingresos, egresos };
}

/**
 * Cierra un mes (registra usuario y timestamp). Idempotente: si ya está cerrado, lo deja igual.
 */
export async function cerrarMes(anio: number, mes: number): Promise<void> {
  const user = await requireUser();
  await prisma.cierreMes.upsert({
    where: { mes_anio: { mes, anio } },
    create: {
      anio,
      mes,
      estado: EstadoCierre.CERRADO,
      cerradoPorId: user.id,
      cerradoAt: new Date(),
    },
    update: {
      estado: EstadoCierre.CERRADO,
      cerradoPorId: user.id,
      cerradoAt: new Date(),
    },
  });
  revalidatePath("/cierre");
}

/**
 * Reabre un mes (registra al usuario y limpia fecha).
 */
export async function reabrirMes(anio: number, mes: number): Promise<void> {
  await requireUser();
  const cierre = await prisma.cierreMes.findUnique({ where: { mes_anio: { mes, anio } } });
  if (!cierre) return;
  await prisma.cierreMes.update({
    where: { id: cierre.id },
    data: {
      estado: EstadoCierre.ABIERTO,
      cerradoPorId: null,
      cerradoAt: null,
    },
  });
  revalidatePath("/cierre");
}

/**
 * Verifica si un mes está cerrado. Útil para mostrar advertencias en formularios.
 */
export async function mesEstaCerrado(anio: number, mes: number): Promise<boolean> {
  const cierre = await prisma.cierreMes.findUnique({
    where: { mes_anio: { mes, anio } },
    select: { estado: true },
  });
  return cierre?.estado === EstadoCierre.CERRADO;
}
