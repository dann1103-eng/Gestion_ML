import Link from "next/link";
import { listarEmpleados } from "@/server/actions/empleados";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("es-SV", { dateStyle: "medium", timeZone: "UTC" }).format(d);

export default async function EmpleadosPage() {
  const empleados = await listarEmpleados();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Empleados</h1>
          <p className="text-muted-foreground">{empleados.length} empleado(s) registrado(s)</p>
        </div>
        <Button asChild>
          <Link href="/empleados/nuevo">Nuevo empleado</Link>
        </Button>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Nombre</th>
              <th className="px-4 py-3 text-left font-medium">Cargo</th>
              <th className="px-4 py-3 text-right font-medium">Sueldo base</th>
              <th className="px-4 py-3 text-left font-medium">Ingreso</th>
              <th className="px-4 py-3 text-center font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {empleados.map((emp) => (
              <tr key={emp.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{emp.nombre}</td>
                <td className="px-4 py-3 text-muted-foreground">{emp.cargo ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(emp.sueldoBase)}</td>
                <td className="px-4 py-3">{fmtDate(emp.fechaIngreso)}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      emp.activo
                        ? "bg-green-100 text-green-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {emp.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/empleados/${emp.id}`} className="text-primary text-xs hover:underline">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {empleados.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No hay empleados registrados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
