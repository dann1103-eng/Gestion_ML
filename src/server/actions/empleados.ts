"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { empleadoSchema } from "@/lib/zod-schemas";
import { runAction } from "./helpers";
import { requireUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function listarEmpleados() {
  await requireUser();
  return prisma.empleado.findMany({
    orderBy: { nombre: "asc" },
  });
}

export async function obtenerEmpleado(id: string) {
  await requireUser();
  return prisma.empleado.findUnique({ where: { id } });
}

export async function crearEmpleado(formData: FormData) {
  return runAction(empleadoSchema, Object.fromEntries(formData), async (data) => {
    const empleado = await prisma.empleado.create({
      data: {
        nombre: data.nombre,
        dui: data.dui ?? null,
        nit: data.nit ?? null,
        isss: data.isss ?? null,
        afp: data.afp ?? null,
        cargo: data.cargo ?? null,
        sueldoBase: new Prisma.Decimal(data.sueldoBase),
        fechaIngreso: data.fechaIngreso,
        fechaSalida: data.fechaSalida ?? null,
        cuentaBanco: data.cuentaBanco ?? null,
        activo: data.activo,
      },
    });
    return { id: empleado.id };
  });
}

export async function actualizarEmpleado(id: string, formData: FormData) {
  return runAction(empleadoSchema, Object.fromEntries(formData), async (data) => {
    await prisma.empleado.update({
      where: { id },
      data: {
        nombre: data.nombre,
        dui: data.dui ?? null,
        nit: data.nit ?? null,
        isss: data.isss ?? null,
        afp: data.afp ?? null,
        cargo: data.cargo ?? null,
        sueldoBase: new Prisma.Decimal(data.sueldoBase),
        fechaIngreso: data.fechaIngreso,
        fechaSalida: data.fechaSalida ?? null,
        cuentaBanco: data.cuentaBanco ?? null,
        activo: data.activo,
      },
    });
    revalidatePath("/empleados");
    revalidatePath(`/empleados/${id}`);
    return {};
  });
}

// Form wrappers (return void, redirect on success)
export async function crearEmpleadoForm(formData: FormData): Promise<void> {
  const res = await crearEmpleado(formData);
  if (!res.ok) throw new Error(res.error);
  redirect("/empleados");
}
