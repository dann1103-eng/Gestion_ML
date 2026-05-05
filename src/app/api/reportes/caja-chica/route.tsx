import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { dataCajaChica, nombreMes } from "@/lib/reportes/queries";
import { csvCajaChica } from "@/lib/reportes/csv";
import { CajaChicaPDF } from "@/lib/reportes/caja-chica-pdf";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const sp = req.nextUrl.searchParams;

  const formato = sp.get("formato") === "csv" ? "csv" : "pdf";
  const anio = Number(sp.get("anio"));
  const mes = Number(sp.get("mes"));
  const cuentaId = sp.get("cuentaId") || undefined;

  if (!anio || !mes || mes < 1 || mes > 12) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const data = await dataCajaChica({ anio, mes, cuentaId });
  const filename = `Caja_Chica_${nombreMes(mes)}_${anio}`;

  if (formato === "csv") {
    return new NextResponse(csvCajaChica(data), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  const buffer = await renderToBuffer(
    <CajaChicaPDF data={data} generadoPor={user.email ?? "—"} fechaGeneracion={new Date()} />,
  );
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}.pdf"`,
    },
  });
}
