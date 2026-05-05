/**
 * Corrige el tipo de los donantes ya importados:
 * personas naturales con concepto "Donaciones de s" → SUPERNUMERARIO
 *
 * Uso: pnpm tsx --env-file=.env scripts/import/fix-tipos-donantes.ts [--dry-run]
 */
import { argv } from "node:process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, TipoDonante } from "@prisma/client";

const prisma = new PrismaClient();
const dryRun = argv.includes("--dry-run");
const fileIdx = argv.indexOf("--file");
const filePath = fileIdx >= 0
  ? resolve(argv[fileIdx + 1])
  : resolve("C:/Users/Daniel/Downloads/Datos Donantes - Datos Donantes 2025.csv");

function parseLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      cols.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  cols.push(cur.trim());
  return cols;
}

async function main() {
  console.log(`\n🔧  Corrigiendo tipos de donantes${dryRun ? " (DRY-RUN)" : ""}...\n`);

  const csv = readFileSync(filePath, "utf-8");
  const lines = csv.split(/\r?\n/).filter((l) => l.trim()).slice(1);

  let updated = 0, skipped = 0;

  for (const [i, line] of lines.entries()) {
    const [rawId, rawNombre, , , rawConcepto] = parseLine(line);
    const nombre = rawNombre.trim();
    if (!nombre) continue;

    const esSupernumerario = /^donaciones\s+de\s+s$/i.test(rawConcepto?.trim() ?? "");
    if (!esSupernumerario) { skipped++; continue; }

    const dui = rawId.replace(/\s/g, "");

    // Buscar por DUI primero, luego por nombre
    const donante = dui
      ? await prisma.donante.findFirst({ where: { dui } })
      : await prisma.donante.findFirst({ where: { nombre, tipo: TipoDonante.COOPERADOR } });

    if (!donante) {
      console.log(`  ⚠  No encontrado: ${nombre}`);
      continue;
    }

    if (donante.tipo === TipoDonante.SUPERNUMERARIO) {
      console.log(`  ⏭  ${nombre} — ya es SUPERNUMERARIO`);
      skipped++;
      continue;
    }

    console.log(`  ✦ ${nombre} → SUPERNUMERARIO`);
    if (!dryRun) {
      await prisma.donante.update({
        where: { id: donante.id },
        data: { tipo: TipoDonante.SUPERNUMERARIO },
      });
    }
    updated++;
  }

  console.log(`\n──────────────────────────────────────`);
  console.log(`  ✅ Actualizados: ${updated}`);
  console.log(`  ⏭  Sin cambio:   ${skipped}`);
  console.log(`──────────────────────────────────────\n`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
