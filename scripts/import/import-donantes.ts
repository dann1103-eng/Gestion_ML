/**
 * Importador de donantes desde CSV
 *
 * Uso:
 *   pnpm import:donantes [--dry-run] [--file <ruta.csv>]
 *
 * Idempotente: omite donantes cuyo DUI o NIT ya existe en la DB.
 * Todos los donantes importados quedan con entregaReciboFiscal=true.
 */
import { argv } from "node:process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, TipoDonante, EstadoDonante } from "@prisma/client";

const prisma = new PrismaClient();
const dryRun = argv.includes("--dry-run");
const fileIdx = argv.indexOf("--file");
const filePath = fileIdx >= 0
  ? resolve(argv[fileIdx + 1])
  : resolve("C:/Users/Daniel/Downloads/Datos Donantes - Datos Donantes 2025.csv");

// ── CSV parser (soporta campos entre comillas con comas y "" escapadas) ───────
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

// ── Normalización de IDs ──────────────────────────────────────────────────────
function normalizeId(raw: string): string {
  return raw.replace(/\s/g, "");
}

type IdResult =
  | { kind: "dui";        value: string }
  | { kind: "nit";        value: string }
  | { kind: "nitEmpresa"; value: string }
  | { kind: "unknown";    value: string }
  | { kind: "empty" };

function classifyId(raw: string): IdResult {
  const v = normalizeId(raw);
  if (!v) return { kind: "empty" };

  // NIT tradicional: XXXX-XXXXXX-XXX-X
  if (/^\d{4}-\d{6}-\d{3}-\d$/.test(v)) return { kind: "nitEmpresa", value: v };

  // NIT 14 dígitos sin guiones → formatear
  if (/^\d{14}$/.test(v)) {
    const fmt = `${v.slice(0, 4)}-${v.slice(4, 10)}-${v.slice(10, 13)}-${v.slice(13)}`;
    return { kind: "nitEmpresa", value: fmt };
  }

  // DUI / NIT homologado: XXXXXXXX-X
  if (/^\d{8}-\d$/.test(v)) return { kind: "dui", value: v };

  return { kind: "unknown", value: v };
}

// ── Detección de empresa por nombre ──────────────────────────────────────────
function esEmpresa(nombre: string): boolean {
  const n = nombre.toUpperCase();
  return (
    /\b(S\.?A\.?|S\.?R\.?L\.?|SOCIEDAD|COOP\b|COOPERATIVA|INVERSIONES|DISTRIBUIDORA)\b/.test(n) ||
    /\bDE\s+C\.?V\.?\b/.test(n) ||
    /\bCAJA\s+DE\s+CR[EÉ]DITO\b/.test(n)
  );
}

function cleanEmail(raw: string): string | null {
  // Elimina comillas internas que son artefactos CSV (e.g., javier."overall"@...)
  const v = raw.replace(/"/g, "").trim();
  if (!v) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return null;
  return v;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📋  Importando donantes desde: ${filePath}`);
  if (dryRun) console.log("     ⚠️  DRY-RUN activado — no se escribirá nada en la DB\n");
  else console.log();

  const csv = readFileSync(filePath, "utf-8");
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  const rows = lines.slice(1); // omitir encabezado

  let created = 0, skipped = 0, errors = 0;
  const seenKeys = new Set<string>(); // deduplicación dentro del mismo CSV

  for (const [i, line] of rows.entries()) {
    const rowNum = i + 2; // fila real en CSV (1-based + header)
    const [rawId, rawNombre, rawClasif, rawEmail, rawConcepto] = parseLine(line);
    const nombre = rawNombre.trim();

    // ── Filas a omitir ──────────────────────────────────────────────────────
    if (!nombre) {
      skipped++;
      continue;
    }
    // Fila "Ingresos por actividad" no es un donante
    if (nombre.toLowerCase().startsWith("ingresos por actividad")) {
      console.log(`  ⏭  Fila ${rowNum}: "${nombre}" — no es donante, omitida`);
      skipped++;
      continue;
    }

    // ── ID ──────────────────────────────────────────────────────────────────
    const idResult = classifyId(rawId);
    const isCompany = idResult.kind === "nitEmpresa" || esEmpresa(nombre);

    let dui: string | null = null;
    let nit: string | null = null;
    let nitEmpresa: string | null = null;
    let unknownId: string | null = null;

    if (isCompany) {
      // Para empresas cualquier ID va a nitEmpresa (el campo es String? sin validación en DB)
      if (idResult.kind !== "empty") nitEmpresa = idResult.value;
    } else {
      if (idResult.kind === "dui") {
        dui = idResult.value;
      } else if (idResult.kind === "nit") {
        nit = idResult.value;
      } else if (idResult.kind === "unknown") {
        unknownId = idResult.value;
      }
      // "nitEmpresa" queda en isCompany=true → imposible aquí por narrowing de TS
    }

    // ── Deduplicación intra-CSV ─────────────────────────────────────────────
    const dedupeKey = dui ?? nit ?? nitEmpresa ?? null;
    if (dedupeKey) {
      if (seenKeys.has(dedupeKey)) {
        console.log(`  ⏭  Fila ${rowNum}: "${nombre}" — ${dedupeKey} ya procesado en este CSV, omitido`);
        skipped++;
        continue;
      }
      seenKeys.add(dedupeKey);
    }

    // ── Correo ──────────────────────────────────────────────────────────────
    const correo = cleanEmail(rawEmail);

    // ── Notas ───────────────────────────────────────────────────────────────
    const notesParts: string[] = [];
    const clasifEsNombreOtro =
      rawClasif && rawClasif !== nombre && rawClasif !== "Cooperador" && rawClasif !== "Apm";
    if (rawClasif && clasifEsNombreOtro) notesParts.push(`Clasificación: ${rawClasif}`);
    else if (rawClasif === "Apm") notesParts.push("Clasificación: Apm (aportación mensual)");
    if (rawConcepto) notesParts.push(`Concepto habitual: ${rawConcepto}`);
    if (unknownId) notesParts.push(`ID (formato desconocido): ${unknownId}`);
    const notas = notesParts.length ? notesParts.join(" | ") : null;

    const esSupernumerario =
      !isCompany && /^donaciones\s+de\s+s$/i.test(rawConcepto?.trim() ?? "");
    const tipo: TipoDonante = isCompany
      ? TipoDonante.EMPRESA_FE
      : esSupernumerario
        ? TipoDonante.SUPERNUMERARIO
        : TipoDonante.COOPERADOR;

    // ── Log ─────────────────────────────────────────────────────────────────
    const idTag = dui
      ? `DUI:${dui}`
      : nit
        ? `NIT:${nit}`
        : nitEmpresa
          ? `NIT-Empresa:${nitEmpresa}`
          : unknownId
            ? `ID?:${unknownId}`
            : "sin ID";
    console.log(`  ✦ Fila ${rowNum}: ${nombre.padEnd(45)} ${tipo.padEnd(12)} ${idTag}`);

    if (dryRun) { created++; continue; }

    // ── DB: verificar si ya existe ──────────────────────────────────────────
    try {
      if (dui) {
        const exists = await prisma.donante.findFirst({ where: { dui } });
        if (exists) {
          console.log(`     → Ya existe por DUI, omitido`);
          skipped++;
          continue;
        }
      } else if (nitEmpresa) {
        const exists = await prisma.donante.findFirst({
          where: { empresaDetalle: { nitEmpresa } },
        });
        if (exists) {
          console.log(`     → Ya existe por NIT empresa, omitido`);
          skipped++;
          continue;
        }
      } else if (nit) {
        const exists = await prisma.donante.findFirst({ where: { nit } });
        if (exists) {
          console.log(`     → Ya existe por NIT, omitido`);
          skipped++;
          continue;
        }
      }

      // ── Crear donante ──────────────────────────────────────────────────
      await prisma.donante.create({
        data: {
          tipo,
          nombre,
          dui,
          nit,
          correo,
          entregaReciboFiscal: true,
          estado: EstadoDonante.ACTIVO,
          notas,
          ...(isCompany
            ? {
                empresaDetalle: {
                  create: {
                    razonSocial: nombre,
                    nitEmpresa,
                  },
                },
              }
            : {}),
        },
      });
      console.log(`     ✓ Creado`);
      created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`     ✗ Error: ${msg}`);
      errors++;
    }
  }

  console.log(`\n──────────────────────────────────────────`);
  console.log(`  ✅ Creados:  ${created}`);
  console.log(`  ⏭  Omitidos: ${skipped}`);
  if (errors) console.log(`  ❌ Errores:  ${errors}`);
  console.log(`──────────────────────────────────────────\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
