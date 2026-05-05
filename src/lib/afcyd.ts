import { Prisma, MedioPago, TipoCorrelativo, TipoMovimiento } from "@prisma/client";
import { generarCorrelativo } from "./correlativo";

/**
 * Genera la fila espejo en MovimientoAfcyd si corresponde:
 *   - El movimiento es INGRESO
 *   - Existe donante vinculado
 *   - donante.entregaReciboFiscal === true
 *
 * Debe correr DENTRO de la transacción que crea el movimiento.
 *
 * Devuelve el id del MovimientoAfcyd creado, o null si no aplica.
 */
export async function generarAfcydSiCorresponde(
  tx: Prisma.TransactionClient,
  movimiento: {
    id: string;
    tipo: TipoMovimiento;
    fecha: Date;
    monto: Prisma.Decimal;
    medioPago: MedioPago;
    notas: string | null;
    donanteId: string | null;
  },
): Promise<string | null> {
  if (movimiento.tipo !== TipoMovimiento.INGRESO) return null;
  if (!movimiento.donanteId) return null;

  const donante = await tx.donante.findUnique({
    where: { id: movimiento.donanteId },
    select: {
      id: true,
      nombre: true,
      dui: true,
      nit: true,
      correo: true,
      entregaReciboFiscal: true,
    },
  });
  if (!donante || !donante.entregaReciboFiscal) return null;

  const correlativo = await generarCorrelativo(tx, TipoCorrelativo.AFCYD, movimiento.fecha);

  const afcyd = await tx.movimientoAfcyd.create({
    data: {
      movimientoId: movimiento.id,
      fecha: movimiento.fecha,
      donanteId: donante.id,
      monto: movimiento.monto,
      medio: movimiento.medioPago,
      notas: movimiento.notas,
      snapshotDui: donante.dui,
      snapshotNombre: donante.nombre,
      snapshotCorreo: donante.correo,
      snapshotNit: donante.nit,
      correlativo,
    },
  });

  return afcyd.id;
}

/**
 * Anula la fila AFCYD asociada al movimiento (si existe).
 */
export async function anularAfcyd(
  tx: Prisma.TransactionClient,
  movimientoId: string,
): Promise<void> {
  await tx.movimientoAfcyd.updateMany({
    where: { movimientoId, anulado: false },
    data: { anulado: true },
  });
}
