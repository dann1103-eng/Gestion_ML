/**
 * Diagnóstico de movimientos por concepto en un mes.
 *
 * Uso:
 *   pnpm tsx --env-file=.env scripts/import/diagnose-movimientos.ts \
 *     --concepto "Actividades Club" --anio 2026 --mes 2
 *
 * Lista todos los Movimientos del concepto+mes, separando los que vinieron
 * del importer (importHash != null) de los manuales (importHash == null),
 * y muestra la diferencia con el monto del Excel si se conoce.
 */
import { argv, exit } from "node:process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseArgs(args: string[]) {
  const out: { concepto?: string; anio?: number; mes?: number } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--concepto") out.concepto = args[++i];
    else if (a === "--anio") out.anio = Number(args[++i]);
    else if (a === "--mes") out.mes = Number(args[++i]);
  }
  return out;
}

async function main() {
  const args = parseArgs(argv.slice(2));
  if (!args.concepto || !args.anio || !args.mes) {
    console.error(
      "Uso: pnpm tsx scripts/import/diagnose-movimientos.ts --concepto NOMBRE --anio YYYY --mes MM",
    );
    exit(1);
  }
  const concepto = await prisma.concepto.findUnique({
    where: { nombre: args.concepto },
  });
  if (!concepto) {
    console.error(`Concepto "${args.concepto}" no existe`);
    exit(1);
  }

  const start = new Date(Date.UTC(args.anio, args.mes - 1, 1));
  const end = new Date(Date.UTC(args.anio, args.mes, 1));

  const movs = await prisma.movimiento.findMany({
    where: {
      conceptoId: concepto.id,
      fecha: { gte: start, lt: end },
      anulado: false,
    },
    orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
    include: { donante: true, cuenta: true },
  });

  let totalImporter = 0;
  let totalManual = 0;
  console.log(
    `\n📋 Movimientos de "${args.concepto}" en ${args.mes}/${args.anio} — ${movs.length} filas`,
  );
  console.log(`${"".padEnd(120, "─")}`);
  console.log(
    `${"Fecha".padEnd(11)} ${"Vale".padEnd(18)} ${"Monto".padStart(10)} ${"Origen".padEnd(8)} Descripción`,
  );
  console.log(`${"".padEnd(120, "─")}`);

  for (const m of movs) {
    const monto = Number(m.monto);
    const origen = m.importHash ? "import" : "MANUAL";
    if (m.importHash) totalImporter += monto;
    else totalManual += monto;
    const fechaStr = m.fecha.toISOString().slice(0, 10);
    console.log(
      `${fechaStr.padEnd(11)} ${m.valeNumero.padEnd(18)} \$${monto.toFixed(2).padStart(9)} ${origen.padEnd(8)} ${m.descripcion}`,
    );
  }
  console.log(`${"".padEnd(120, "─")}`);
  console.log(
    `Total importer: \$${totalImporter.toFixed(2)} | Total manual: \$${totalManual.toFixed(2)} | Total: \$${(totalImporter + totalManual).toFixed(2)}`,
  );
  if (totalManual > 0) {
    console.log(
      `\n⚠️  Hay \$${totalManual.toFixed(2)} de movimientos creados manualmente (no del importer).`,
    );
    console.log(
      `   Si no deberían estar aquí, podés anularlos desde /movimientos/{id}.`,
    );
  }
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    exit(1);
  })
  .finally(() => prisma.$disconnect());
