import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.movimiento.count();
  const ingresos = await prisma.movimiento.aggregate({
    where: { tipo: "INGRESO", anulado: false },
    _sum: { monto: true },
    _count: true,
  });
  const egresos = await prisma.movimiento.aggregate({
    where: { tipo: "EGRESO", anulado: false },
    _sum: { monto: true },
    _count: true,
  });
  const porMes = await prisma.$queryRaw<Array<{ mes: number; count: bigint; ingresos: number; egresos: number }>>`
    SELECT
      EXTRACT(MONTH FROM fecha)::int AS mes,
      COUNT(*) AS count,
      COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE 0 END), 0)::float AS ingresos,
      COALESCE(SUM(CASE WHEN tipo = 'EGRESO'  THEN monto ELSE 0 END), 0)::float AS egresos
    FROM movimientos
    WHERE anulado = false
    GROUP BY EXTRACT(MONTH FROM fecha)
    ORDER BY mes
  `;
  const afcyd = await prisma.movimientoAfcyd.count();

  console.log(`📊 Total movimientos: ${total}`);
  console.log(`   Ingresos: ${ingresos._count} mov, $${(Number(ingresos._sum.monto) || 0).toFixed(2)}`);
  console.log(`   Egresos:  ${egresos._count} mov, $${(Number(egresos._sum.monto) || 0).toFixed(2)}`);
  console.log(`   Filas AFCYD generadas: ${afcyd}`);

  const meses = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  console.log(`\n📅 Por mes:`);
  for (const r of porMes) {
    console.log(`   ${meses[r.mes]}: ${r.count} mov · +$${r.ingresos.toFixed(2)} · -$${r.egresos.toFixed(2)} · neto $${(r.ingresos - r.egresos).toFixed(2)}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
