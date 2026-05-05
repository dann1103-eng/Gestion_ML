import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { dataFeMensual, nombreMes } from "@/lib/reportes/queries";
import { csvFeMensual } from "@/lib/reportes/csv";
import { FeMensualPDF } from "@/lib/reportes/fe-mensual-pdf";
import { renderToBuffer } from "@react-pdf/renderer";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const sp = req.nextUrl.searchParams;
  const formato = sp.get("formato") === "csv" ? "csv" : "pdf";
  const anio = Number(sp.get("anio"));
  const mes  = Number(sp.get("mes"));

  if (!anio || !mes || mes < 1 || mes > 12) {
    return new NextResponse("Parámetros inválidos", { status: 400 });
  }

  const data = await dataFeMensual({ anio, mes });
  const filename = `FE_${nombreMes(mes)}_${anio}`;

  if (formato === "csv") {
    return new NextResponse(csvFeMensual(data), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  const buffer = await renderToBuffer(
    <FeMensualPDF data={data} generadoPor={user.email ?? "—"} fechaGeneracion={new Date()} />
  );
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}.pdf"`,
    },
  });
}
