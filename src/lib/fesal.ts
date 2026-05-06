import { Prisma, TipoCorrelativo, TipoMovimiento, TipoDonante } from "@prisma/client";
import { generarCorrelativo } from "./correlativo";

export const CONCEPTO_FESAL = "Pensión a FESAL";

/**
 * Genera el egreso espejo a FESAL si:
 *   - El movimiento es INGRESO
 *   - El donante es de tipo NUMERARIO
 *
 * Crea un Movimiento de tipo EGRESO con concepto "Pensión a FESAL",
 * mismo monto, misma cuenta, vinculado al mismo donante (snapshot).
 *
 * Devuelve el id del movimiento espejo, o null si no aplica.
 */
export async function generarEgresoFesalSiCorresponde(
  tx: Prisma.TransactionClient,
  movimiento: {
    id: string;
    tipo: TipoMovimiento;
    fecha: Date;
    monto: Prisma.Decimal;
    cuentaId: string;
    donanteId: string | null;
  },
): Promise<string | null> {
  if (movimiento.tipo !== TipoMovimiento.INGRESO) return null;
  if (!movimiento.donanteId) return null;

  const donante = await tx.donante.findUnique({
    where: { id: movimiento.donanteId },
    select: { tipo: true, nombre: true },
  });
  if (!donante || donante.tipo !== TipoDonante.NUMERARIO) return null;

  const concepto = await tx.concepto.findUnique({
    where: { nombre: CONCEPTO_FESAL },
  });
  if (!concepto) {
    throw new Error(
      `Concepto "${CONCEPTO_FESAL}" no existe. Corre el seed o créalo manualmente.`,
    );
  }

  const valeNumero = await generarCorrelativo(
    tx,
    TipoCorrelativo.EGR,
    movimiento.fecha,
  );

  const egreso = await tx.movimiento.create({
    data: {
      fecha: movimiento.fecha,
      tipo: TipoMovimiento.EGRESO,
      conceptoId: concepto.id,
      cuentaId: movimiento.cuentaId,
      monto: movimiento.monto,
      medioPago: "TRANSFERENCIA",
      descripcion: `Pensión a FESAL — ${donante.nombre}`,
      donanteId: movimiento.donanteId,
      valeNumero,
      notas: `Generado automáticamente del ingreso ${movimiento.id}`,
    },
  });

  return egreso.id;
}
