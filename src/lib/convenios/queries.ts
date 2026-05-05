import { prisma } from "@/lib/prisma";

export async function dataConvenio(id: string) {
  const conv = await prisma.convenio.findUnique({
    where: { id },
    include: {
      plan: true,
      donante: { include: { empresaDetalle: true } },
    },
  });
  if (!conv) return null;

  const conferencias = await prisma.conferenciaCatalogo.findMany({
    where: { activo: true },
    orderBy: [{ categoria: "asc" }, { titulo: "asc" }],
  });

  // Agrupar por categoría
  const porCategoria = new Map<string, typeof conferencias>();
  for (const c of conferencias) {
    const arr = porCategoria.get(c.categoria) ?? [];
    arr.push(c);
    porCategoria.set(c.categoria, arr);
  }

  return {
    convenio: conv,
    conferenciasPorCategoria: Array.from(porCategoria.entries()).map(
      ([categoria, items]) => ({ categoria, items }),
    ),
  };
}

export type DataConvenio = NonNullable<Awaited<ReturnType<typeof dataConvenio>>>;
