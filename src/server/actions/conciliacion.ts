// src/server/actions/conciliacion.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function toggleConciliado(
  id: string,
  conciliado: boolean,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  try {
    await prisma.movimiento.update({
      where: { id },
      data: { conciliado },
    });
    revalidatePath("/conciliacion");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function marcarLoteConciliados(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  if (ids.length === 0) return { ok: true };
  try {
    await prisma.movimiento.updateMany({
      where: { id: { in: ids } },
      data: { conciliado: true },
    });
    revalidatePath("/conciliacion");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
