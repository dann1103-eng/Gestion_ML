import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { dataAnual } from "@/lib/reportes/queries";
import { csvAnual } from "@/lib/reportes/csv";
import { AnualPDF } from "@/lib/reportes/anual-pdf";
import { renderToBuffer } from "@react-pdf/renderer";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const sp = req.nextUrl.searchParams;
  const formato = sp.get("formato") === "csv" ? "csv" : "pdf";
  const anio = Number(sp.get("anio"));

  if (!anio || anio < 2000 || anio > 2100) {
    return new NextResponse("Parámetros inválidos", { status: 400 });
  }

  const data = await dataAnual({ anio });
  const filename = `Resumen_${anio}`;

  if (formato === "csv") {
    return new NextResponse(csvAnual(data), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  const buffer = await renderToBuffer(
    <AnualPDF data={data} generadoPor={user.email ?? "—"} fechaGeneracion={new Date()} />
  );
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}.pdf"`,
    },
  });
}
