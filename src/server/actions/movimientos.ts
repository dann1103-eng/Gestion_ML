"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  movimientoSchema,
  anularMovimientoSchema,
} from "@/lib/zod-schemas";
import { runAction } from "./helpers";
import { generarCorrelativo } from "@/lib/correlativo";
import { generarAfcydSiCorresponde, anularAfcyd } from "@/lib/afcyd";
import { generarEgresoFesalSiCorresponde } from "@/lib/fesal";
import { TipoCorrelativo, TipoMovimiento, Prisma } from "@prisma/client";

export type MovimientoFilters = {
  anio?: number;
  mes?: number;
  tipo?: TipoMovimiento;
  cuentaId?: string;
  conceptoId?: string;
  donanteId?: string;
  q?: string;
  soloAnulados?: boolean;
  page?: number;
  pageSize?: number;
};

export async function listarMovimientos(filters: MovimientoFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.pageSize ?? 50);

  const where: Prisma.MovimientoWhereInput = {
    anulado: filters.soloAnulados ? true : false,
  };

  if (filters.anio && filters.mes) {
    const start = new Date(Date.UTC(filters.anio, filters.mes - 1, 1));
    const end = new Date(Date.UTC(filters.anio, filters.mes, 1));
    where.fecha = { gte: start, lt: end };
  } else if (filters.anio) {
    const start = new Date(Date.UTC(filters.anio, 0, 1));
    const end = new Date(Date.UTC(filters.anio + 1, 0, 1));
    where.fecha = { gte: start, lt: end };
  }

  if (filters.tipo) where.tipo = filters.tipo;
  if (filters.cuentaId) where.cuentaId = filters.cuentaId;
  if (filters.conceptoId) where.conceptoId = filters.conceptoId;
  if (filters.donanteId) where.donanteId = filters.donanteId;
  if (filters.q) {
    where.OR = [
      { descripcion: { contains: filters.q, mode: "insensitive" } },
      { valeNumero: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.movimiento.findMany({
      where,
      include: {
        concepto: true,
        clasificacion: true,
        cuenta: true,
        donante: true,
        adjuntos: true,
        movimientoAfcyd: true,
      },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.movimiento.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function obtenerMovimiento(id: string) {
  return prisma.movimiento.findUnique({
    where: { id },
    include: {
      concepto: true,
      clasificacion: true,
      cuenta: true,
      donante: true,
      adjuntos: true,
      movimientoAfcyd: true,
      createdBy: { select: { nombre: true, email: true } },
      updatedBy: { select: { nombre: true, email: true } },
    },
  });
}

/**
 * Crea un movimiento + correlativo + (si aplica) fila AFCYD,
 * todo en una sola transacción.
 */
export async function crearMovimiento(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const generarFesal = formData.get("generarFesal") === "true";
  const result = await runAction(movimientoSchema, raw, async (data, userId) => {
    const movimiento = await prisma.$transaction(async (tx) => {
      const tipoCorr =
        data.tipo === TipoMovimiento.INGRESO
          ? TipoCorrelativo.INGR
          : TipoCorrelativo.EGR;
      const valeNumero = await generarCorrelativo(tx, tipoCorr, data.fecha);

      const m = await tx.movimiento.create({
        data: {
          fecha: data.fecha,
          tipo: data.tipo,
          conceptoId: data.conceptoId,
          clasificacionId: data.clasificacionId ?? null,
          cuentaId: data.cuentaId,
          monto: new Prisma.Decimal(data.monto),
          medioPago: data.medioPago,
          descripcion: data.descripcion,
          donanteId: data.donanteId ?? null,
          notas: data.notas ?? null,
          valeNumero,
          createdById: userId,
          updatedById: userId,
        },
      });

      await generarAfcydSiCorresponde(tx, {
        id: m.id,
        tipo: m.tipo,
        fecha: m.fecha,
        monto: m.monto,
        medioPago: m.medioPago,
        notas: m.notas,
        donanteId: m.donanteId,
      });

      if (generarFesal) {
        await generarEgresoFesalSiCorresponde(tx, {
          id: m.id,
          tipo: m.tipo,
          fecha: m.fecha,
          monto: m.monto,
          cuentaId: m.cuentaId,
          donanteId: m.donanteId,
        });
      }

      return m;
    });

    return movimiento;
  });

  if (result.ok) {
    revalidatePath("/movimientos");
  }
  return result;
}

export async function actualizarMovimiento(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const result = await runAction(movimientoSchema, raw, async (data, userId) => {
    return prisma.$transaction(async (tx) => {
      const m = await tx.movimiento.update({
        where: { id },
        data: {
          fecha: data.fecha,
          tipo: data.tipo,
          conceptoId: data.conceptoId,
          clasificacionId: data.clasificacionId ?? null,
          cuentaId: data.cuentaId,
          monto: new Prisma.Decimal(data.monto),
          medioPago: data.medioPago,
          descripcion: data.descripcion,
          donanteId: data.donanteId ?? null,
          notas: data.notas ?? null,
          updatedById: userId,
        },
      });

      // Reconstruir AFCYD: anular el viejo (si existía) y generar uno nuevo
      // sólo si las condiciones se cumplen.
      await tx.movimientoAfcyd.deleteMany({ where: { movimientoId: id } });
      await generarAfcydSiCorresponde(tx, {
        id: m.id,
        tipo: m.tipo,
        fecha: m.fecha,
        monto: m.monto,
        medioPago: m.medioPago,
        notas: m.notas,
        donanteId: m.donanteId,
      });

      return m;
    });
  });
  if (result.ok) {
    revalidatePath("/movimientos");
    revalidatePath(`/movimientos/${id}`);
  }
  return result;
}

export async function anularMovimientoForm(id: string, formData: FormData): Promise<void> {
  await anularMovimiento(id, formData);
}

export async function anularMovimiento(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const result = await runAction(anularMovimientoSchema, raw, async (data) => {
    return prisma.$transaction(async (tx) => {
      const m = await tx.movimiento.update({
        where: { id },
        data: {
          anulado: true,
          motivoAnulacion: data.motivoAnulacion,
        },
      });
      await anularAfcyd(tx, id);
      return m;
    });
  });
  if (result.ok) {
    revalidatePath("/movimientos");
    revalidatePath(`/movimientos/${id}`);
  }
  return result;
}
