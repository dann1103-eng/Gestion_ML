import type { DataCajaChica, DataAfcyd, DataFeMensual, DataAnual } from "./queries";
import { nombreMes } from "./queries";

const fmtFecha = new Intl.DateTimeFormat("es-SV", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function fmtMoney(n: number): string {
  return n.toFixed(2);
}

function csvField(v: string | number | null | undefined): string {
  if (v == null || v === "") return "";
  const s = String(v);
  // Escapar campos que contienen coma, comilla o salto de línea
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(csvField).join(",");
}

// BOM UTF-8 para que Excel detecte el encoding correctamente
const BOM = "﻿";

// ──────────────────────────────────────────────────────────────────────────
// Caja Chica CSV
// ──────────────────────────────────────────────────────────────────────────
export function csvCajaChica(data: DataCajaChica): string {
  const lines: string[] = [];
  lines.push(`Caja Chica Mensual — ${nombreMes(data.mes)} ${data.anio}`);
  if (data.cuentaNombre) lines.push(`Cuenta: ${data.cuentaNombre}`);
  lines.push("");
  lines.push(csvRow(["Fecha", "Vale", "Concepto", "Descripción", "Cuenta", "Donante", "Ingreso", "Egreso"]));

  for (const f of data.filas) {
    lines.push(csvRow([
      fmtFecha.format(f.fecha),
      f.vale,
      f.conceptoNombre,
      f.descripcion,
      f.cuentaNombre,
      f.donanteNombre,
      f.ingreso > 0 ? fmtMoney(f.ingreso) : "",
      f.egreso > 0 ? fmtMoney(f.egreso) : "",
    ]));
  }

  lines.push("");
  lines.push(csvRow(["", "", "", "", "", "TOTAL INGRESOS", fmtMoney(data.totalIngresos), ""]));
  lines.push(csvRow(["", "", "", "", "", "TOTAL EGRESOS", "", fmtMoney(data.totalEgresos)]));
  lines.push(csvRow(["", "", "", "", "", "DIFERENCIA", fmtMoney(data.totalIngresos - data.totalEgresos), ""]));

  return BOM + lines.join("\r\n");
}

// ──────────────────────────────────────────────────────────────────────────
// AFCYD CSV
// ──────────────────────────────────────────────────────────────────────────
export function csvAfcyd(data: DataAfcyd): string {
  const lines: string[] = [];
  lines.push(`Informe de Donantes AFCYD — ${nombreMes(data.mes)} ${data.anio}`);
  lines.push("");
  lines.push(csvRow(["Fecha", "Medio", "DUI", "Nombre", "Monto", "Notas", "Correo"]));

  for (const f of data.filas) {
    lines.push(csvRow([
      fmtFecha.format(f.fecha),
      f.medio,
      f.dui,
      f.nombre,
      fmtMoney(f.monto),
      f.notas,
      f.correo,
    ]));
  }

  lines.push("");
  lines.push(csvRow(["", "", "", "TOTAL", fmtMoney(data.total), "", ""]));
  lines.push(csvRow(["", `${data.totalDonantes} donantes únicos`, "", `${data.totalBanco} vía Banco`, `${data.totalEfectivo} en Efectivo`]));

  return BOM + lines.join("\r\n");
}

// ── FE Mensual ─────────────────────────────────────────────────────────────

export function csvFeMensual(data: DataFeMensual): string {
  const lines: string[] = [];
  lines.push(`Reporte FE Mensual — ${nombreMes(data.mes).toUpperCase()} ${data.anio}`);
  lines.push("");

  // Cobranza section
  lines.push("COBRANZA");
  lines.push(csvRow(["Empresa", "Plan", "Esperado", "Recibido", "Diferencia", "Estado"]));
  for (const f of data.cobranza) {
    lines.push(csvRow([
      csvField(f.empresa),
      csvField(f.plan),
      fmtMoney(f.esperado),
      fmtMoney(f.recibido),
      fmtMoney(f.diferencia),
      csvField(f.estado),
    ]));
  }
  lines.push(csvRow(["TOTAL", "", fmtMoney(data.totalEsperado), fmtMoney(data.totalRecibido), fmtMoney(data.totalRecibido - data.totalEsperado), ""]));
  lines.push("");

  // Sessions section
  lines.push("SESIONES");
  lines.push(csvRow(["Fecha", "Empresa", "Conferencia", "Modalidad", "Ponente", "Estado"]));
  for (const s of data.sesiones) {
    lines.push(csvRow([
      fmtFecha.format(s.fecha),
      csvField(s.empresa),
      csvField(s.conferencia),
      csvField(s.modalidad),
      csvField(s.ponente ?? ""),
      csvField(s.estado),
    ]));
  }

  return BOM + lines.join("\r\n");
}

// ── Resumen Anual ──────────────────────────────────────────────────────────────

export function csvAnual(data: DataAnual): string {
  const lines: string[] = [];
  lines.push(`﻿Resumen Anual ${data.anio}`);
  lines.push(`${data.countMovimientos} movimientos`);
  lines.push("");

  // Ingresos section
  lines.push("INGRESOS");
  lines.push(csvRow(["Concepto", "Total", "Movimientos"]));
  for (const f of data.filas.filter((f) => f.tipo === "INGRESO")) {
    lines.push(csvRow([csvField(f.concepto), fmtMoney(f.total), String(f.count)]));
  }
  lines.push(csvRow(["TOTAL INGRESOS", fmtMoney(data.ingresosTotal), ""]));
  lines.push("");

  // Egresos section
  lines.push("EGRESOS");
  lines.push(csvRow(["Concepto", "Total", "Movimientos"]));
  for (const f of data.filas.filter((f) => f.tipo === "EGRESO")) {
    lines.push(csvRow([csvField(f.concepto), fmtMoney(f.total), String(f.count)]));
  }
  lines.push(csvRow(["TOTAL EGRESOS", fmtMoney(data.egresosTotal), ""]));
  lines.push("");

  lines.push(csvRow(["BALANCE", fmtMoney(data.balance), ""]));

  return lines.join("\r\n");
}
