import { crearPlanilla } from "@/server/actions/planillas";
import { PlanillaForm } from "@/components/forms/PlanillaForm";

export const dynamic = "force-dynamic";

export default function NuevaPlanillaPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Nueva planilla</h1>
        <p className="text-muted-foreground">
          Se generarán partidas de sueldo automáticamente para todos los empleados activos.
        </p>
      </header>
      <PlanillaForm onSubmit={crearPlanilla} />
    </div>
  );
}
