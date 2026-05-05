import { Prisma } from "@prisma/client";

const D = (n: string) => new Prisma.Decimal(n);

export function calcularDeducciones(sueldoBase: Prisma.Decimal): {
  isss: Prisma.Decimal;
  afp: Prisma.Decimal;
  isr: Prisma.Decimal;
} {
  // ISSS: min(sueldoBase × 3%, $30.00 cap)
  const isssRaw = sueldoBase.times(D("0.03"));
  const isss = isssRaw.greaterThan(D("30.00")) ? D("30.00") : isssRaw;

  // AFP: sueldoBase × 6.25%
  const afp = sueldoBase.times(D("0.0625"));

  // ISR — tramos oficiales Ministerio de Hacienda El Salvador
  // Los valores $42.35 y $271.09 son constantes publicadas por Hacienda
  let isr: Prisma.Decimal;
  if (sueldoBase.lessThanOrEqualTo(D("472.00"))) {
    isr = D("0");
  } else if (sueldoBase.lessThanOrEqualTo(D("895.24"))) {
    isr = sueldoBase.minus(D("472.00")).times(D("0.10"));
  } else if (sueldoBase.lessThanOrEqualTo(D("2038.10"))) {
    isr = D("42.35").plus(sueldoBase.minus(D("895.24")).times(D("0.20")));
  } else {
    isr = D("271.09").plus(sueldoBase.minus(D("2038.10")).times(D("0.30")));
  }

  return {
    isss: isss.toDecimalPlaces(2),
    afp: afp.toDecimalPlaces(2),
    isr: isr.toDecimalPlaces(2),
  };
}
