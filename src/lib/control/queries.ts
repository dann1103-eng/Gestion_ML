import { Prisma, TipoDonante, TipoMovimiento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CONCEPTO_FESAL } from "@/lib/fesal";

export type ControlFila = {
  donanteId: string;
  nombre: string;
  aporteEsperado: Prisma.Decimal | null;
  ingresoMes: Prisma.Decimal[]; // 12
  egresoMes: Prisma.Decimal[]; // 12 (sólo aplica a numerarios — es lo pagado a FESAL)
  totalIngreso: Prisma.Decimal;
  totalEgreso: Prisma.Decimal;
};

export type ControlData = {
  anio: number;
  filas: ControlFila[];
  totales: {
    ingresoMes: Prisma.Decimal[];
    egresoMes: Prisma.Decimal[];
    totalIngreso: Prisma.Decimal;
    totalEgreso: Prisma.Decimal;
  };
};

const ZERO = new Prisma.Decimal(0);
const dec = () => new Prisma.Decimal(0);

export async function getControl({
  anio,
  tipos,
}: {
  anio: number;
  tipos: TipoDonante[];
}): Promise<ControlData> {
  const start = new Date(Date.UTC(anio, 0, 1));
  const end = new Date(Date.UTC(anio + 1, 0, 1));

  const donantes = await prisma.donante.findMany({
    where: {
      tipo: { in: tipos },
      estado: { not: "INACTIVO" },
    },
    orderBy: [{ tipo: "asc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, aporteMensualEsperado: true, tipo: true },
  });

  const conceptoFesal = await prisma.concepto.findUnique({
    where: { nombre: CONCEPTO_FESAL },
    select: { id: true },
  });

  const movimientos = await prisma.movimiento.findMany({
    where: {
      fecha: { gte: start, lt: end },
      anulado: false,
      donanteId: { in: donantes.map((d) => d.id) },
    },
    select: {
      fecha: true,
      donanteId: true,
      monto: true,
      tipo: true,
      conceptoId: true,
    },
  });

  const filas: ControlFila[] = donantes.map((d) => {
    const ingresoMes = Array.from({ length: 12 }, dec);
    const egresoMes = Array.from({ length: 12 }, dec);
    let totalIngreso = ZERO;
    let totalEgreso = ZERO;
    for (const m of movimientos) {
      if (m.donanteId !== d.id) continue;
      const i = m.fecha.getUTCMonth();
      if (m.tipo === TipoMovimiento.INGRESO) {
        ingresoMes[i] = ingresoMes[i].plus(m.monto);
        totalIngreso = totalIngreso.plus(m.monto);
      } else if (
        m.tipo === TipoMovimiento.EGRESO &&
        conceptoFesal &&
        m.conceptoId === conceptoFesal.id
      ) {
        egresoMes[i] = egresoMes[i].plus(m.monto);
        totalEgreso = totalEgreso.plus(m.monto);
      }
    }
    return {
      donanteId: d.id,
      nombre: d.nombre,
      aporteEsperado: d.aporteMensualEsperado,
      ingresoMes,
      egresoMes,
      totalIngreso,
      totalEgreso,
    };
  });

  const totales = {
    ingresoMes: Array.from({ length: 12 }, dec),
    egresoMes: Array.from({ length: 12 }, dec),
    totalIngreso: ZERO as Prisma.Decimal,
    totalEgreso: ZERO as Prisma.Decimal,
  };
  for (const f of filas) {
    for (let i = 0; i < 12; i++) {
      totales.ingresoMes[i] = totales.ingresoMes[i].plus(f.ingresoMes[i]);
      totales.egresoMes[i] = totales.egresoMes[i].plus(f.egresoMes[i]);
    }
    totales.totalIngreso = totales.totalIngreso.plus(f.totalIngreso);
    totales.totalEgreso = totales.totalEgreso.plus(f.totalEgreso);
  }

  return { anio, filas, totales };
}
