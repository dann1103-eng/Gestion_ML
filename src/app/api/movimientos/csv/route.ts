import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type TipoMovimiento, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  await requireUser();
  const sp = req.nextUrl.searchParams;
  const anio       = sp.get("anio")       ? Number(sp.get("anio"))  : undefined;
  const mes        = sp.get("mes")        ? Number(sp.get("mes"))   : undefined;
  const tipo       = (sp.get("tipo") as TipoMovimiento | null) ?? undefined;
  const cuentaId   = sp.get("cuentaId")   ?? undefined;
  const conceptoId = sp.get("conceptoId") ?? undefined;
  const q          = sp.get("q")          ?? undefined;

  const where: Prisma.MovimientoWhereInput = { anulado: false };
  if (anio && mes) {
    where.fecha = { gte: new Date(Date.UTC(anio, mes - 1, 1)), lt: new Date(Date.UTC(anio, mes, 1)) };
  } else if (anio) {
    where.fecha = { gte: new Date(Date.UTC(anio, 0, 1)), lt: new Date(Date.UTC(anio + 1, 0, 1)) };
  }
  if (tipo) where.tipo = tipo;
  if (cuentaId) where.cuentaId = cuentaId;
  if (conceptoId) where.conceptoId = conceptoId;
  if (q) where.OR = [
    { descripcion: { contains: q, mode: "insensitive" } },
    { valeNumero:  { contains: q, mode: "insensitive" } },
  ];

  const movs = await prisma.movimiento.findMany({
    where,
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    include: { concepto: true, cuenta: true, donante: true },
  });

  const fmt = new Intl.DateTimeFormat("es-SV", { timeZone: "UTC", dateStyle: "short" });
  const escape = (s: string) => s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;

  const lines = [
    "﻿Vale,Fecha,Tipo,Concepto,Cuenta,Donante,Descripción,Monto",
    ...movs.map((m: typeof movs[number]) => [
      m.valeNumero,
      fmt.format(m.fecha),
      m.tipo,
      escape(m.concepto.nombre),
      escape(m.cuenta.nombre),
      m.donante ? escape(m.donante.nombre) : "",
      escape(m.descripcion ?? ""),
      Number(m.monto).toFixed(2),
    ].join(",")),
  ];

  const mesPart = mes ? String(mes).padStart(2, "0") : "todos";
  const filename = `Movimientos_${anio ?? "todos"}_${mesPart}.csv`;

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
