import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { dataAfcyd, nombreMes } from "@/lib/reportes/queries";
import { csvAfcyd } from "@/lib/reportes/csv";
import { AfcydPDF } from "@/lib/reportes/afcyd-pdf";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const sp = req.nextUrl.searchParams;

  const formato = sp.get("formato") === "csv" ? "csv" : "pdf";
  const anio = Number(sp.get("anio"));
  const mes = Number(sp.get("mes"));

  if (!anio || !mes || mes < 1 || mes > 12) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const data = await dataAfcyd({ anio, mes });
  const filename = `Informe_Donantes_AFCYD_${nombreMes(mes)}_${anio}`;

  if (formato === "csv") {
    return new NextResponse(csvAfcyd(data), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  const buffer = await renderToBuffer(
    <AfcydPDF data={data} generadoPor={user.email ?? "—"} fechaGeneracion={new Date()} />,
  );
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}.pdf"`,
    },
  });
}
