"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  presupuestoSchema,
  saldoAnualInicialSchema,
  notaMensualSchema,
} from "@/lib/zod-schemas";
import { runAction } from "./helpers";
import { Prisma } from "@prisma/client";

export async function upsertPresupuesto(raw: unknown) {
  return runAction(presupuestoSchema, raw, async (input) => {
    const monto = new Prisma.Decimal(input.montoMensual);
    const result = await prisma.presupuesto.upsert({
      where: {
        conceptoId_anio: { conceptoId: input.conceptoId, anio: input.anio },
      },
      create: {
        conceptoId: input.conceptoId,
        anio: input.anio,
        montoMensual: monto,
        notas: input.notas ?? null,
      },
      update: {
        montoMensual: monto,
        notas: input.notas ?? null,
      },
    });
    revalidatePath("/resumen");
    revalidatePath("/presupuestos");
    return result;
  });
}

export async function deletePresupuesto(id: string) {
  return runAction(z.object({ id: z.string() }), { id }, async ({ id }) => {
    await prisma.presupuesto.delete({ where: { id } });
    revalidatePath("/resumen");
    revalidatePath("/presupuestos");
    return { id };
  });
}

export async function upsertSaldoAnualInicial(raw: unknown) {
  return runAction(saldoAnualInicialSchema, raw, async (input) => {
    const monto = new Prisma.Decimal(input.monto);
    const result = await prisma.saldoAnualInicial.upsert({
      where: { anio: input.anio },
      create: { anio: input.anio, monto },
      update: { monto },
    });
    revalidatePath("/resumen");
    return result;
  });
}

export async function upsertNotaMensual(raw: unknown) {
  return runAction(notaMensualSchema, raw, async (input) => {
    const result = await prisma.notaMensual.upsert({
      where: {
        anio_mes_seccion: {
          anio: input.anio,
          mes: input.mes,
          seccion: input.seccion,
        },
      },
      create: {
        anio: input.anio,
        mes: input.mes,
        seccion: input.seccion,
        texto: input.texto ?? "",
      },
      update: { texto: input.texto ?? "" },
    });
    revalidatePath("/resumen");
    return result;
  });
}
