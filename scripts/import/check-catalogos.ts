import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cuentas = await prisma.cuenta.findMany({ orderBy: { nombre: "asc" } });
  console.log("=== CUENTAS ===");
  for (const c of cuentas) {
    console.log(`  • "${c.nombre}" (${c.tipo}) ${c.activo ? "✓" : "✗"}`);
  }

  const conceptos = await prisma.concepto.findMany({ orderBy: { nombre: "asc" } });
  console.log(`\n=== CONCEPTOS (${conceptos.length}) ===`);
  for (const c of conceptos) {
    console.log(`  • "${c.nombre}" (${c.tipo}) ${c.generaAfcyd ? "AFCYD" : ""}`);
  }

  const movs = await prisma.movimiento.count();
  console.log(`\n=== MOVIMIENTOS EN DB: ${movs} ===`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
