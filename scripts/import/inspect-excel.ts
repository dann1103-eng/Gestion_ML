import ExcelJS from "exceljs";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Uso: pnpm tsx scripts/import/inspect-excel.ts <ruta.xlsx>");
    process.exit(1);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);

  console.log("=== HOJAS ===");
  for (const sheet of wb.worksheets) {
    console.log(`  • "${sheet.name}" — ${sheet.rowCount} filas × ${sheet.columnCount} cols`);
  }
  console.log("\n=== PRIMERAS FILAS DE CADA HOJA ===");
  for (const sheet of wb.worksheets) {
    console.log(`\n--- ${sheet.name} ---`);
    for (let r = 1; r <= Math.min(5, sheet.rowCount); r++) {
      const vals = sheet.getRow(r).values;
      const arr = Array.isArray(vals) ? vals.slice(1) : vals;
      const str = JSON.stringify(arr).slice(0, 300);
      console.log(`  R${r}:`, str);
    }
  }
}
main().catch(console.error);
