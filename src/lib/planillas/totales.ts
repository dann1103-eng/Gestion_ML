import { Prisma, TipoPartida } from "@prisma/client";

const TIPOS_DESCUENTO: TipoPartida[] = [
  TipoPartida.DESCUENTO_ISSS,
  TipoPartida.DESCUENTO_AFP,
  TipoPartida.DESCUENTO_ISR,
  TipoPartida.DESCUENTO_OTRO,
];

export async function recalcularTotales(
  planillaId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const partidas = await tx.partidaPlanilla.findMany({ where: { planillaId } });

  let totalBruto = new Prisma.Decimal(0);
  let totalDescuentos = new Prisma.Decimal(0);

  for (const p of partidas) {
    if (TIPOS_DESCUENTO.includes(p.tipo)) {
      totalDescuentos = totalDescuentos.plus(p.monto);
    } else {
      totalBruto = totalBruto.plus(p.monto);
    }
  }

  await tx.planilla.update({
    where: { id: planillaId },
    data: {
      totalBruto,
      totalDescuentos,
      totalNeto: totalBruto.minus(totalDescuentos),
    },
  });
}
