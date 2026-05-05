// src/lib/conciliacion/queries.ts
import { prisma } from "@/lib/prisma";
import { TipoMovimiento } from "@prisma/client";

export type ConciliacionRow = {
  id: string;
  fecha: Date;
  tipo: TipoMovimiento;
  valeNumero: string;
  concepto: string;
  descripcion: string;
  monto: number;
  conciliado: boolean;
  anulado: boolean;
};

export async function obtenerMovimientosConciliacion(
  cuentaId: string,
  anio: number,
  mes: number,
): Promise<ConciliacionRow[]> {
  const inicio = new Date(Date.UTC(anio, mes - 1, 1));
  const fin = new Date(Date.UTC(anio, mes, 1));

  const rows = await prisma.movimiento.findMany({
    where: {
      cuentaId,
      fecha: { gte: inicio, lt: fin },
    },
    include: { concepto: { select: { nombre: true } } },
    orderBy: { fecha: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    fecha: r.fecha,
    tipo: r.tipo,
    valeNumero: r.valeNumero,
    concepto: r.concepto.nombre,
    descripcion: r.descripcion,
    monto: Number(r.monto),
    conciliado: r.conciliado,
    anulado: r.anulado,
  }));
}
