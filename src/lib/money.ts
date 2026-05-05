import { Prisma } from "@prisma/client";

const fmt = new Intl.NumberFormat("es-SV", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value: Prisma.Decimal | number | string): string {
  return fmt.format(typeof value === "number" ? value : Number(value));
}

export function toDecimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

const UNIDADES = [
  "",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
];
const DECENAS_10_19 = [
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
];
const DECENAS = [
  "",
  "diez",
  "veinte",
  "treinta",
  "cuarenta",
  "cincuenta",
  "sesenta",
  "setenta",
  "ochenta",
  "noventa",
];
const CENTENAS = [
  "",
  "ciento",
  "doscientos",
  "trescientos",
  "cuatrocientos",
  "quinientos",
  "seiscientos",
  "setecientos",
  "ochocientos",
  "novecientos",
];

function deAUnNumeroEnLetras(n: number): string {
  if (n === 0) return "cero";
  if (n === 100) return "cien";

  let result = "";

  const cent = Math.floor(n / 100);
  const resto = n % 100;
  if (cent > 0) result += CENTENAS[cent] + " ";

  if (resto >= 10 && resto <= 19) {
    result += DECENAS_10_19[resto - 10];
  } else {
    const dec = Math.floor(resto / 10);
    const uni = resto % 10;
    if (dec === 2 && uni > 0) {
      result += "veinti" + UNIDADES[uni];
    } else if (dec > 0) {
      result += DECENAS[dec];
      if (uni > 0) result += " y " + UNIDADES[uni];
    } else if (uni > 0) {
      result += UNIDADES[uni];
    }
  }

  return result.trim();
}

/**
 * Convierte un monto a representación en letras: "ciento veinticinco 50/100 dólares"
 */
export function montoEnLetras(value: Prisma.Decimal | number | string): string {
  const n = Number(value);
  const entero = Math.floor(n);
  const cents = Math.round((n - entero) * 100);

  let palabras: string;
  if (entero < 1000) {
    palabras = deAUnNumeroEnLetras(entero);
  } else if (entero < 1_000_000) {
    const miles = Math.floor(entero / 1000);
    const resto = entero % 1000;
    const milPart = miles === 1 ? "mil" : `${deAUnNumeroEnLetras(miles)} mil`;
    palabras = resto === 0 ? milPart : `${milPart} ${deAUnNumeroEnLetras(resto)}`;
  } else {
    palabras = entero.toString();
  }

  return `${palabras} ${cents.toString().padStart(2, "0")}/100 dólares`.trim();
}
