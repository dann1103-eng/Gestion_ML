import { Prisma, TipoMovimiento, SeccionNota } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ConceptoFila = {
  conceptoId: string;
  nombre: string;
  orden: number;
  realMensual: Prisma.Decimal;
  presupuestoMensual: Prisma.Decimal;
  pctMes: number | null;
  realAcumulado: Prisma.Decimal;
  presupuestoAcumulado: Prisma.Decimal;
  pctAcum: number | null;
  mensual: Prisma.Decimal[]; // 12 meses (Ene..Dic)
  notasPresupuesto: string | null;
};

export type TotalFila = {
  realMensual: Prisma.Decimal;
  presupuestoMensual: Prisma.Decimal;
  pctMes: number | null;
  realAcumulado: Prisma.Decimal;
  presupuestoAcumulado: Prisma.Decimal;
  pctAcum: number | null;
  mensual: Prisma.Decimal[];
};

export type ResumenData = {
  anio: number;
  mesActivo: number;
  ingresos: ConceptoFila[];
  egresos: ConceptoFila[];
  totales: { ingresos: TotalFila; egresos: TotalFila };
  saldos: {
    saldoMensual: Prisma.Decimal;
    saldoAcumulado: Prisma.Decimal;
    saldoMes: Prisma.Decimal[]; // 12: saldo neto del mes (ingresos - egresos)
    saldoAnterior: Prisma.Decimal[]; // 12: saldo arrastrado al inicio del mes
    saldoMesProximo: Prisma.Decimal[]; // 12: saldo al final del mes (acumulado)
  };
  saldoAnualInicial: Prisma.Decimal;
  notas: { ingresos: string; egresos: string };
};

const ZERO = new Prisma.Decimal(0);

function dec(): Prisma.Decimal {
  return new Prisma.Decimal(0);
}

function add(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
  return a.plus(b);
}

function sub(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
  return a.minus(b);
}

function pct(real: Prisma.Decimal, presupuesto: Prisma.Decimal): number | null {
  if (presupuesto.isZero()) return null;
  return real.div(presupuesto).toNumber();
}

export async function getResumen({
  anio,
  mesActivo,
}: {
  anio: number;
  mesActivo: number;
}): Promise<ResumenData> {
  const start = new Date(Date.UTC(anio, 0, 1));
  const end = new Date(Date.UTC(anio + 1, 0, 1));

  const [conceptos, movimientos, presupuestos, saldoIni, notas] = await Promise.all([
    prisma.concepto.findMany({
      where: { activo: true },
      orderBy: [{ tipo: "asc" }, { orden: "asc" }, { nombre: "asc" }],
    }),
    prisma.movimiento.findMany({
      where: {
        fecha: { gte: start, lt: end },
        anulado: false,
      },
      select: { fecha: true, conceptoId: true, monto: true, tipo: true },
    }),
    prisma.presupuesto.findMany({ where: { anio } }),
    prisma.saldoAnualInicial.findUnique({ where: { anio } }),
    prisma.notaMensual.findMany({ where: { anio, mes: mesActivo } }),
  ]);

  // Pivot: conceptoId -> [12]Decimal. Filtro defensivo por tipo:
  // un Movimiento con tipo X solo cuenta si el Concepto al que apunta tiene tipo X.
  const conceptoTipo = new Map(conceptos.map((c) => [c.id, c.tipo]));
  const pivot = new Map<string, Prisma.Decimal[]>();
  for (const c of conceptos) pivot.set(c.id, Array.from({ length: 12 }, () => dec()));
  for (const m of movimientos) {
    if (conceptoTipo.get(m.conceptoId) !== m.tipo) continue; // defensa
    const mes = m.fecha.getUTCMonth();
    const arr = pivot.get(m.conceptoId);
    if (!arr) continue;
    arr[mes] = add(arr[mes], m.monto);
  }

  const presupMap = new Map(presupuestos.map((p) => [p.conceptoId, p]));

  function buildFila(concepto: (typeof conceptos)[number]): ConceptoFila {
    const mensual = pivot.get(concepto.id) ?? Array.from({ length: 12 }, () => dec());
    const presupuestoMensual = presupMap.get(concepto.id)?.montoMensual ?? ZERO;
    const realMensual = mensual[mesActivo - 1] ?? ZERO;
    let realAcumulado = dec();
    for (let i = 0; i < mesActivo; i++) realAcumulado = add(realAcumulado, mensual[i]);
    const presupuestoAcumulado = presupuestoMensual.mul(mesActivo);
    return {
      conceptoId: concepto.id,
      nombre: concepto.nombre,
      orden: concepto.orden,
      realMensual,
      presupuestoMensual,
      pctMes: pct(realMensual, presupuestoMensual),
      realAcumulado,
      presupuestoAcumulado,
      pctAcum: pct(realAcumulado, presupuestoAcumulado),
      mensual,
      notasPresupuesto: presupMap.get(concepto.id)?.notas ?? null,
    };
  }

  const ingresos = conceptos
    .filter((c) => c.tipo === TipoMovimiento.INGRESO)
    .map(buildFila);
  const egresos = conceptos
    .filter((c) => c.tipo === TipoMovimiento.EGRESO)
    .map(buildFila);

  function totalize(filas: ConceptoFila[]): TotalFila {
    const mensual = Array.from({ length: 12 }, () => dec());
    let realMensual = dec();
    let presupuestoMensual = dec();
    let realAcumulado = dec();
    let presupuestoAcumulado = dec();
    for (const f of filas) {
      realMensual = add(realMensual, f.realMensual);
      presupuestoMensual = add(presupuestoMensual, f.presupuestoMensual);
      realAcumulado = add(realAcumulado, f.realAcumulado);
      presupuestoAcumulado = add(presupuestoAcumulado, f.presupuestoAcumulado);
      for (let i = 0; i < 12; i++) mensual[i] = add(mensual[i], f.mensual[i]);
    }
    return {
      realMensual,
      presupuestoMensual,
      pctMes: pct(realMensual, presupuestoMensual),
      realAcumulado,
      presupuestoAcumulado,
      pctAcum: pct(realAcumulado, presupuestoAcumulado),
      mensual,
    };
  }

  const totIng = totalize(ingresos);
  const totEgr = totalize(egresos);

  const saldoAnualInicial = saldoIni?.monto ?? ZERO;

  // Cadena de saldos por mes
  const saldoMes: Prisma.Decimal[] = [];
  const saldoAnterior: Prisma.Decimal[] = [];
  const saldoMesProximo: Prisma.Decimal[] = [];
  let arrastre = saldoAnualInicial;
  for (let i = 0; i < 12; i++) {
    saldoAnterior.push(arrastre);
    const neto = sub(totIng.mensual[i], totEgr.mensual[i]);
    saldoMes.push(neto);
    arrastre = add(arrastre, neto);
    saldoMesProximo.push(arrastre);
  }

  const saldoMensual = sub(totIng.realMensual, totEgr.realMensual);
  const saldoAcumulado = sub(totIng.realAcumulado, totEgr.realAcumulado);

  const notaIng = notas.find((n) => n.seccion === SeccionNota.INGRESOS)?.texto ?? "";
  const notaEgr = notas.find((n) => n.seccion === SeccionNota.EGRESOS)?.texto ?? "";

  return {
    anio,
    mesActivo,
    ingresos,
    egresos,
    totales: { ingresos: totIng, egresos: totEgr },
    saldos: {
      saldoMensual,
      saldoAcumulado,
      saldoMes,
      saldoAnterior,
      saldoMesProximo,
    },
    saldoAnualInicial,
    notas: { ingresos: notaIng, egresos: notaEgr },
  };
}

export const NOMBRES_MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
