import { Prisma } from "@prisma/client";
import type { ResumenData, ConceptoFila, TotalFila } from "./queries";

// Versión serializable (para pasar a Client Components o exportaciones)
export type SerConceptoFila = {
  conceptoId: string;
  nombre: string;
  orden: number;
  realMensual: string;
  presupuestoMensual: string;
  pctMes: number | null;
  realAcumulado: string;
  presupuestoAcumulado: string;
  pctAcum: number | null;
  mensual: string[];
  notasPresupuesto: string | null;
};

export type SerTotalFila = {
  realMensual: string;
  presupuestoMensual: string;
  pctMes: number | null;
  realAcumulado: string;
  presupuestoAcumulado: string;
  pctAcum: number | null;
  mensual: string[];
};

export type SerResumenData = {
  anio: number;
  mesActivo: number;
  ingresos: SerConceptoFila[];
  egresos: SerConceptoFila[];
  totales: { ingresos: SerTotalFila; egresos: SerTotalFila };
  saldos: {
    saldoMensual: string;
    saldoAcumulado: string;
    saldoMes: string[];
    saldoAnterior: string[];
    saldoMesProximo: string[];
  };
  saldoAnualInicial: string;
  notas: { ingresos: string; egresos: string };
};

const dec = (d: Prisma.Decimal): string => d.toString();

function serFila(f: ConceptoFila): SerConceptoFila {
  return {
    conceptoId: f.conceptoId,
    nombre: f.nombre,
    orden: f.orden,
    realMensual: dec(f.realMensual),
    presupuestoMensual: dec(f.presupuestoMensual),
    pctMes: f.pctMes,
    realAcumulado: dec(f.realAcumulado),
    presupuestoAcumulado: dec(f.presupuestoAcumulado),
    pctAcum: f.pctAcum,
    mensual: f.mensual.map(dec),
    notasPresupuesto: f.notasPresupuesto,
  };
}

function serTotal(t: TotalFila): SerTotalFila {
  return {
    realMensual: dec(t.realMensual),
    presupuestoMensual: dec(t.presupuestoMensual),
    pctMes: t.pctMes,
    realAcumulado: dec(t.realAcumulado),
    presupuestoAcumulado: dec(t.presupuestoAcumulado),
    pctAcum: t.pctAcum,
    mensual: t.mensual.map(dec),
  };
}

export function serializeResumen(d: ResumenData): SerResumenData {
  return {
    anio: d.anio,
    mesActivo: d.mesActivo,
    ingresos: d.ingresos.map(serFila),
    egresos: d.egresos.map(serFila),
    totales: { ingresos: serTotal(d.totales.ingresos), egresos: serTotal(d.totales.egresos) },
    saldos: {
      saldoMensual: dec(d.saldos.saldoMensual),
      saldoAcumulado: dec(d.saldos.saldoAcumulado),
      saldoMes: d.saldos.saldoMes.map(dec),
      saldoAnterior: d.saldos.saldoAnterior.map(dec),
      saldoMesProximo: d.saldos.saldoMesProximo.map(dec),
    },
    saldoAnualInicial: dec(d.saldoAnualInicial),
    notas: d.notas,
  };
}
