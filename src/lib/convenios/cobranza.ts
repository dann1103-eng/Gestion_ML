import type { Movimiento } from "@prisma/client";

export type EstadoCuota = "AL_DIA" | "PARCIAL" | "PENDIENTE" | "VENCIDO";

export type CuotaMes = {
  anio: number;
  mes: number;
  etiqueta: string;
  esperado: number;
  recibido: number;
  diferencia: number;
  estado: EstadoCuota;
};

export type ResumenCobranza = {
  cuotas: CuotaMes[];
  totalEsperado: number;
  totalRecibido: number;
  totalPendiente: number;
};

const MESES_CORTO = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

/**
 * Itera mes por mes desde fechaInicio hasta fechaFin (incluyendo el mes de fechaFin)
 * y produce una cuota por cada mes. El "recibido" se obtiene sumando los movimientos
 * INGRESO no anulados del donante en ese mes.
 */
export function calcularCobranza(opts: {
  fechaInicio: Date;
  fechaFin: Date;
  precioMensual: number;
  movimientosIngreso: Pick<Movimiento, "fecha" | "monto" | "tipo" | "anulado">[];
  ref?: Date;
}): ResumenCobranza {
  const { fechaInicio, fechaFin, precioMensual, movimientosIngreso } = opts;
  const ref = opts.ref ?? new Date();

  const cuotas: CuotaMes[] = [];
  let totalEsperado = 0;
  let totalRecibido = 0;

  const cursorAnio = fechaInicio.getUTCFullYear();
  const cursorMes = fechaInicio.getUTCMonth();
  const finAnio = fechaFin.getUTCFullYear();
  const finMes = fechaFin.getUTCMonth();

  let a = cursorAnio;
  let m = cursorMes;

  while (a < finAnio || (a === finAnio && m <= finMes)) {
    const inicioMes = new Date(Date.UTC(a, m, 1));
    const inicioMesSiguiente = new Date(Date.UTC(a, m + 1, 1));

    const recibido = movimientosIngreso
      .filter(
        (mov) =>
          !mov.anulado &&
          mov.fecha >= inicioMes &&
          mov.fecha < inicioMesSiguiente,
      )
      .reduce((s, mov) => s + Number(mov.monto), 0);

    const diferencia = recibido - precioMensual;
    let estado: EstadoCuota;
    if (recibido >= precioMensual) {
      estado = "AL_DIA";
    } else if (recibido > 0) {
      estado = "PARCIAL";
    } else if (inicioMesSiguiente <= ref) {
      estado = "VENCIDO";
    } else {
      estado = "PENDIENTE";
    }

    cuotas.push({
      anio: a,
      mes: m + 1,
      etiqueta: `${MESES_CORTO[m]} ${a}`,
      esperado: precioMensual,
      recibido,
      diferencia,
      estado,
    });

    totalEsperado += precioMensual;
    totalRecibido += recibido;

    m += 1;
    if (m === 12) {
      m = 0;
      a += 1;
    }
  }

  return {
    cuotas,
    totalEsperado,
    totalRecibido,
    totalPendiente: Math.max(0, totalEsperado - totalRecibido),
  };
}

export function mesesEntre(fechaInicio: Date, fechaFin: Date): number {
  const meses =
    (fechaFin.getUTCFullYear() - fechaInicio.getUTCFullYear()) * 12 +
    (fechaFin.getUTCMonth() - fechaInicio.getUTCMonth()) +
    1;
  return Math.max(1, meses);
}
