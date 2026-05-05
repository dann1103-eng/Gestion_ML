import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PlanillaPDF } from "@/lib/planillas/planilla-pdf";
import { TipoPartida } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;

  const planilla = await prisma.planilla.findUnique({
    where: { id },
    include: {
      partidas: {
        include: { empleado: { select: { id: true, nombre: true, dui: true, cargo: true } } },
        orderBy: [{ empleadoId: "asc" }, { tipo: "asc" }],
      },
    },
  });

  if (!planilla) return new NextResponse("Not found", { status: 404 });

  // Group partidas by employee
  const empleadoMap = new Map<string, {
    nombre: string;
    dui: string | null;
    cargo: string | null;
    partidas: { tipo: TipoPartida; monto: number }[];
  }>();

  for (const p of planilla.partidas) {
    if (!empleadoMap.has(p.empleadoId)) {
      empleadoMap.set(p.empleadoId, {
        nombre: p.empleado.nombre,
        dui: p.empleado.dui,
        cargo: p.empleado.cargo,
        partidas: [],
      });
    }
    empleadoMap.get(p.empleadoId)!.partidas.push({
      tipo: p.tipo,
      monto: Number(p.monto),
    });
  }

  const data = {
    anio: planilla.anio,
    mes: planilla.mes,
    quincena: planilla.quincena,
    fechaPago: planilla.fechaPago,
    medioPago: planilla.medioPago,
    empleados: Array.from(empleadoMap.values()),
    generadoPor: user.email ?? "Sistema",
  };

  const buffer = await renderToBuffer(<PlanillaPDF data={data} />);

  const q = planilla.quincena === 1 ? "1Q" : "2Q";
  const filename = `Planilla_${planilla.anio}_${String(planilla.mes).padStart(2, "0")}_${q}.pdf`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
