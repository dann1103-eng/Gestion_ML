import { crearEmpleado } from "@/server/actions/empleados";
import { EmpleadoForm } from "@/components/forms/EmpleadoForm";

export const dynamic = "force-dynamic";

export default function NuevoEmpleadoPage() {
  async function onSubmit(formData: FormData) {
    "use server";
    return crearEmpleado(formData);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Nuevo empleado</h1>
      </header>
      <EmpleadoForm onSubmit={onSubmit} />
    </div>
  );
}
