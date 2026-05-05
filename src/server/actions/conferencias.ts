"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { conferenciaSchema } from "@/lib/zod-schemas";
import { runAction } from "./helpers";
import { slug } from "@/lib/convenios/slug";

export async function listarConferencias(opts?: { activo?: boolean; q?: string }) {
  return prisma.conferenciaCatalogo.findMany({
    where: {
      ...(opts?.activo !== undefined ? { activo: opts.activo } : {}),
      ...(opts?.q
        ? {
            OR: [
              { titulo: { contains: opts.q, mode: "insensitive" } },
              { categoria: { contains: opts.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ categoria: "asc" }, { titulo: "asc" }],
    take: 500,
  });
}

export async function obtenerConferencia(id: string) {
  return prisma.conferenciaCatalogo.findUnique({ where: { id } });
}

async function generarCodigoUnico(titulo: string, categoria: string): Promise<string> {
  const base = slug(`${categoria.slice(0, 3)}-${titulo}`);
  let candidato = base;
  let n = 1;
  while (await prisma.conferenciaCatalogo.findUnique({ where: { codigo: candidato } })) {
    n += 1;
    candidato = `${base}-${n}`;
  }
  return candidato;
}

export async function crearConferencia(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const result = await runAction(conferenciaSchema, raw, async (data) => {
    const codigo = await generarCodigoUnico(data.titulo, data.categoria);
    return prisma.conferenciaCatalogo.create({
      data: {
        codigo,
        titulo: data.titulo,
        categoria: data.categoria,
        descripcion: data.descripcion ?? null,
        duracionMin: data.duracionMin,
        activo: data.activo,
      },
    });
  });
  if (result.ok) revalidatePath("/conferencias");
  return result;
}

export async function actualizarConferencia(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const result = await runAction(conferenciaSchema, raw, async (data) => {
    return prisma.conferenciaCatalogo.update({
      where: { id },
      data: {
        titulo: data.titulo,
        categoria: data.categoria,
        descripcion: data.descripcion ?? null,
        duracionMin: data.duracionMin,
        activo: data.activo,
      },
    });
  });
  if (result.ok) revalidatePath("/conferencias");
  return result;
}

export async function listarCategoriasConferencias(): Promise<string[]> {
  const rows = await prisma.conferenciaCatalogo.groupBy({
    by: ["categoria"],
    orderBy: { categoria: "asc" },
  });
  return rows.map((r) => r.categoria);
}

export async function crearConferenciaForm(formData: FormData): Promise<void> {
  await crearConferencia(formData);
}

export async function actualizarConferenciaForm(id: string, formData: FormData): Promise<void> {
  await actualizarConferencia(id, formData);
}
