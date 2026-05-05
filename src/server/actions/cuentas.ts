"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { cuentaSchema } from "@/lib/zod-schemas";
import { runAction } from "./helpers";

export async function listarCuentas() {
  return prisma.cuenta.findMany({
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });
}

export async function obtenerCuenta(id: string) {
  return prisma.cuenta.findUnique({ where: { id } });
}

export async function crearCuenta(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const result = await runAction(cuentaSchema, raw, async (data) => {
    const { fechaSaldoIni, ...rest } = data;
    return prisma.cuenta.create({
      data: { ...rest, fechaSaldoIni: fechaSaldoIni ?? undefined },
    });
  });
  if (result.ok) revalidatePath("/cuentas");
  return result;
}

// Variante con firma `(formData) => Promise<void>` para usar directo en <form action={...}>
export async function crearCuentaForm(formData: FormData): Promise<void> {
  await crearCuenta(formData);
}

export async function actualizarCuenta(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const result = await runAction(cuentaSchema, raw, async (data) => {
    const { fechaSaldoIni, ...rest } = data;
    return prisma.cuenta.update({
      where: { id },
      data: { ...rest, fechaSaldoIni: fechaSaldoIni ?? undefined },
    });
  });
  if (result.ok) revalidatePath("/cuentas");
  return result;
}

export async function toggleCuentaActiva(id: string): Promise<void> {
  const c = await prisma.cuenta.findUnique({ where: { id } });
  if (!c) return;
  await prisma.cuenta.update({ where: { id }, data: { activo: !c.activo } });
  revalidatePath("/cuentas");
}
