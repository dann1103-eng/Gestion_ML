"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { planillaSchema, partidaSchema } from "@/lib/zod-schemas";
import { runAction } from "./helpers";
import { requireUser } from "@/lib/auth";
import { Prisma, TipoPartida, TipoCorrelativo, EstadoPlanilla, MedioPago } from "@prisma/client";
import { recalcularTotales } from "@/lib/planillas/totales";
import { calcularDeducciones } from "@/lib/planillas/deducciones";
import { generarCorrelativo } from "@/lib/correlativo";

const TIPOS_DESCUENTO: TipoPartida[] = [
  TipoPartida.DESCUENTO_ISSS,
  TipoPartida.DESCUENTO_AFP,
  TipoPartida.DESCUENTO_ISR,
  TipoPartida.DESCUENTO_OTRO,
];

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function listarPlanillas(anio?: number) {
  await requireUser();
  return prisma.planilla.findMany({
    where: anio ? { anio } : undefined,
    orderBy: [{ anio: "desc" }, { mes: "desc" }, { quincena: "desc" }],
  });
}

export async function obtenerPlanilla(id: string) {
  await requireUser();
  const planilla = await prisma.planilla.findUnique({
    where: { id },
    include: {
      partidas: {
        include: { empleado: true },
        orderBy: [{ empleadoId: "asc" }, { tipo: "asc" }],
      },
      recibos: { orderBy: { correlativo: "asc" } },
    },
  });
  if (!planilla) return null;

  // Serialize Decimals and group partidas by employee for RSC → Client boundary
  const empleadoMap = new Map<string, {
    id: string;
    nombre: string;
    cargo: string | null;
    sueldoBase: number;
    isss: string | null;
    afp: string | null;
    partidas: { id: string; tipo: TipoPartida; monto: number; descripcion: string | null }[];
  }>();

  for (const p of planilla.partidas) {
    if (!empleadoMap.has(p.empleadoId)) {
      empleadoMap.set(p.empleadoId, {
        id: p.empleado.id,
        nombre: p.empleado.nombre,
        cargo: p.empleado.cargo,
        sueldoBase: Number(p.empleado.sueldoBase),
        isss: p.empleado.isss,
        afp: p.empleado.afp,
        partidas: [],
      });
    }
    empleadoMap.get(p.empleadoId)!.partidas.push({
      id: p.id,
      tipo: p.tipo,
      monto: Number(p.monto),
      descripcion: p.descripcion,
    });
  }

  return {
    id: planilla.id,
    anio: planilla.anio,
    mes: planilla.mes,
    quincena: planilla.quincena,
    fechaInicio: planilla.fechaInicio,
    fechaFin: planilla.fechaFin,
    fechaPago: planilla.fechaPago,
    medioPago: planilla.medioPago,
    totalBruto: Number(planilla.totalBruto),
    totalDescuentos: Number(planilla.totalDescuentos),
    totalNeto: Number(planilla.totalNeto),
    estado: planilla.estado,
    empleados: Array.from(empleadoMap.values()),
    recibos: planilla.recibos.map((r) => ({
      id: r.id,
      empleadoId: r.empleadoId,
      correlativo: r.correlativo,
    })),
  };
}

// ─── Crear planilla ───────────────────────────────────────────────────────────

export async function crearPlanilla(formData: FormData) {
  return runAction(planillaSchema, Object.fromEntries(formData), async (data) => {
    try {
    return await prisma.$transaction(async (tx) => {
      const planilla = await tx.planilla.create({
        data: {
          anio: data.anio,
          mes: data.mes,
          quincena: data.quincena,
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
          fechaPago: data.fechaPago,
          medioPago: data.medioPago,
        },
      });

      const empleados = await tx.empleado.findMany({ where: { activo: true } });
      if (empleados.length > 0) {
        await tx.partidaPlanilla.createMany({
          data: empleados.map((e) => ({
            planillaId: planilla.id,
            empleadoId: e.id,
            tipo: TipoPartida.SUELDO,
            monto: e.sueldoBase.dividedBy(2).toDecimalPlaces(2),
          })),
        });
      }

      await recalcularTotales(planilla.id, tx);
      return { id: planilla.id };
    });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new Error("Ya existe una planilla para esta quincena. Elige un período diferente.");
      }
      throw e;
    }
  });
}

export async function crearPlanillaForm(formData: FormData): Promise<void> {
  const res = await crearPlanilla(formData);
  if (!res.ok) throw new Error(res.error);
  redirect(`/planillas/${res.data!.id}`);
}

// ─── Mutaciones de partidas ───────────────────────────────────────────────────

export async function actualizarPartida(
  partidaId: string,
  monto: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  try {
    const montoD = new Prisma.Decimal(monto);
    if (montoD.isNegative() || montoD.isZero()) throw new Error("El monto debe ser mayor que cero");

    let planillaId: string;
    await prisma.$transaction(async (tx) => {
      const partida = await tx.partidaPlanilla.findUniqueOrThrow({ where: { id: partidaId } });
      planillaId = partida.planillaId;
      await tx.partidaPlanilla.update({ where: { id: partidaId }, data: { monto: montoD } });
      await recalcularTotales(partida.planillaId, tx);
    });

    revalidatePath(`/planillas/${planillaId!}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function agregarPartida(
  planillaId: string,
  empleadoId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const parsed = partidaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };
  const TIPOS_EXTRA: TipoPartida[] = [TipoPartida.BONO, TipoPartida.HORA_EXTRA, TipoPartida.DESCUENTO_OTRO];
  if (!TIPOS_EXTRA.includes(parsed.data.tipo)) return { ok: false, error: "Tipo de partida no permitido" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.partidaPlanilla.create({
        data: {
          planillaId,
          empleadoId,
          tipo: parsed.data.tipo,
          monto: new Prisma.Decimal(parsed.data.monto),
          descripcion: parsed.data.descripcion ?? null,
        },
      });
      await recalcularTotales(planillaId, tx);
    });
    revalidatePath(`/planillas/${planillaId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function eliminarPartida(
  partidaId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  try {
    let planillaId: string;
    await prisma.$transaction(async (tx) => {
      const partida = await tx.partidaPlanilla.findUniqueOrThrow({ where: { id: partidaId } });
      planillaId = partida.planillaId;
      await tx.partidaPlanilla.delete({ where: { id: partidaId } });
      await recalcularTotales(partida.planillaId, tx);
    });
    revalidatePath(`/planillas/${planillaId!}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function aplicarDeducciones(
  planillaId: string,
  empleadoId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  try {
    const empleado = await prisma.empleado.findUniqueOrThrow({ where: { id: empleadoId } });
    const { isss, afp, isr } = calcularDeducciones(empleado.sueldoBase);

    await prisma.$transaction(async (tx) => {
      await tx.partidaPlanilla.deleteMany({
        where: {
          planillaId,
          empleadoId,
          tipo: { in: [TipoPartida.DESCUENTO_ISSS, TipoPartida.DESCUENTO_AFP, TipoPartida.DESCUENTO_ISR] },
        },
      });
      await tx.partidaPlanilla.createMany({
        data: [
          { planillaId, empleadoId, tipo: TipoPartida.DESCUENTO_ISSS, monto: isss },
          { planillaId, empleadoId, tipo: TipoPartida.DESCUENTO_AFP, monto: afp },
          { planillaId, empleadoId, tipo: TipoPartida.DESCUENTO_ISR, monto: isr },
        ],
      });
      await recalcularTotales(planillaId, tx);
    });

    revalidatePath(`/planillas/${planillaId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function quitarDeducciones(
  planillaId: string,
  empleadoId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.partidaPlanilla.deleteMany({
        where: {
          planillaId,
          empleadoId,
          tipo: { in: [TipoPartida.DESCUENTO_ISSS, TipoPartida.DESCUENTO_AFP, TipoPartida.DESCUENTO_ISR] },
        },
      });
      await recalcularTotales(planillaId, tx);
    });
    revalidatePath(`/planillas/${planillaId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

// ─── Flujo de estados ─────────────────────────────────────────────────────────

async function requireEstado(id: string, expected: EstadoPlanilla) {
  const planilla = await prisma.planilla.findUniqueOrThrow({ where: { id } });
  if (planilla.estado !== expected) {
    throw new Error(`La planilla está en estado ${planilla.estado}, se esperaba ${expected}`);
  }
  return planilla;
}

export async function aprobarPlanilla(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  try {
    await requireEstado(id, EstadoPlanilla.BORRADOR);
    await prisma.planilla.update({ where: { id }, data: { estado: EstadoPlanilla.APROBADA } });
    revalidatePath(`/planillas/${id}`);
    revalidatePath("/planillas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function revertirABorrador(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  try {
    await requireEstado(id, EstadoPlanilla.APROBADA);
    await prisma.planilla.update({ where: { id }, data: { estado: EstadoPlanilla.BORRADOR } });
    revalidatePath(`/planillas/${id}`);
    revalidatePath("/planillas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function marcarPagada(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  try {
    const planilla = await requireEstado(id, EstadoPlanilla.APROBADA);

    await prisma.$transaction(async (tx) => {
      const partidas = await tx.partidaPlanilla.findMany({ where: { planillaId: id } });

      // Group partidas by empleado
      const byEmpleado = new Map<string, typeof partidas>();
      for (const p of partidas) {
        const arr = byEmpleado.get(p.empleadoId) ?? [];
        arr.push(p);
        byEmpleado.set(p.empleadoId, arr);
      }

      // Create one ReciboPago per employee
      for (const [empleadoId, ps] of byEmpleado) {
        let neto = new Prisma.Decimal(0);
        for (const p of ps) {
          if (TIPOS_DESCUENTO.includes(p.tipo)) {
            neto = neto.minus(p.monto);
          } else {
            neto = neto.plus(p.monto);
          }
        }

        const correlativo = await generarCorrelativo(tx, TipoCorrelativo.RECIBO, planilla.fechaPago);

        await tx.reciboPago.create({
          data: {
            planillaId: id,
            empleadoId,
            montoNeto: neto,
            medioPago: planilla.medioPago,
            fechaFirma: planilla.fechaPago,
            correlativo,
          },
        });
      }

      await tx.planilla.update({ where: { id }, data: { estado: EstadoPlanilla.PAGADA } });
    });

    revalidatePath(`/planillas/${id}`);
    revalidatePath("/planillas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

/**
 * Elimina una planilla. Solo permitido si está en estado BORRADOR.
 * Cascade: borra todas sus partidas (no hay recibos en estado BORRADOR).
 */
export async function eliminarPlanilla(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  try {
    const planilla = await prisma.planilla.findUnique({ where: { id } });
    if (!planilla) return { ok: false, error: "Planilla no encontrada" };
    if (planilla.estado !== EstadoPlanilla.BORRADOR) {
      return {
        ok: false,
        error: `Solo se pueden eliminar planillas en BORRADOR. Esta está ${planilla.estado}. Reviértela primero.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.partidaPlanilla.deleteMany({ where: { planillaId: id } });
      await tx.planilla.delete({ where: { id } });
    });

    revalidatePath("/planillas");
    return { ok: true };
  } catch (e) {
    console.error("[eliminarPlanilla]", e);
    return { ok: false, error: e instanceof Error ? e.message : "Error eliminando" };
  }
}

export async function eliminarPlanillaForm(id: string): Promise<void> {
  await eliminarPlanilla(id);
}
