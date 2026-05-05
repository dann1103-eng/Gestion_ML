export type EstadoConvenio = "VIGENTE" | "POR_VENCER" | "VENCIDO";

const DIAS_POR_VENCER = 30;
const MS_DIA = 1000 * 60 * 60 * 24;

export function estadoConvenio(fechaFin: Date, ref: Date = new Date()): EstadoConvenio {
  const diff = fechaFin.getTime() - ref.getTime();
  if (diff < 0) return "VENCIDO";
  if (diff <= DIAS_POR_VENCER * MS_DIA) return "POR_VENCER";
  return "VIGENTE";
}

export function diasRestantes(fechaFin: Date, ref: Date = new Date()): number {
  return Math.ceil((fechaFin.getTime() - ref.getTime()) / MS_DIA);
}
