import { DonanteForm } from "@/components/forms/DonanteForm";
import { crearDonante } from "@/server/actions/donantes";

export default function NuevoDonantePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Nuevo donante</h1>
      <DonanteForm onSubmit={crearDonante} redirectTo="/donantes" submitLabel="Crear donante" />
    </div>
  );
}
