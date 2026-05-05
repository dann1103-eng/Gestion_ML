import { listarCuentas } from "@/server/actions/cuentas";
import { listarConceptos, listarClasificaciones } from "@/server/actions/catalogos";
import { crearMovimiento } from "@/server/actions/movimientos";
import { MovimientoForm } from "@/components/forms/MovimientoForm";

export default async function NuevoMovimientoPage() {
  const [conceptos, cuentas, clasificaciones] = await Promise.all([
    listarConceptos({ soloActivos: true }),
    listarCuentas(),
    listarClasificaciones({ soloActivas: true }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Nuevo movimiento</h1>
      <MovimientoForm
        conceptos={conceptos}
        cuentas={cuentas.filter((c) => c.activo)}
        clasificaciones={clasificaciones}
        onSubmit={crearMovimiento}
        redirectTo="/movimientos"
        submitLabel="Registrar movimiento"
      />
    </div>
  );
}
