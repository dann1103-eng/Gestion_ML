/**
 * Importador de presupuestos desde la hoja "Presupuesto 2025" del Excel ML CAJA.
 *
 * Uso:
 *   pnpm import:presupuesto <ruta.xlsx> --anio 2026 [--dry-run]
 *
 * Lee filas de ingresos (C7..C16) y egresos (C21..C37) de la hoja
 * "Presupuesto 2025" — sí, el nombre engaña: contiene presupuesto del año en curso.
 * Mapea conceptos via tabla de alias (Excel → DB) y hace upsert por (conceptoId, anio).
 * Idempotente: re-correr no duplica.
 */
import { argv, exit } from "node:process";
import { existsSync } from "node:fs";
import ExcelJS from "exceljs";
import { PrismaClient, Prisma, TipoMovimiento } from "@prisma/client";

const ALIAS_CONCEPTOS: Record<string, string> = {
  "Donaciones de s": "Donaciones de supernumerarios",
  "Donaciones de cp": "Donaciones de cooperadores",
  "Aporte patronal (en AFCyD)": "Aporte patronal AFCYD",
  "Arreglos y mantenimento": "Arreglos y mantenimiento",
  "Alquiler AFCyD": "Alquiler AFCYD",
  "Fondo de Tejares": "Otros ingresos",
  "Fondo de Tejares ": "Otros ingresos",
};

const HOJA = "Presupuesto 2025";
const FILAS_INGRESOS = { desde: 7, hasta: 16 };
const FILAS_EGRESOS = { desde: 21, hasta: 37 };
const COL_CONCEPTO = 2; // B
const COL_PRESUPUESTO = 3; // C

const args = parseArgs(argv.slice(2));
const prisma = new PrismaClient();

async function main() {
  if (!args.archivo) {
    console.error(
      "Uso: pnpm import:presupuesto <ruta.xlsx> --anio YYYY [--dry-run]",
    );
    exit(1);
  }
  if (!existsSync(args.archivo)) {
    console.error(`No existe: ${args.archivo}`);
    exit(1);
  }
  if (!args.anio) {
    console.error("Falta --anio YYYY");
    exit(1);
  }

  console.log(`📥 Leyendo Excel: ${args.archivo}`);
  console.log(`📅 Año: ${args.anio}`);
  if (args.dryRun) console.log("🧪 Modo dry-run (no escribe en DB)");

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(args.archivo);
  const sheet = wb.getWorksheet(HOJA);
  if (!sheet) {
    console.error(`No se encontró la hoja "${HOJA}"`);
    exit(1);
  }

  const conceptos = await prisma.concepto.findMany();
  // Index por (nombre+tipo) — puede haber duplicados de nombre
  const conceptoPorNombreTipo = new Map(
    conceptos.map((c) => [`${c.nombre}|${c.tipo}`, c]),
  );

  type Item = {
    nombreExcel: string;
    nombreDB: string;
    monto: Prisma.Decimal;
    tipo: TipoMovimiento;
  };
  const items: Item[] = [];
  const noResueltos: string[] = [];

  function leer(rango: { desde: number; hasta: number }, tipo: TipoMovimiento) {
    for (let r = rango.desde; r <= rango.hasta; r++) {
      const nombreCell = sheet!.getRow(r).getCell(COL_CONCEPTO).value;
      const montoCell = sheet!.getRow(r).getCell(COL_PRESUPUESTO).value;
      if (!nombreCell) continue;
      const nombreExcel = String(nombreCell).trim();
      const monto = extraerMonto(montoCell);
      if (monto === null) continue;
      const nombreDB = ALIAS_CONCEPTOS[nombreExcel] ?? nombreExcel;
      const concepto = conceptoPorNombreTipo.get(`${nombreDB}|${tipo}`);
      if (!concepto) {
        noResueltos.push(`${nombreExcel} (DB: ${nombreDB} ${tipo}) — fila ${r}`);
        continue;
      }
      items.push({
        nombreExcel,
        nombreDB,
        monto: new Prisma.Decimal(monto),
        tipo,
      });
    }
  }
  leer(FILAS_INGRESOS, TipoMovimiento.INGRESO);
  leer(FILAS_EGRESOS, TipoMovimiento.EGRESO);

  console.log(`\n📊 ${items.length} presupuestos parseados`);
  for (const it of items) {
    console.log(
      `  • ${it.tipo}\t${it.nombreDB.padEnd(40)} \$${it.monto.toFixed(2).padStart(10)} ${
        it.nombreExcel !== it.nombreDB ? `(alias: "${it.nombreExcel}")` : ""
      }`,
    );
  }

  if (noResueltos.length) {
    console.log(`\n⚠️  ${noResueltos.length} no resueltos:`);
    for (const n of noResueltos) console.log(`  • ${n}`);
  }

  if (args.dryRun) {
    console.log("\n🧪 dry-run: no se escribió a DB.");
    return;
  }

  let creados = 0;
  let actualizados = 0;
  for (const it of items) {
    const concepto = conceptoPorNombreTipo.get(`${it.nombreDB}|${it.tipo}`)!;
    const existing = await prisma.presupuesto.findUnique({
      where: { conceptoId_anio: { conceptoId: concepto.id, anio: args.anio! } },
    });
    await prisma.presupuesto.upsert({
      where: {
        conceptoId_anio: { conceptoId: concepto.id, anio: args.anio! },
      },
      create: {
        conceptoId: concepto.id,
        anio: args.anio!,
        montoMensual: it.monto,
      },
      update: { montoMensual: it.monto },
    });
    if (existing) actualizados++;
    else creados++;
  }

  console.log(`\n✅ Listo: ${creados} creados, ${actualizados} actualizados.`);
}

function extraerMonto(v: ExcelJS.CellValue): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "object" && "result" in v && typeof v.result === "number")
    return v.result;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseArgs(args: string[]) {
  const out: { archivo?: string; anio?: number; dryRun?: boolean } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--anio") out.anio = Number(args[++i]);
    else if (a === "--dry-run") out.dryRun = true;
    else if (!out.archivo) out.archivo = a;
  }
  return out;
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
