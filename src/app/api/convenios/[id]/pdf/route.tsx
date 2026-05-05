import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { dataConvenio } from "@/lib/convenios/queries";
import { ConvenioPDF } from "@/lib/convenios/convenio-pdf";
import { requireUser } from "@/lib/auth";
import { slug } from "@/lib/convenios/slug";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;

  const data = await dataConvenio(id);
  if (!data) {
    return NextResponse.json({ error: "Convenio no encontrado" }, { status: 404 });
  }

  const empresaNombre =
    data.convenio.donante.empresaDetalle?.razonSocial ??
    data.convenio.donante.nombre;
  const anio = data.convenio.fechaInicio.getUTCFullYear();
  const filename = `Convenio_${slug(empresaNombre)}_${anio}`;

  const buffer = await renderToBuffer(
    <ConvenioPDF
      data={data}
      generadoPor={user.email ?? "—"}
      fechaGeneracion={new Date()}
    />,
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}.pdf"`,
    },
  });
}
