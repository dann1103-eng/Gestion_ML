import { notFound } from "next/navigation";
import { obtenerEmpleado, actualizarEmpleado } from "@/server/actions/empleados";
import { EmpleadoForm } from "@/components/forms/EmpleadoForm";

export const dynamic = "force-dynamic";

export default async function EditarEmpleadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const empleado = await obtenerEmpleado(id);
  if (!empleado) notFound();

  async function onSubmit(formData: FormData) {
    "use server";
    return actualizarEmpleado(id, formData);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Editar empleado</h1>
        <p className="text-muted-foreground">{empleado.nombre}</p>
      </header>
      <EmpleadoForm
        initial={{
          ...empleado,
          sueldoBase: String(empleado.sueldoBase),
        }}
        onSubmit={onSubmit}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
