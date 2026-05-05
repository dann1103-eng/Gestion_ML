import { Prisma, TipoCorrelativo } from "@prisma/client";

/**
 * Genera el siguiente correlativo mensual de forma atómica.
 * Debe correr DENTRO de una transacción Prisma para garantizar consistencia
 * con el registro al que pertenece (Movimiento, MovimientoAfcyd, ReciboPago).
 *
 * Formato: TIPO-AAAA-MM-NNN  (ej. INGR-2026-11-001)
 *
 * @param tx - cliente prisma (transacción)
 * @param tipo - INGR | EGR | AFCYD | RECIBO
 * @param fecha - cualquier fecha del mes objetivo
 */
export async function generarCorrelativo(
  tx: Prisma.TransactionClient,
  tipo: TipoCorrelativo,
  fecha: Date,
): Promise<string> {
  const anio = fecha.getUTCFullYear();
  const mes = fecha.getUTCMonth() + 1;

  // INSERT ... ON CONFLICT DO UPDATE RETURNING — atómico, sin race conditions.
  const rows = await tx.$queryRaw<{ ultimoNumero: number }[]>`
    INSERT INTO correlativos (id, tipo, anio, mes, "ultimoNumero", "updatedAt")
    VALUES (gen_random_uuid()::text, ${tipo}::"TipoCorrelativo", ${anio}, ${mes}, 1, NOW())
    ON CONFLICT (tipo, anio, mes)
    DO UPDATE SET "ultimoNumero" = correlativos."ultimoNumero" + 1, "updatedAt" = NOW()
    RETURNING "ultimoNumero"
  `;

  const numero = rows[0]?.ultimoNumero ?? 1;
  const mesStr = mes.toString().padStart(2, "0");
  const numStr = numero.toString().padStart(3, "0");
  return `${tipo}-${anio}-${mesStr}-${numStr}`;
}
