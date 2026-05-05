import { prisma } from "@/lib/prisma";
import { TipoMovimiento } from "@prisma/client";
import { calcularCobranza } from "@/lib/convenios/cobranza";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function nombreMes(mes: number): string {
  return MESES[mes - 1] ?? `Mes ${mes}`;
}

export function rangoMes(anio: number, mes: number): { inicio: Date; fin: Date } {
  return {
    inicio: new Date(Date.UTC(anio, mes - 1, 1)),
    fin: new Date(Date.UTC(anio, mes, 1)),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Caja Chica
// ──────────────────────────────────────────────────────────────────────────
export type FilaCajaChica = {
  fecha: Date;
  vale: string;
  conceptoNombre: string;
  conceptoTipo: TipoMovimiento;
  descripcion: string;
  cuentaNombre: string;
  donanteNombre: string | null;
  ingreso: number;
  egreso: number;
};

export type DataCajaChica = {
  anio: number;
  mes: number;
  cuentaNombre: string | null;
  filas: FilaCajaChica[];
  totalIngresos: number;
  totalEgresos: number;
};

export async function dataCajaChica(opts: {
  anio: number;
  mes: number;
  cuentaId?: string;
}): Promise<DataCajaChica> {
  const { inicio, fin } = rangoMes(opts.anio, opts.mes);

  const [movs, cuenta] = await Promise.all([
    prisma.movimiento.findMany({
      where: {
        anulado: false,
        fecha: { gte: inicio, lt: fin },
        ...(opts.cuentaId ? { cuentaId: opts.cuentaId } : {}),
      },
      include: {
        concepto: { select: { nombre: true, tipo: true } },
        cuenta: { select: { nombre: true } },
        donante: { select: { nombre: true } },
      },
      orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
    }),
    opts.cuentaId
      ? prisma.cuenta.findUnique({ where: { id: opts.cuentaId }, select: { nombre: true } })
      : Promise.resolve(null),
  ]);

  const filas: FilaCajaChica[] = movs.map((m) => ({
    fecha: m.fecha,
    vale: m.valeNumero,
    conceptoNombre: m.concepto.nombre,
    conceptoTipo: m.concepto.tipo,
    descripcion: m.descripcion,
    cuentaNombre: m.cuenta.nombre,
    donanteNombre: m.donante?.nombre ?? null,
    ingreso: m.tipo === TipoMovimiento.INGRESO ? Number(m.monto) : 0,
    egreso: m.tipo === TipoMovimiento.EGRESO ? Number(m.monto) : 0,
  }));

  const totalIngresos = filas.reduce((s, f) => s + f.ingreso, 0);
  const totalEgresos = filas.reduce((s, f) => s + f.egreso, 0);

  return {
    anio: opts.anio,
    mes: opts.mes,
    cuentaNombre: cuenta?.nombre ?? null,
    filas,
    totalIngresos,
    totalEgresos,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// AFCYD
// ──────────────────────────────────────────────────────────────────────────
export type FilaAfcyd = {
  fecha: Date;
  medio: string;
  dui: string | null;
  nombre: string;
  monto: number;
  notas: string | null;
  correo: string | null;
};

export type DataAfcyd = {
  anio: number;
  mes: number;
  filas: FilaAfcyd[];
  total: number;
  totalDonantes: number;
  totalBanco: number;
  totalEfectivo: number;
};

const MEDIO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Banco",
  CHEQUE: "Cheque",
  TARJETA: "Tarjeta",
  REMESA: "Banco",
  OTRO: "Otro",
};

export async function dataAfcyd(opts: {
  anio: number;
  mes: number;
}): Promise<DataAfcyd> {
  const { inicio, fin } = rangoMes(opts.anio, opts.mes);

  const movs = await prisma.movimientoAfcyd.findMany({
    where: {
      anulado: false,
      fecha: { gte: inicio, lt: fin },
    },
    orderBy: { fecha: "asc" },
  });

  const filas: FilaAfcyd[] = movs.map((a) => ({
    fecha: a.fecha,
    medio: MEDIO_LABEL[a.medio] ?? a.medio,
    dui: a.snapshotDui,
    nombre: a.snapshotNombre,
    monto: Number(a.monto),
    notas: a.notas,
    correo: a.snapshotCorreo,
  }));

  const duisUnicos = new Set(filas.map((f) => f.dui ?? f.nombre));
  const totalEfectivo = filas.filter((f) => f.medio === "Efectivo").length;
  const totalBanco = filas.filter((f) => f.medio === "Banco").length;

  return {
    anio: opts.anio,
    mes: opts.mes,
    filas,
    total: filas.reduce((s, f) => s + f.monto, 0),
    totalDonantes: duisUnicos.size,
    totalBanco,
    totalEfectivo,
  };
}

// ── FE Mensual ────────────────────────────────────────────────────────────────

export type FilaCobranzaFE = {
  empresa: string;
  plan: string; // e.g. "GOLD"
  esperado: number;
  recibido: number;
  diferencia: number;
  estado: "AL_DIA" | "PARCIAL" | "PENDIENTE" | "VENCIDO";
};

export type FilaSesionFE = {
  fecha: Date;
  empresa: string;
  conferencia: string;
  modalidad: string;
  ponente: string | null;
  estado: string;
};

export type DataFeMensual = {
  anio: number;
  mes: number;
  cobranza: FilaCobranzaFE[];
  sesiones: FilaSesionFE[];
  totalEsperado: number;
  totalRecibido: number;
  conveniosActivos: number;
};

export async function dataFeMensual(opts: {
  anio: number;
  mes: number;
}): Promise<DataFeMensual> {
  const { anio, mes } = opts;
  const primerDia = new Date(Date.UTC(anio, mes - 1, 1));
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)); // último día del mes
  const iniciSiguiente = new Date(Date.UTC(anio, mes, 1));

  // Convenios que solapan con el mes
  const convenios = await prisma.convenio.findMany({
    where: {
      fechaInicio: { lte: ultimoDia },
      fechaFin: { gte: primerDia },
    },
    include: {
      donante: {
        select: {
          nombre: true,
          movimientos: {
            where: { tipo: "INGRESO", anulado: false },
            select: { fecha: true, monto: true, tipo: true, anulado: true },
          },
        },
      },
      plan: true,
    },
    orderBy: { fechaInicio: "asc" },
  });

  // Sesiones del mes
  const sesionesDb = await prisma.sesion.findMany({
    where: { fecha: { gte: primerDia, lt: iniciSiguiente } },
    include: {
      convenio: {
        include: { donante: { select: { nombre: true } } },
      },
      conferencia: { select: { titulo: true } },
    },
    orderBy: { fecha: "asc" },
  });

  const cobranza: FilaCobranzaFE[] = convenios.map((conv) => {
    const resultado = calcularCobranza({
      fechaInicio: conv.fechaInicio,
      fechaFin: conv.fechaFin,
      precioMensual: Number(conv.plan.precio),
      movimientosIngreso: conv.donante.movimientos,
    });
    const cuota = resultado.cuotas.find((c) => c.anio === anio && c.mes === mes);
    return {
      empresa: conv.donante.nombre,
      plan: conv.plan.tipo,
      esperado: cuota?.esperado ?? Number(conv.plan.precio),
      recibido: cuota?.recibido ?? 0,
      diferencia: cuota?.diferencia ?? -(Number(conv.plan.precio)),
      estado: cuota?.estado ?? "PENDIENTE",
    };
  });

  const sesiones: FilaSesionFE[] = sesionesDb.map((s) => ({
    fecha: s.fecha,
    empresa: s.convenio.donante.nombre,
    conferencia: s.conferencia.titulo,
    modalidad: s.modalidad,
    ponente: s.ponente,
    estado: s.estado,
  }));

  return {
    anio,
    mes,
    cobranza,
    sesiones,
    totalEsperado: cobranza.reduce((sum, r) => sum + r.esperado, 0),
    totalRecibido: cobranza.reduce((sum, r) => sum + r.recibido, 0),
    conveniosActivos: convenios.length,
  };
}

// ── Resumen Anual ─────────────────────────────────────────────────────────────

export type FilaConceptoAnual = {
  concepto: string;
  tipo: "INGRESO" | "EGRESO";
  total: number;
  count: number;
};

export type DataAnual = {
  anio: number;
  filas: FilaConceptoAnual[];
  ingresosTotal: number;
  egresosTotal: number;
  balance: number;
  countMovimientos: number;
};

export async function dataAnual(opts: { anio: number }): Promise<DataAnual> {
  const { anio } = opts;
  const inicio = new Date(Date.UTC(anio, 0, 1));
  const fin    = new Date(Date.UTC(anio + 1, 0, 1));

  // Use groupBy for efficient aggregation
  const grouped = await prisma.movimiento.groupBy({
    by: ["conceptoId", "tipo"],
    where: { anulado: false, fecha: { gte: inicio, lt: fin } },
    _sum:   { monto: true },
    _count: { id: true },
    orderBy: [{ tipo: "asc" }],
  });

  // Fetch concept names
  const conceptoIds = [...new Set(grouped.map((g) => g.conceptoId))];
  const conceptos = await prisma.concepto.findMany({
    where: { id: { in: conceptoIds } },
    select: { id: true, nombre: true },
  });
  const conceptoMap = Object.fromEntries(conceptos.map((c) => [c.id, c.nombre]));

  const filas: FilaConceptoAnual[] = grouped
    .map((g) => ({
      concepto: conceptoMap[g.conceptoId] ?? g.conceptoId,
      tipo: g.tipo as "INGRESO" | "EGRESO",
      total: Number(g._sum.monto ?? 0),
      count: g._count.id,
    }))
    .sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === "INGRESO" ? -1 : 1;
      return b.total - a.total; // within same tipo, sort by total desc
    });

  const ingresosTotal = filas.filter((f) => f.tipo === "INGRESO").reduce((s, f) => s + f.total, 0);
  const egresosTotal  = filas.filter((f) => f.tipo === "EGRESO").reduce((s, f) => s + f.total, 0);

  return {
    anio,
    filas,
    ingresosTotal,
    egresosTotal,
    balance: ingresosTotal - egresosTotal,
    countMovimientos: grouped.reduce((s, g) => s + g._count.id, 0),
  };
}
