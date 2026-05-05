"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { convenioSchema } from "@/lib/zod-schemas";
import { runAction } from "./helpers";
import { TipoPlan, Prisma } from "@prisma/client";
import { calcularCobranza } from "@/lib/convenios/cobranza";

export async function listarConvenios(opts?: {
  anio?: number;
  plan?: TipoPlan;
  estado?: "VIGENTE" | "POR_VENCER" | "VENCIDO" | "TODOS";
  q?: string;
  /** Si true, incluye convenios anulados. Por defecto los oculta. */
  incluirAnulados?: boolean;
}) {
  const where: Prisma.ConvenioWhereInput = {};
  if (!opts?.incluirAnulados) {
    where.anulado = false;
  }
  if (opts?.plan) {
    where.plan = { tipo: opts.plan };
  }
  if (opts?.anio) {
    const inicio = new Date(Date.UTC(opts.anio, 0, 1));
    const fin = new Date(Date.UTC(opts.anio + 1, 0, 1));
    where.fechaFirma = { gte: inicio, lt: fin };
  }
  if (opts?.q) {
    where.donante = {
      OR: [
        { nombre: { contains: opts.q, mode: "insensitive" } },
        { empresaDetalle: { razonSocial: { contains: opts.q, mode: "insensitive" } } },
      ],
    };
  }
  if (opts?.estado === "VIGENTE") {
    where.fechaFin = { gte: new Date() };
  } else if (opts?.estado === "VENCIDO") {
    where.fechaFin = { lt: new Date() };
  } else if (opts?.estado === "POR_VENCER") {
    const hoy = new Date();
    const en30 = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
    where.fechaFin = { gte: hoy, lte: en30 };
  }

  return prisma.convenio.findMany({
    where,
    include: {
      plan: true,
      donante: { include: { empresaDetalle: true } },
    },
    orderBy: [{ fechaFirma: "desc" }, { version: "desc" }],
    take: 200,
  });
}

export async function obtenerConvenio(id: string) {
  return prisma.convenio.findUnique({
    where: { id },
    include: {
      plan: true,
      donante: { include: { empresaDetalle: true } },
      sesiones: {
        include: { conferencia: true },
        orderBy: { fecha: "asc" },
      },
    },
  });
}

export async function cobranzaConvenio(id: string) {
  const conv = await prisma.convenio.findUnique({
    where: { id },
    include: { plan: true },
  });
  if (!conv) return null;

  const movs = await prisma.movimiento.findMany({
    where: {
      donanteId: conv.donanteId,
      tipo: "INGRESO",
      anulado: false,
      fecha: { gte: conv.fechaInicio, lte: conv.fechaFin },
    },
    select: { fecha: true, monto: true, tipo: true, anulado: true },
  });

  return calcularCobranza({
    fechaInicio: conv.fechaInicio,
    fechaFin: conv.fechaFin,
    precioMensual: Number(conv.plan.precio),
    movimientosIngreso: movs,
  });
}

async function syncEmpresaDetalleFechas(
  tx: Prisma.TransactionClient,
  donanteId: string,
  fechaInicio: Date,
  fechaFin: Date,
  planTipo: TipoPlan,
) {
  await tx.empresaDetalle.upsert({
    where: { donanteId },
    create: {
      donanteId,
      fechaInicioConvenio: fechaInicio,
      fechaVencimientoConvenio: fechaFin,
      planFE: planTipo,
    },
    update: {
      fechaInicioConvenio: fechaInicio,
      fechaVencimientoConvenio: fechaFin,
      planFE: planTipo,
    },
  });
}

export async function crearConvenio(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const result = await runAction(convenioSchema, raw, async (data) => {
    return prisma.$transaction(async (tx) => {
      const plan = await tx.plan.findUnique({ where: { tipo: data.planTipo } });
      if (!plan) throw new Error(`Plan ${data.planTipo} no encontrado`);

      // Calcular siguiente version para el donante (si ya tuvo convenios anteriores)
      const last = await tx.convenio.findFirst({
        where: { donanteId: data.donanteId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const nextVersion = (last?.version ?? 0) + 1;

      const conv = await tx.convenio.create({
        data: {
          donanteId: data.donanteId,
          planId: plan.id,
          version: nextVersion,
          fechaFirma: data.fechaFirma,
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
          montoTotal: new Prisma.Decimal(data.montoTotal),
          ciudadFirma: data.ciudadFirma ?? null,
          notas: data.notas ?? null,
        },
      });

      await syncEmpresaDetalleFechas(
        tx,
        data.donanteId,
        data.fechaInicio,
        data.fechaFin,
        data.planTipo,
      );

      return conv;
    });
  });
  if (result.ok) {
    revalidatePath("/convenios");
    revalidatePath(`/donantes/${result.data.donanteId}`);
  }
  return result;
}

export async function actualizarConvenio(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const result = await runAction(convenioSchema, raw, async (data) => {
    return prisma.$transaction(async (tx) => {
      const plan = await tx.plan.findUnique({ where: { tipo: data.planTipo } });
      if (!plan) throw new Error(`Plan ${data.planTipo} no encontrado`);

      const conv = await tx.convenio.update({
        where: { id },
        data: {
          donanteId: data.donanteId,
          planId: plan.id,
          fechaFirma: data.fechaFirma,
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
          montoTotal: new Prisma.Decimal(data.montoTotal),
          ciudadFirma: data.ciudadFirma ?? null,
          notas: data.notas ?? null,
        },
      });

      await syncEmpresaDetalleFechas(
        tx,
        data.donanteId,
        data.fechaInicio,
        data.fechaFin,
        data.planTipo,
      );

      return conv;
    });
  });
  if (result.ok) {
    revalidatePath("/convenios");
    revalidatePath(`/convenios/${id}`);
  }
  return result;
}

export async function renovarConvenio(id: string): Promise<{ ok: boolean; nuevoId?: string; error?: string }> {
  try {
    const previo = await prisma.convenio.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!previo) return { ok: false, error: "Convenio no encontrado" };

    const nuevoInicio = new Date(previo.fechaFin.getTime() + 24 * 60 * 60 * 1000);
    const nuevoFin = new Date(nuevoInicio);
    nuevoFin.setUTCFullYear(nuevoFin.getUTCFullYear() + 1);

    const meses =
      (nuevoFin.getUTCFullYear() - nuevoInicio.getUTCFullYear()) * 12 +
      (nuevoFin.getUTCMonth() - nuevoInicio.getUTCMonth()) +
      1;
    const montoTotal = new Prisma.Decimal(previo.plan.precio).mul(meses);

    const nuevo = await prisma.$transaction(async (tx) => {
      const last = await tx.convenio.findFirst({
        where: { donanteId: previo.donanteId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const c = await tx.convenio.create({
        data: {
          donanteId: previo.donanteId,
          planId: previo.planId,
          version: (last?.version ?? 0) + 1,
          fechaFirma: new Date(),
          fechaInicio: nuevoInicio,
          fechaFin: nuevoFin,
          montoTotal,
          ciudadFirma: previo.ciudadFirma,
        },
      });
      await syncEmpresaDetalleFechas(
        tx,
        previo.donanteId,
        nuevoInicio,
        nuevoFin,
        previo.plan.tipo,
      );
      return c;
    });

    revalidatePath("/convenios");
    revalidatePath(`/convenios/${id}`);
    return { ok: true, nuevoId: nuevo.id };
  } catch (e) {
    console.error("[renovarConvenio]", e);
    return { ok: false, error: e instanceof Error ? e.message : "Error renovando" };
  }
}

/**
 * Anula un convenio (soft delete).
 * - Marca anulado=true con motivo
 * - Cancela las sesiones futuras PROGRAMADAS (preserva historial de REALIZADAS)
 */
export async function anularConvenio(
  id: string,
  motivo: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!motivo || motivo.trim().length < 3) {
      return { ok: false, error: "Indica un motivo (mínimo 3 caracteres)" };
    }

    const convenio = await prisma.convenio.findUnique({ where: { id } });
    if (!convenio) return { ok: false, error: "Convenio no encontrado" };
    if (convenio.anulado) return { ok: false, error: "El convenio ya está anulado" };

    await prisma.$transaction(async (tx) => {
      await tx.convenio.update({
        where: { id },
        data: { anulado: true, motivoAnulacion: motivo.trim() },
      });
      // Cancelar las sesiones futuras programadas
      await tx.sesion.updateMany({
        where: { convenioId: id, estado: "PROGRAMADA", fecha: { gte: new Date() } },
        data: { estado: "CANCELADA" },
      });
    });

    revalidatePath("/convenios");
    revalidatePath(`/convenios/${id}`);
    revalidatePath("/sesiones");
    return { ok: true };
  } catch (e) {
    console.error("[anularConvenio]", e);
    return { ok: false, error: e instanceof Error ? e.message : "Error anulando" };
  }
}

// Form action wrapper para uso directo en <form action={...}>
export async function crearConvenioForm(formData: FormData): Promise<void> {
  await crearConvenio(formData);
}

export async function actualizarConvenioForm(id: string, formData: FormData): Promise<void> {
  await actualizarConvenio(id, formData);
}

export async function renovarConvenioForm(id: string): Promise<void> {
  await renovarConvenio(id);
}

export async function anularConvenioForm(id: string, formData: FormData): Promise<void> {
  const motivo = String(formData.get("motivoAnulacion") ?? "");
  await anularConvenio(id, motivo);
}
