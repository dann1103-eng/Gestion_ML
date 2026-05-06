/**
 * Importador de donantes desde las hojas "Control s", "Control ax" y "Control Club"
 * del Excel ML CAJA. Crea/actualiza Donantes con tipo y aporteMensualEsperado.
 *
 * Uso:
 *   pnpm import:donantes-control <ruta.xlsx> [--dry-run]
 *
 * Convención (v1, editable después en /donantes/[id]):
 *   - "Control s y cp"  → tipo = SUPERNUMERARIO (puede cambiar a COOPERADOR manual)
 *   - "Control ax"      → tipo = NUMERARIO
 *   - "Control Club"    → tipo = OCASIONAL (socios del Club)
 *
 * Idempotente: matching por nombre normalizado (case + tildes insensitive).
 * Si el donante ya existe, sólo actualiza aporteMensualEsperado si está vacío.
 */
import { argv, exit } from "node:process";
import { existsSync } from "node:fs";
import ExcelJS from "exceljs";
import { PrismaClient, Prisma, TipoDonante } from "@prisma/client";

const args = parseArgs(argv.slice(2));
const prisma = new PrismaClient();

type Persona = {
  nombre: string;
  presupuesto: Prisma.Decimal | null;
  hojaOrigen: string;
};

function normalizar(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

function leerHojaControl(
  sheet: ExcelJS.Worksheet,
  hojaOrigen: string,
): Persona[] {
  const out: Persona[] = [];
  const seen = new Set<string>();
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const nombreCell = row.getCell(3).value; // col C
    if (!nombreCell) continue;
    const nombre = String(nombreCell).trim();
    if (!nombre) continue;
    // Filtrar headers y agregadores
    const lower = nombre.toLowerCase();
    if (
      lower.startsWith("nombre") ||
      lower.startsWith("total") ||
      lower.startsWith("grupo") ||
      lower.startsWith("plan ") ||
      lower.startsWith("otras") ||
      lower.startsWith("otros") ||
      lower.includes("control") ||
      lower === "egr" ||
      lower === "diferencias" ||
      lower === "totales" ||
      lower === "the mark" ||
      lower.includes("(") ||
      nombre.length < 3
    )
      continue;
    if (lower === "caja el molino") continue;
    const key = normalizar(nombre);
    if (seen.has(key)) continue;
    seen.add(key);

    // Presupuesto en col D (rango anchor del Excel original)
    const presupCell = row.getCell(4).value;
    let presupuesto: Prisma.Decimal | null = null;
    if (presupCell != null) {
      let n: number | null = null;
      if (typeof presupCell === "number") n = presupCell;
      else if (typeof presupCell === "object" && "result" in presupCell && typeof presupCell.result === "number")
        n = presupCell.result;
      else if (typeof presupCell === "string") {
        const parsed = Number(presupCell.replace(/[^\d.-]/g, ""));
        if (Number.isFinite(parsed)) n = parsed;
      }
      if (n != null && n > 0) presupuesto = new Prisma.Decimal(n);
    }

    out.push({ nombre, presupuesto, hojaOrigen });
  }
  return out;
}

async function main() {
  if (!args.archivo) {
    console.error("Uso: pnpm import:donantes-control <ruta.xlsx> [--dry-run]");
    exit(1);
  }
  if (!existsSync(args.archivo)) {
    console.error(`No existe: ${args.archivo}`);
    exit(1);
  }

  console.log(`📥 Leyendo Excel: ${args.archivo}`);
  if (args.dryRun) console.log("🧪 Modo dry-run (no escribe en DB)");

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(args.archivo);

  const fuentes: { hoja: string; tipo: TipoDonante }[] = [
    { hoja: "Control s", tipo: TipoDonante.SUPERNUMERARIO },
    { hoja: "Control ax", tipo: TipoDonante.NUMERARIO },
    { hoja: "Control Club", tipo: TipoDonante.OCASIONAL },
  ];

  const todas: { persona: Persona; tipo: TipoDonante }[] = [];
  for (const f of fuentes) {
    const sheet = wb.getWorksheet(f.hoja);
    if (!sheet) {
      console.warn(`⚠️  Hoja "${f.hoja}" no encontrada — saltando`);
      continue;
    }
    const personas = leerHojaControl(sheet, f.hoja);
    console.log(`\n📋 ${f.hoja} → ${personas.length} personas (tipo=${f.tipo})`);
    for (const p of personas) {
      console.log(
        `  • ${p.nombre.padEnd(35)} ${p.presupuesto ? `\$${p.presupuesto.toFixed(2)}` : "(sin presup.)"}`,
      );
      todas.push({ persona: p, tipo: f.tipo });
    }
  }

  console.log(`\n📊 Total: ${todas.length} personas a procesar`);

  if (args.dryRun) {
    console.log("\n🧪 dry-run: no se escribió a DB.");
    return;
  }

  // Carga existentes para matching idempotente
  const existentes = await prisma.donante.findMany({
    select: { id: true, nombre: true, tipo: true, aporteMensualEsperado: true },
  });
  const indexExistentes = new Map<string, (typeof existentes)[number]>();
  for (const d of existentes) indexExistentes.set(normalizar(d.nombre), d);

  let creados = 0;
  let actualizados = 0;
  let saltados = 0;

  for (const { persona, tipo } of todas) {
    const key = normalizar(persona.nombre);
    const existente = indexExistentes.get(key);
    if (existente) {
      // Sólo actualizar si falta aporte y tenemos uno
      if (
        persona.presupuesto != null &&
        existente.aporteMensualEsperado == null
      ) {
        await prisma.donante.update({
          where: { id: existente.id },
          data: { aporteMensualEsperado: persona.presupuesto },
        });
        actualizados++;
      } else {
        saltados++;
      }
    } else {
      await prisma.donante.create({
        data: {
          nombre: persona.nombre,
          tipo,
          aporteMensualEsperado: persona.presupuesto,
          notas: `Importado de ${persona.hojaOrigen}`,
        },
      });
      creados++;
    }
  }

  console.log(
    `\n✅ Listo: ${creados} creados, ${actualizados} actualizados (aporte), ${saltados} sin cambios.`,
  );
  console.log(
    "Recordatorio: si algún SUPERNUMERARIO debería ser COOPERADOR, ajustarlo manualmente en /donantes/[id].",
  );
}

function parseArgs(args: string[]) {
  const out: { archivo?: string; dryRun?: boolean } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") out.dryRun = true;
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
