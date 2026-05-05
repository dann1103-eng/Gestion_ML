import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getResumen, NOMBRES_MESES } from "@/lib/resumen/queries";
import { serializeResumen } from "@/lib/resumen/serialize";
import { generarXlsx } from "@/lib/resumen/xlsx";

export async function GET(req: NextRequest) {
  await requireUser();
  const sp = req.nextUrl.searchParams;
  const anio = Number(sp.get("anio"));
  const mes = Number(sp.get("mes"));

  if (!anio || anio < 2000 || anio > 2100 || !mes || mes < 1 || mes > 12) {
    return new NextResponse("Parámetros inválidos", { status: 400 });
  }

  const data = await getResumen({ anio, mesActivo: mes });
  const ser = serializeResumen(data);
  const buffer = await generarXlsx(ser);
  const filename = `Resumen-Gestion-ML-${anio}-${NOMBRES_MESES[mes - 1]}.xlsx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
