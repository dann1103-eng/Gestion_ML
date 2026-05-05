"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { conceptoSchema, clasificacionSchema } from "@/lib/zod-schemas";
import { runAction } from "./helpers";

// ----------------- CONCEPTOS -----------------
export async function listarConceptos(opts?: { tipo?: "INGRESO" | "EGRESO"; soloActivos?: boolean }) {
  return prisma.concepto.findMany({
    where: {
      ...(opts?.tipo ? { tipo: opts.tipo } : {}),
      ...(opts?.soloActivos ? { activo: true } : {}),
    },
    orderBy: [{ tipo: "asc" }, { orden: "asc" }, { nombre: "asc" }],
  });
}

export async function crearConcepto(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const result = await runAction(conceptoSchema, raw, async (data) => {
    return prisma.concepto.create({ data });
  });
  if (result.ok) revalidatePath("/catalogos/conceptos");
  return result;
}
export async function crearConceptoForm(formData: FormData): Promise<void> {
  await crearConcepto(formData);
}

export async function actualizarConcepto(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const result = await runAction(conceptoSchema, raw, async (data) => {
    return prisma.concepto.update({ where: { id }, data });
  });
  if (result.ok) revalidatePath("/catalogos/conceptos");
  return result;
}

export async function toggleConceptoActivo(id: string): Promise<void> {
  const c = await prisma.concepto.findUnique({ where: { id } });
  if (!c) return;
  await prisma.concepto.update({ where: { id }, data: { activo: !c.activo } });
  revalidatePath("/catalogos/conceptos");
}

// ----------------- CLASIFICACIONES -----------------
export async function listarClasificaciones(opts?: { soloActivas?: boolean }) {
  return prisma.clasificacion.findMany({
    where: opts?.soloActivas ? { activo: true } : {},
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });
}

export async function crearClasificacion(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const result = await runAction(clasificacionSchema, raw, async (data) => {
    return prisma.clasificacion.create({ data });
  });
  if (result.ok) revalidatePath("/catalogos/clasificaciones");
  return result;
}
export async function crearClasificacionForm(formData: FormData): Promise<void> {
  await crearClasificacion(formData);
}

export async function actualizarClasificacion(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const result = await runAction(clasificacionSchema, raw, async (data) => {
    return prisma.clasificacion.update({ where: { id }, data });
  });
  if (result.ok) revalidatePath("/catalogos/clasificaciones");
  return result;
}

export async function toggleClasificacionActiva(id: string): Promise<void> {
  const c = await prisma.clasificacion.findUnique({ where: { id } });
  if (!c) return;
  await prisma.clasificacion.update({ where: { id }, data: { activo: !c.activo } });
  revalidatePath("/catalogos/clasificaciones");
}
