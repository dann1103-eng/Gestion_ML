"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sesionSchema } from "@/lib/zod-schemas";
import { runAction } from "./helpers";
import { EstadoSesion, ModalidadSesion, Prisma } from "@prisma/client";

export async function listarSesiones(opts?: {
  anio?: number;
  mes?: number;
  donanteId?: string;
  estado?: EstadoSesion;
  modalidad?: ModalidadSesion;
  categoria?: string;
}) {
  const where: Prisma.SesionWhereInput = {};

  if (opts?.anio && opts?.mes) {
    const inicio = new Date(Date.UTC(opts.anio, opts.mes - 1, 1));
    const fin = new Date(Date.UTC(opts.anio, opts.mes, 1));
    where.fecha = { gte: inicio, lt: fin };
  } else if (opts?.anio) {
    const inicio = new Date(Date.UTC(opts.anio, 0, 1));
    const fin = new Date(Date.UTC(opts.anio + 1, 0, 1));
    where.fecha = { gte: inicio, lt: fin };
  }

  if (opts?.estado) where.estado = opts.estado;
  if (opts?.modalidad) where.modalidad = opts.modalidad;
  if (opts?.categoria) where.conferencia = { categoria: opts.categoria };
  if (opts?.donanteId) where.convenio = { donanteId: opts.donanteId };

  return prisma.sesion.findMany({
    where,
    include: {
      conferencia: true,
      convenio: { include: { donante: { select: { id: true, nombre: true } } } },
    },
    orderBy: [{ fecha: "asc" }],
    take: 300,
  });
}

export async function crearSesion(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const result = await runAction(sesionSchema, raw, async (data) => {
    return prisma.sesion.create({
      data: {
        convenioId: data.convenioId,
        conferenciaId: data.conferenciaId,
        fecha: data.fecha,
        modalidad: data.modalidad ?? ModalidadSesion.PRESENCIAL,
        ponente: data.ponente ?? null,
        asistentes: data.asistentes ?? 0,
        estado: data.estado ?? EstadoSesion.PROGRAMADA,
        notas: data.notas ?? null,
      },
    });
  });
  if (result.ok) {
    revalidatePath("/sesiones");
    revalidatePath(`/convenios/${result.data.convenioId}`);
  }
  return result;
}

export async function actualizarSesion(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const result = await runAction(sesionSchema, raw, async (data) => {
    return prisma.sesion.update({
      where: { id },
      data: {
        conferenciaId: data.conferenciaId,
        fecha: data.fecha,
        modalidad: data.modalidad ?? ModalidadSesion.PRESENCIAL,
        ponente: data.ponente ?? null,
        asistentes: data.asistentes ?? 0,
        estado: data.estado ?? EstadoSesion.PROGRAMADA,
        notas: data.notas ?? null,
      },
    });
  });
  if (result.ok) {
    revalidatePath("/sesiones");
    revalidatePath(`/convenios/${result.data.convenioId}`);
  }
  return result;
}

export async function cambiarEstadoSesion(id: string, estado: EstadoSesion) {
  const s = await prisma.sesion.update({
    where: { id },
    data: { estado },
  });
  revalidatePath("/sesiones");
  revalidatePath(`/convenios/${s.convenioId}`);
  return s;
}

/**
 * Elimina una sesión definitivamente. Solo permitido si NO está REALIZADA
 * (preserva el historial de conferencias dictadas).
 */
export async function eliminarSesion(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await prisma.sesion.findUnique({ where: { id } });
    if (!s) return { ok: false, error: "Sesión no encontrada" };
    if (s.estado === EstadoSesion.REALIZADA) {
      return {
        ok: false,
        error: "No se puede eliminar una sesión ya REALIZADA. Préservala como histórico.",
      };
    }

    await prisma.sesion.delete({ where: { id } });
    revalidatePath("/sesiones");
    revalidatePath(`/convenios/${s.convenioId}`);
    return { ok: true };
  } catch (e) {
    console.error("[eliminarSesion]", e);
    return { ok: false, error: e instanceof Error ? e.message : "Error eliminando" };
  }
}

export async function crearSesionForm(formData: FormData): Promise<void> {
  await crearSesion(formData);
}

export async function actualizarSesionForm(id: string, formData: FormData): Promise<void> {
  await actualizarSesion(id, formData);
}

export async function cambiarEstadoSesionForm(
  id: string,
  estado: EstadoSesion,
): Promise<void> {
  await cambiarEstadoSesion(id, estado);
}

export async function eliminarSesionForm(id: string): Promise<void> {
  await eliminarSesion(id);
}
