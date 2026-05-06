"use server";

import { prisma } from "@/lib/prisma";
import { TipoMovimiento, EstadoSesion } from "@prisma/client";
import { calcularCobranza } from "@/lib/convenios/cobranza";

const SALDO_BAJO_UMBRAL = 200;

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

/**
 * Datos para el dashboard. Una sola query por widget, ejecutadas en paralelo.
 * Acepta { anio, mes } opcional; default = mes actual.
 */
export async function getDashboardData(opts?: { anio?: number; mes?: number }) {
  const now = new Date();
  const anio = opts?.anio ?? now.getUTCFullYear();
  const mes = opts?.mes ?? now.getUTCMonth() + 1;

  const inicioMes = new Date(Date.UTC(anio, mes - 1, 1));
  const finMes = new Date(Date.UTC(anio, mes, 1));
  const inicioMesAnterior = new Date(Date.UTC(anio, mes - 2, 1));
  const finMesAnterior = inicioMes;

  const [
    cuentas,
    saldosPorMov,
    totalesMes,
    totalesMesAnterior,
    movimientosRecientes,
    convenios,
    sesionesManana,
    conveniosParaCobranza,
  ] = await Promise.all([
    // Cuentas activas con saldo inicial
    prisma.cuenta.findMany({
      where: { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    }),

    // Sumas por cuenta de movimientos no anulados (toda la historia)
    prisma.movimiento.groupBy({
      by: ["cuentaId", "tipo"],
      where: { anulado: false },
      _sum: { monto: true },
    }),

    // Totales del mes seleccionado
    prisma.movimiento.groupBy({
      by: ["tipo"],
      where: {
        anulado: false,
        fecha: { gte: inicioMes, lt: finMes },
      },
      _sum: { monto: true },
    }),

    // Totales del mes anterior (para comparación)
    prisma.movimiento.groupBy({
      by: ["tipo"],
      where: {
        anulado: false,
        fecha: { gte: inicioMesAnterior, lt: finMesAnterior },
      },
      _sum: { monto: true },
    }),

    // Últimos 10 movimientos
    prisma.movimiento.findMany({
      where: { anulado: false },
      include: { concepto: true, cuenta: true, donante: { select: { nombre: true } } },
      orderBy: { fecha: "desc" },
      take: 10,
    }),

    // Convenios próximos a vencer (30 días)
    prisma.convenio.findMany({
      where: {
        anulado: false,
        fechaFin: {
          gte: now,
          lt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      include: { donante: { select: { nombre: true } } },
      orderBy: { fechaFin: "asc" },
      take: 5,
    }),

    // Sesiones programadas para hoy/mañana
    prisma.sesion.findMany({
      where: {
        estado: EstadoSesion.PROGRAMADA,
        fecha: {
          gte: now,
          lt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        convenio: { include: { donante: { select: { nombre: true } } } },
        conferencia: true,
      },
      orderBy: { fecha: "asc" },
      take: 5,
    }),

    // Active convenios with plan price and donante's ingreso movements
    prisma.convenio.findMany({
      where: { anulado: false, fechaFin: { gte: now } },
      include: {
        plan: { select: { precio: true } },
        donante: {
          select: {
            nombre: true,
            movimientos: {
              where: { anulado: false, tipo: TipoMovimiento.INGRESO },
              select: { fecha: true, monto: true, tipo: true, anulado: true },
            },
          },
        },
      },
    }),
  ]);

  // ── Saldos por cuenta ──────────────────────────────────────────────────
  const saldoPorCuenta = new Map<string, number>();
  for (const c of cuentas) {
    saldoPorCuenta.set(c.id, Number(c.saldoInicial));
  }
  for (const row of saldosPorMov) {
    const cur = saldoPorCuenta.get(row.cuentaId) ?? 0;
    const monto = Number(row._sum.monto ?? 0);
    saldoPorCuenta.set(
      row.cuentaId,
      row.tipo === TipoMovimiento.INGRESO ? cur + monto : cur - monto,
    );
  }

  const cuentasConSaldo = cuentas.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    tipo: c.tipo,
    saldo: saldoPorCuenta.get(c.id) ?? 0,
  }));
  const saldoTotal = cuentasConSaldo.reduce((s, c) => s + c.saldo, 0);

  // ── Totales del mes ────────────────────────────────────────────────────
  const sumaPorTipo = (rows: typeof totalesMes) => {
    const r = { INGRESO: 0, EGRESO: 0 };
    for (const row of rows) r[row.tipo] = Number(row._sum.monto ?? 0);
    return r;
  };
  const tot = sumaPorTipo(totalesMes);
  const totAnt = sumaPorTipo(totalesMesAnterior);

  const variacion = (actual: number, anterior: number) => {
    if (anterior === 0) return null;
    return ((actual - anterior) / anterior) * 100;
  };

  // ── Alertas ────────────────────────────────────────────────────────────
  const alertas: Alerta[] = [];

  // FE atrasadas — FIRST (highest priority)
  for (const conv of conveniosParaCobranza) {
    const { cuotas } = calcularCobranza({
      fechaInicio: conv.fechaInicio,
      fechaFin: conv.fechaFin,
      precioMensual: Number(conv.plan.precio),
      movimientosIngreso: conv.donante.movimientos,
    });

    const atrasadas = cuotas.filter(
      (c) =>
        (c.estado === "VENCIDO" || c.estado === "PARCIAL") &&
        (c.anio < anio || (c.anio === anio && c.mes < mes)),
    );

    if (atrasadas.length > 0) {
      const pendiente = atrasadas.reduce(
        (s, c) => s + Math.max(0, c.esperado - c.recibido),
        0,
      );
      alertas.push({
        tipo: "fe-atrasada",
        mensaje: `FE atrasada — ${conv.donante.nombre}: ${formatMoneyShort(pendiente)} pendiente`,
      });
    }
  }

  // Donantes recurrentes con 2+ meses consecutivos atrasados
  try {
    const { donantesAtrasados } = await import("@/lib/donantes/al-dia");
    const atrasados = await donantesAtrasados(2);
    for (const a of atrasados.slice(0, 5)) {
      alertas.push({
        tipo: "donante-atrasado",
        mensaje: `${a.nombre} (${a.tipo.toLowerCase()}): ${a.mesesAtrasados} meses sin aporte`,
      });
    }
  } catch {
    // si la column no existe aún (pre-migration), ignorar
  }

  for (const conv of convenios) {
    const dias = Math.ceil(
      (conv.fechaFin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    alertas.push({
      tipo: "convenio-vence",
      mensaje: `Convenio FE de ${conv.donante.nombre} vence en ${dias} día${dias === 1 ? "" : "s"}`,
    });
  }
  for (const c of cuentasConSaldo) {
    if (c.saldo < SALDO_BAJO_UMBRAL) {
      alertas.push({
        tipo: "saldo-bajo",
        mensaje: `Saldo bajo en ${c.nombre}: ${formatMoneyShort(c.saldo)}`,
      });
    }
  }
  for (const s of sesionesManana) {
    const esHoy =
      s.fecha.toDateString() === now.toDateString();
    alertas.push({
      tipo: "sesion-proxima",
      mensaje: `Sesión FE ${esHoy ? "hoy" : "mañana"}: ${s.convenio.donante.nombre} — ${s.conferencia.titulo}`,
    });
  }

  return {
    anio,
    mes,
    saldoTotal,
    cuentasActivas: cuentasConSaldo.length,
    cuentasConSaldo,
    ingresosMes: tot.INGRESO,
    egresosMes: tot.EGRESO,
    variacionIngresos: variacion(tot.INGRESO, totAnt.INGRESO),
    variacionEgresos: variacion(tot.EGRESO, totAnt.EGRESO),
    movimientosRecientes,
    alertas,
  };
}

export type Alerta = {
  tipo:
    | "saldo-bajo"
    | "convenio-vence"
    | "sesion-proxima"
    | "fe-atrasada"
    | "donante-atrasado";
  mensaje: string;
};

function formatMoneyShort(n: number): string {
  return `$ ${n.toFixed(2)}`;
}
