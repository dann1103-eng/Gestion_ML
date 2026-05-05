/**
 * Importador del Excel ML CAJA gestión {AÑO}.xlsx → DB
 *
 * Uso:
 *   pnpm import:excel <ruta.xlsx> --config <config.json> [--dry-run] [--anio YYYY]
 *
 * Idempotente: usa importHash = sha256(fecha|monto|descripcion|cuentaId)
 * sobre cada movimiento. Re-correr no duplica.
 */
import { argv, exit } from "node:process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import { PrismaClient, TipoMovimiento, MedioPago, TipoCorrelativo } from "@prisma/client";
import { generarCorrelativo } from "../../src/lib/correlativo";
import { generarAfcydSiCorresponde } from "../../src/lib/afcyd";

type Config = {
  anio: number;
  cuentaPorDefecto: string;
  hojas: {
    mensuales: string[];
    ignorar: string[];
  };
  columnasMensuales: Record<string, string[]>;
  filaEncabezado: number | "auto";
  normalizacionMedio: Record<string, string>;
  conceptoPorDefectoIngreso: string;
  conceptoPorDefectoEgreso: string;
  /** Mapa Excel → DB para conceptos abreviados o con typos */
  aliasConceptos?: Record<string, string>;
};

type FilaMensual = {
  fecha: Date;
  vale: string | null;
  concepto: string;
  descripcion: string;
  nombre: string;
  ingreso: number;
  gasto: number;
  hojaOrigen: string;
  fila: number;
};

type ParseStats = {
  hojasLeidas: string[];
  filasParseadas: number;
  filasSinFecha: number;
  filasSinMonto: number;
  filasOk: number;
  conceptosNoEncontrados: Set<string>;
  donantesNoEncontrados: Set<string>;
};

const args = parseArgs(argv.slice(2));
const prisma = new PrismaClient();

async function main() {
  if (!args.archivo) {
    console.error("Uso: pnpm import:excel <ruta.xlsx> --config <config.json> [--dry-run]");
    exit(1);
  }
  if (!existsSync(args.archivo)) {
    console.error(`No existe: ${args.archivo}`);
    exit(1);
  }

  const cfgPath = args.config ?? resolve("scripts/import/config.example.json");
  const config: Config = JSON.parse(readFileSync(cfgPath, "utf-8"));
  if (args.anio) config.anio = args.anio;

  console.log(`📥 Leyendo Excel: ${args.archivo}`);
  console.log(`📋 Config: ${cfgPath}`);
  console.log(`📅 Año: ${config.anio}`);
  if (args.dryRun) console.log("🧪 Modo dry-run (no escribe en DB)");

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(args.archivo);

  const stats: ParseStats = {
    hojasLeidas: [],
    filasParseadas: 0,
    filasSinFecha: 0,
    filasSinMonto: 0,
    filasOk: 0,
    conceptosNoEncontrados: new Set(),
    donantesNoEncontrados: new Set(),
  };

  // Cuenta por defecto
  const cuentaDefault = await prisma.cuenta.findFirst({
    where: { nombre: config.cuentaPorDefecto },
  });
  if (!cuentaDefault && !args.dryRun) {
    console.error(`Cuenta '${config.cuentaPorDefecto}' no existe. Corre el seed primero.`);
    exit(1);
  }

  // Cache de catálogos
  const conceptos = await prisma.concepto.findMany();
  const conceptosByName = new Map<string, (typeof conceptos)[number]>();
  for (const c of conceptos) {
    conceptosByName.set(c.nombre.toLowerCase(), c);
  }

  const conceptoIngresoDefault = conceptosByName.get(
    config.conceptoPorDefectoIngreso.toLowerCase(),
  );
  const conceptoEgresoDefault = conceptosByName.get(
    config.conceptoPorDefectoEgreso.toLowerCase(),
  );

  if (!args.dryRun && (!conceptoIngresoDefault || !conceptoEgresoDefault)) {
    console.error("Conceptos por defecto no encontrados. Corre el seed primero.");
    exit(1);
  }

  // Procesar hojas mensuales
  const filas: FilaMensual[] = [];
  for (const sheet of wb.worksheets) {
    if (config.hojas.ignorar.includes(sheet.name)) continue;

    const esMensual = config.hojas.mensuales.some(
      (n) => sheet.name.trim().toLowerCase() === n.toLowerCase(),
    );
    if (!esMensual) {
      console.log(`  ⊘ ${sheet.name} (no es hoja mensual)`);
      continue;
    }

    stats.hojasLeidas.push(sheet.name);
    const hojaFilas = parseHojaMensual(sheet, config, stats);
    filas.push(...hojaFilas);
    console.log(`  ✓ ${sheet.name}: ${hojaFilas.length} filas`);
  }

  console.log(`\n📊 Total filas parseadas: ${stats.filasParseadas}`);
  console.log(`   - Sin fecha: ${stats.filasSinFecha}`);
  console.log(`   - Sin monto: ${stats.filasSinMonto}`);
  console.log(`   - Válidas: ${stats.filasOk}`);

  // Aliases Excel → DB (necesario para diagnostic dry-run y para insert)
  const aliases = config.aliasConceptos ?? {};
  const aliasesNorm = new Map<string, string>();
  for (const [excelName, dbName] of Object.entries(aliases)) {
    aliasesNorm.set(excelName.toLowerCase().trim(), dbName.toLowerCase().trim());
  }

  if (args.dryRun) {
    console.log(`\n🧪 DRY-RUN: no se inserta nada.`);
    // Diagnóstico de conceptos
    const matched = new Map<string, number>();
    const unmatched = new Map<string, number>();
    for (const f of filas) {
      const excelKey = f.concepto.toLowerCase().trim();
      const dbKey = aliasesNorm.get(excelKey) ?? excelKey;
      if (conceptosByName.has(dbKey)) {
        matched.set(f.concepto, (matched.get(f.concepto) ?? 0) + 1);
      } else {
        unmatched.set(f.concepto, (unmatched.get(f.concepto) ?? 0) + 1);
      }
    }
    console.log(`\n   Conceptos OK (matchean DB):`);
    for (const [c, n] of [...matched.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`     ✓ "${c}" — ${n} mov.`);
    }
    if (unmatched.size > 0) {
      console.log(`\n   ⚠ Conceptos sin match (irán a default):`);
      for (const [c, n] of [...unmatched.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`     ✗ "${c}" — ${n} mov.`);
      }
    }
    return;
  }

  // Inserción idempotente
  let insertados = 0;
  let duplicados = 0;
  let mapeoDefault = 0;
  for (const fila of filas) {
    const tipo = fila.ingreso > 0 ? TipoMovimiento.INGRESO : TipoMovimiento.EGRESO;
    const monto = fila.ingreso > 0 ? fila.ingreso : fila.gasto;
    const excelKey = fila.concepto.toLowerCase().trim();
    const dbKey = aliasesNorm.get(excelKey) ?? excelKey;
    const conceptoMatch = conceptosByName.get(dbKey);
    if (!conceptoMatch) mapeoDefault++;
    const conceptoId =
      conceptoMatch?.id ??
      (tipo === TipoMovimiento.INGRESO ? conceptoIngresoDefault!.id : conceptoEgresoDefault!.id);

    const importHash = createHash("sha256")
      .update(
        [
          fila.fecha.toISOString().slice(0, 10),
          monto.toFixed(2),
          fila.descripcion.trim().toLowerCase(),
          cuentaDefault!.id,
          fila.hojaOrigen,
          fila.fila,
        ].join("|"),
      )
      .digest("hex");

    // Verificar duplicado
    const existing = await prisma.movimiento.findUnique({
      where: { importHash },
    });
    if (existing) {
      duplicados++;
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const tipoCorr =
          tipo === TipoMovimiento.INGRESO ? TipoCorrelativo.INGR : TipoCorrelativo.EGR;
        const valeNumero = await generarCorrelativo(tx, tipoCorr, fila.fecha);

        const m = await tx.movimiento.create({
          data: {
            fecha: fila.fecha,
            tipo,
            conceptoId,
            cuentaId: cuentaDefault!.id,
            monto,
            medioPago: MedioPago.EFECTIVO,
            descripcion: fila.descripcion || `(sin descripción) — ${fila.nombre}`,
            notas: fila.nombre || null,
            valeNumero,
            importHash,
          },
        });

        await generarAfcydSiCorresponde(tx, {
          id: m.id,
          tipo: m.tipo,
          fecha: m.fecha,
          monto: m.monto,
          medioPago: m.medioPago,
          notas: m.notas,
          donanteId: m.donanteId,
        });
      });
      insertados++;
    } catch (e) {
      console.error(`Error en fila ${fila.hojaOrigen}:${fila.fila}:`, e);
    }
  }

  console.log(`\n✅ Importación completa`);
  console.log(`   Insertados: ${insertados}`);
  console.log(`   Duplicados (saltados): ${duplicados}`);
  if (mapeoDefault > 0) {
    console.log(`   ⚠ Mapeados al concepto por defecto: ${mapeoDefault}`);
  }
}

function parseHojaMensual(
  sheet: ExcelJS.Worksheet,
  config: Config,
  stats: ParseStats,
): FilaMensual[] {
  const cols = config.columnasMensuales;
  const filas: FilaMensual[] = [];

  // Detectar fila de encabezado
  let headerRow =
    typeof config.filaEncabezado === "number" ? config.filaEncabezado : 1;
  if (config.filaEncabezado === "auto") {
    for (let r = 1; r <= 10; r++) {
      const row = sheet.getRow(r);
      const txt = row.values?.toString().toLowerCase() ?? "";
      if (txt.includes("fecha") && (txt.includes("ingreso") || txt.includes("gasto"))) {
        headerRow = r;
        break;
      }
    }
  }

  // Mapear columnas por nombre
  const colMap: Record<string, number> = {};
  const headerVals = sheet.getRow(headerRow).values as ExcelJS.CellValue[];
  for (let i = 1; i < headerVals.length; i++) {
    const v = String(headerVals[i] ?? "").trim();
    for (const [key, names] of Object.entries(cols)) {
      if (names.some((n) => n.toLowerCase() === v.toLowerCase())) {
        colMap[key] = i;
      }
    }
  }

  if (!colMap.fecha) return filas; // hoja sin estructura esperada

  for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const fechaRaw = row.getCell(colMap.fecha).value;
    if (!fechaRaw) continue;

    stats.filasParseadas++;

    const fecha = parseDate(fechaRaw);
    if (!fecha) {
      stats.filasSinFecha++;
      continue;
    }

    const ingreso = parseNumber(colMap.ingreso ? row.getCell(colMap.ingreso).value : 0);
    const gasto = parseNumber(colMap.gasto ? row.getCell(colMap.gasto).value : 0);

    if (ingreso <= 0 && gasto <= 0) {
      stats.filasSinMonto++;
      continue;
    }

    const concepto = String(colMap.concepto ? row.getCell(colMap.concepto).value ?? "" : "").trim();
    if (concepto && !concepto.toLowerCase().includes("efectivo") && !concepto.toLowerCase().includes("banco")) {
      stats.conceptosNoEncontrados.add(concepto);
    }

    filas.push({
      fecha,
      vale: colMap.vale ? String(row.getCell(colMap.vale).value ?? "") : null,
      concepto,
      descripcion: String(colMap.descripcion ? row.getCell(colMap.descripcion).value ?? "" : "").trim(),
      nombre: String(colMap.nombre ? row.getCell(colMap.nombre).value ?? "" : "").trim(),
      ingreso,
      gasto,
      hojaOrigen: sheet.name,
      fila: r,
    });
    stats.filasOk++;
  }

  return filas;
}

function parseDate(v: ExcelJS.CellValue): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") {
    // Excel serial date
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + v * 86400000);
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "object" && "result" in v) {
    return parseDate((v as { result?: ExcelJS.CellValue }).result ?? null);
  }
  return null;
}

function parseNumber(v: ExcelJS.CellValue): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.-]/g, "");
    const n = Number(cleaned);
    return isNaN(n) ? 0 : n;
  }
  if (typeof v === "object" && "result" in v) {
    return parseNumber((v as { result?: ExcelJS.CellValue }).result ?? 0);
  }
  return 0;
}

function parseArgs(args: string[]) {
  const out: { archivo?: string; config?: string; dryRun?: boolean; anio?: number } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--config") out.config = args[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--anio") out.anio = Number(args[++i]);
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
