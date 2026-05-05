import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ReciboPDF } from "@/lib/planillas/recibo-pdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;

  const recibo = await prisma.reciboPago.findUnique({
    where: { id },
    include: {
      empleado: { select: { nombre: true } },
      planilla: { select: { mes: true, anio: true, quincena: true } },
    },
  });

  if (!recibo) return new NextResponse("Not found", { status: 404 });

  const data = {
    montoNeto: recibo.montoNeto,
    medioPago: recibo.medioPago,
    fechaFirma: recibo.fechaFirma ?? recibo.createdAt,
    empleadoNombre: recibo.empleado.nombre,
    mes: recibo.planilla.mes,
    anio: recibo.planilla.anio,
    quincena: recibo.planilla.quincena,
  };

  const buffer = await renderToBuffer(<ReciboPDF data={data} />);

  const filename = `Recibo_${recibo.empleado.nombre.replace(/\s+/g, "_")}_${recibo.correlativo ?? id}.pdf`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
