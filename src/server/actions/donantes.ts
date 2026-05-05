"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { donanteSchema } from "@/lib/zod-schemas";
import { runAction } from "./helpers";
import { TipoDonante, Prisma } from "@prisma/client";

const EMPRESA_FIELDS = [
  "razonSocial",
  "nitEmpresa",
  "nrc",
  "giro",
  "rubro",
  "personeria",
  "representanteLegal",
  "planFE",
  "fechaInicioConvenio",
  "fechaVencimientoConvenio",
] as const;

type DonanteCreate = Prisma.DonanteUncheckedCreateInput;
type DonanteUpdate = Prisma.DonanteUncheckedUpdateInput;

export async function listarDonantes(opts?: {
  tipo?: TipoDonante;
  q?: string;
  estado?: "ACTIVO" | "PAUSADO" | "INACTIVO";
}) {
  const where: Prisma.DonanteWhereInput = {};
  if (opts?.tipo) where.tipo = opts.tipo;
  if (opts?.estado) where.estado = opts.estado;
  if (opts?.q) {
    where.OR = [
      { nombre: { contains: opts.q, mode: "insensitive" } },
      { dui: { contains: opts.q } },
      { nit: { contains: opts.q } },
      { correo: { contains: opts.q, mode: "insensitive" } },
    ];
  }
  return prisma.donante.findMany({
    where,
    include: { empresaDetalle: true },
    orderBy: { nombre: "asc" },
    take: 200,
  });
}

export async function obtenerDonante(id: string) {
  return prisma.donante.findUnique({
    where: { id },
    include: { empresaDetalle: true },
  });
}

function splitData(data: Record<string, unknown>) {
  const empresaData: Record<string, unknown> = {};
  const baseData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (EMPRESA_FIELDS.includes(k as (typeof EMPRESA_FIELDS)[number])) {
      empresaData[k] = v ?? null;
    } else {
      baseData[k] = v;
    }
  }
  return { baseData, empresaData };
}

export async function crearDonante(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const result = await runAction(donanteSchema, raw, async (data, userId) => {
    const { baseData, empresaData } = splitData(data as unknown as Record<string, unknown>);
    const createData: DonanteCreate = {
      ...(baseData as DonanteCreate),
      createdById: userId,
      updatedById: userId,
    };
    if (data.tipo === TipoDonante.EMPRESA_FE) {
      createData.empresaDetalle = {
        create: empresaData as Prisma.EmpresaDetalleCreateWithoutDonanteInput,
      };
    }
    return prisma.donante.create({ data: createData, include: { empresaDetalle: true } });
  });
  if (result.ok) revalidatePath("/donantes");
  return result;
}

export async function actualizarDonante(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const result = await runAction(donanteSchema, raw, async (data, userId) => {
    const { baseData, empresaData } = splitData(data as unknown as Record<string, unknown>);
    const updateData: DonanteUpdate = {
      ...(baseData as DonanteUpdate),
      updatedById: userId,
    };
    if (data.tipo === TipoDonante.EMPRESA_FE) {
      updateData.empresaDetalle = {
        upsert: {
          create: empresaData as Prisma.EmpresaDetalleCreateWithoutDonanteInput,
          update: empresaData as Prisma.EmpresaDetalleUpdateWithoutDonanteInput,
        },
      };
    }
    return prisma.donante.update({
      where: { id },
      data: updateData,
      include: { empresaDetalle: true },
    });
  });
  if (result.ok) {
    revalidatePath("/donantes");
    revalidatePath(`/donantes/${id}`);
  }
  return result;
}

export async function buscarDonantesAutocomplete(
  q: string,
  opts?: { soloEmpresasFE?: boolean },
) {
  if (q.length < 2) return [];
  return prisma.donante.findMany({
    where: {
      estado: "ACTIVO",
      ...(opts?.soloEmpresasFE ? { tipo: TipoDonante.EMPRESA_FE } : {}),
      OR: [
        { nombre: { contains: q, mode: "insensitive" } },
        { dui: { contains: q } },
        { nit: { contains: q } },
      ],
    },
    select: {
      id: true,
      nombre: true,
      tipo: true,
      dui: true,
      nit: true,
      entregaReciboFiscal: true,
    },
    take: 20,
    orderBy: { nombre: "asc" },
  });
}
