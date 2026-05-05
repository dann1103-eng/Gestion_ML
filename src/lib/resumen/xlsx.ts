import ExcelJS from "exceljs";
import type { SerResumenData, SerConceptoFila, SerTotalFila } from "./serialize";
import { NOMBRES_MESES } from "./queries";

const NAVY = "FF1A3550";
const GOLD = "FFF0AA1C";
const CREAM = "FFFAF4EA";
const NAVY_LIGHT = "FFE3EAF2";

const MONEY_FMT = '"$"#,##0.00';
const PCT_FMT = "0.0%";

function applyHeader(cell: ExcelJS.Cell, opts?: { center?: boolean }) {
  cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: CREAM } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  cell.alignment = { horizontal: opts?.center ? "center" : "left", vertical: "middle", wrapText: true };
  cell.border = {
    top: { style: "thin", color: { argb: "FF999999" } },
    bottom: { style: "thin", color: { argb: "FF999999" } },
    left: { style: "thin", color: { argb: "FF999999" } },
    right: { style: "thin", color: { argb: "FF999999" } },
  };
}

function applyTotal(row: ExcelJS.Row) {
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: NAVY } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_LIGHT } };
    c.border = {
      top: { style: "medium", color: { argb: NAVY } },
      bottom: { style: "thin", color: { argb: NAVY } },
    };
  });
}

export async function generarXlsx(data: SerResumenData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gestión ML";
  wb.created = new Date();

  const sh = wb.addWorksheet("Resumen", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });

  // ---- Encabezado ----
  sh.mergeCells("A1:U1");
  const titulo = sh.getCell("A1");
  titulo.value = `Centro Cultural El Molino — Resumen ${NOMBRES_MESES[data.mesActivo - 1]} ${data.anio}`;
  titulo.font = { name: "Times New Roman", size: 16, bold: true, color: { argb: NAVY } };
  titulo.alignment = { horizontal: "center" };

  sh.getRow(2).height = 8;

  // ---- Tabla Ingresos ----
  let row = 3;
  sh.mergeCells(`A${row}:U${row}`);
  const cIng = sh.getCell(`A${row}`);
  cIng.value = "I — INGRESOS";
  applyHeader(cIng);
  row++;

  // Encabezado de columnas
  const headers = [
    "#",
    "Concepto",
    "Real Mensual",
    "Presup. Mensual",
    "% Mes",
    "Real Acum.",
    "Presup. Acum.",
    "% Acum.",
    "Saldo año ant.",
    ...NOMBRES_MESES,
  ];
  headers.forEach((h, i) => {
    const c = sh.getCell(row, i + 1);
    c.value = h;
    applyHeader(c, { center: true });
  });
  row++;

  function escribirFila(r: number, fila: SerConceptoFila, numero: number, _esIngreso: boolean) {
    sh.getCell(r, 1).value = numero;
    sh.getCell(r, 2).value = fila.nombre;
    sh.getCell(r, 3).value = Number(fila.realMensual);
    sh.getCell(r, 3).numFmt = MONEY_FMT;
    sh.getCell(r, 4).value = Number(fila.presupuestoMensual);
    sh.getCell(r, 4).numFmt = MONEY_FMT;
    sh.getCell(r, 5).value = fila.pctMes ?? "";
    sh.getCell(r, 5).numFmt = PCT_FMT;
    sh.getCell(r, 6).value = Number(fila.realAcumulado);
    sh.getCell(r, 6).numFmt = MONEY_FMT;
    sh.getCell(r, 7).value = Number(fila.presupuestoAcumulado);
    sh.getCell(r, 7).numFmt = MONEY_FMT;
    sh.getCell(r, 8).value = fila.pctAcum ?? "";
    sh.getCell(r, 8).numFmt = PCT_FMT;
    // col 9 (saldo año ant.) queda en blanco para conceptos
    for (let i = 0; i < 12; i++) {
      const v = Number(fila.mensual[i]);
      const cell = sh.getCell(r, 10 + i);
      cell.value = v;
      cell.numFmt = MONEY_FMT;
      if (i === data.mesActivo - 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF6E0" } };
      }
    }
  }

  function escribirTotal(r: number, total: SerTotalFila, label: string) {
    sh.getCell(r, 2).value = label;
    sh.getCell(r, 3).value = Number(total.realMensual);
    sh.getCell(r, 3).numFmt = MONEY_FMT;
    sh.getCell(r, 4).value = Number(total.presupuestoMensual);
    sh.getCell(r, 4).numFmt = MONEY_FMT;
    sh.getCell(r, 5).value = total.pctMes ?? "";
    sh.getCell(r, 5).numFmt = PCT_FMT;
    sh.getCell(r, 6).value = Number(total.realAcumulado);
    sh.getCell(r, 6).numFmt = MONEY_FMT;
    sh.getCell(r, 7).value = Number(total.presupuestoAcumulado);
    sh.getCell(r, 7).numFmt = MONEY_FMT;
    sh.getCell(r, 8).value = total.pctAcum ?? "";
    sh.getCell(r, 8).numFmt = PCT_FMT;
    for (let i = 0; i < 12; i++) {
      const cell = sh.getCell(r, 10 + i);
      cell.value = Number(total.mensual[i]);
      cell.numFmt = MONEY_FMT;
    }
    applyTotal(sh.getRow(r));
  }

  data.ingresos.forEach((f, i) => escribirFila(row + i, f, i + 1, true));
  row += data.ingresos.length;
  escribirTotal(row, data.totales.ingresos, "TOTAL INGRESOS");
  row += 2;

  // ---- Tabla Egresos ----
  sh.mergeCells(`A${row}:U${row}`);
  const cEgr = sh.getCell(`A${row}`);
  cEgr.value = "II — EGRESOS";
  applyHeader(cEgr);
  row++;

  headers.forEach((h, i) => {
    const c = sh.getCell(row, i + 1);
    c.value = h;
    applyHeader(c, { center: true });
  });
  row++;

  data.egresos.forEach((f, i) => escribirFila(row + i, f, i + 1, false));
  row += data.egresos.length;
  escribirTotal(row, data.totales.egresos, "TOTAL EGRESOS");
  row += 2;

  // ---- Saldos ----
  sh.mergeCells(`A${row}:U${row}`);
  const cSal = sh.getCell(`A${row}`);
  cSal.value = "III — SALDOS";
  applyHeader(cSal);
  row++;

  function escribirSaldoFila(label: string, mensual: string, acumulado: string | null, mensualArr: string[]) {
    sh.getCell(row, 2).value = label;
    if (mensual) {
      sh.getCell(row, 3).value = Number(mensual);
      sh.getCell(row, 3).numFmt = MONEY_FMT;
    }
    if (acumulado != null) {
      sh.getCell(row, 6).value = Number(acumulado);
      sh.getCell(row, 6).numFmt = MONEY_FMT;
    }
    for (let i = 0; i < 12; i++) {
      const cell = sh.getCell(row, 10 + i);
      cell.value = Number(mensualArr[i]);
      cell.numFmt = MONEY_FMT;
    }
    sh.getRow(row).font = { bold: true };
    row++;
  }

  escribirSaldoFila("SALDO", data.saldos.saldoMensual, data.saldos.saldoAcumulado, data.saldos.saldoMes);
  escribirSaldoFila("SALDO ANTERIOR", "", null, data.saldos.saldoAnterior);
  // override col 9 con saldo año anterior en la fila SALDO ANTERIOR
  sh.getCell(row - 1, 9).value = Number(data.saldoAnualInicial);
  sh.getCell(row - 1, 9).numFmt = MONEY_FMT;
  escribirSaldoFila("SALDO MES PRÓXIMO", "", null, data.saldos.saldoMesProximo);
  applyTotal(sh.getRow(row - 1));

  row += 2;

  // ---- Observaciones ----
  sh.mergeCells(`A${row}:U${row}`);
  const cObs = sh.getCell(`A${row}`);
  cObs.value = "IV — OBSERVACIONES";
  applyHeader(cObs);
  row++;

  if (data.notas.ingresos) {
    sh.getCell(row, 1).value = "Ingresos:";
    sh.getCell(row, 1).font = { bold: true };
    sh.mergeCells(`B${row}:U${row}`);
    sh.getCell(row, 2).value = data.notas.ingresos;
    sh.getRow(row).alignment = { wrapText: true, vertical: "top" };
    sh.getRow(row).height = 60;
    row++;
  }
  if (data.notas.egresos) {
    sh.getCell(row, 1).value = "Egresos:";
    sh.getCell(row, 1).font = { bold: true };
    sh.mergeCells(`B${row}:U${row}`);
    sh.getCell(row, 2).value = data.notas.egresos;
    sh.getRow(row).alignment = { wrapText: true, vertical: "top" };
    sh.getRow(row).height = 60;
    row++;
  }

  // ---- Anchos de columna ----
  sh.getColumn(1).width = 4;
  sh.getColumn(2).width = 32;
  for (let i = 3; i <= 9; i++) sh.getColumn(i).width = 14;
  for (let i = 10; i <= 21; i++) sh.getColumn(i).width = 11;

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
