import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { obtenerPlanilla, aprobarPlanilla, revertirABorrador, marcarPagada, eliminarPlanilla } from "@/server/actions/planillas";
import { EmpleadoPartidas } from "@/components/planillas/EmpleadoPartidas";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatMoney } from "@/lib/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

const MESES = [
  "","ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
  "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE",
];

const MEDIO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia bancaria",
};

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: "bg-yellow-100 text-yellow-700",
  APROBADA: "bg-blue-100 text-blue-700",
  PAGADA:   "bg-green-100 text-green-700",
};

export default async function PlanillaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const planilla = await obtenerPlanilla(id);
  if (!planilla) notFound();

  const titulo = `${planilla.quincena === 1 ? "1ª" : "2ª"} Quincena — ${MESES[planilla.mes].charAt(0) + MESES[planilla.mes].slice(1).toLowerCase()} ${planilla.anio}`;
  const esBorrador = planilla.estado === "BORRADOR";
  const esAprobada = planilla.estado === "APROBADA";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{titulo}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_BADGE[planilla.estado]}`}>
              {planilla.estado}
            </span>
          </div>
          <p className="text-muted-foreground">
            Pago:{" "}
            {new Intl.DateTimeFormat("es-SV", { dateStyle: "long", timeZone: "UTC" }).format(planilla.fechaPago)}
            {" · "}
            {MEDIO_LABEL[planilla.medioPago] ?? planilla.medioPago}
          </p>
        </div>

        {/* Totales */}
        <div className="flex gap-6 text-sm">
          <div className="text-right">
            <p className="text-muted-foreground">Bruto</p>
            <p className="font-semibold tabular-nums">{formatMoney(planilla.totalBruto)}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Descuentos</p>
            <p className="font-semibold tabular-nums text-destructive">{formatMoney(planilla.totalDescuentos)}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Neto</p>
            <p className="text-xl font-bold tabular-nums">{formatMoney(planilla.totalNeto)}</p>
          </div>
        </div>
      </div>

      {/* State action buttons */}
      <div className="flex gap-3">
        {esBorrador ? (
          <>
            <form
              action={async () => {
                "use server";
                await aprobarPlanilla(id);
              }}
            >
              <SubmitButton pendingLabel="Aprobando...">Aprobar planilla</SubmitButton>
            </form>
            <form
              action={async () => {
                "use server";
                const res = await eliminarPlanilla(id);
                if (res.ok) redirect("/planillas");
              }}
            >
              <SubmitButton
                variant="destructive"
                pendingLabel="Eliminando..."
                confirm="¿Eliminar este borrador? Se borrarán todas las partidas. Esta acción no se puede deshacer."
              >
                Eliminar borrador
              </SubmitButton>
            </form>
          </>
        ) : null}

        {esAprobada ? (
          <>
            <form
              action={async () => {
                "use server";
                await marcarPagada(id);
              }}
            >
              <SubmitButton pendingLabel="Procesando...">Marcar como pagada</SubmitButton>
            </form>
            <form
              action={async () => {
                "use server";
                await revertirABorrador(id);
              }}
            >
              <SubmitButton variant="outline" pendingLabel="Revirtiendo...">
                Revertir a borrador
              </SubmitButton>
            </form>
          </>
        ) : null}

        <Button variant="outline" asChild>
          <Link href={`/api/planillas/${id}/pdf`} target="_blank">
            Descargar planilla PDF
          </Link>
        </Button>

        {planilla.estado === "PAGADA" ? (
          <div className="flex gap-2 flex-wrap">
            {planilla.recibos.map((r) => {
              const emp = planilla.empleados.find((e) => e.id === r.empleadoId);
              return (
                <Button key={r.id} variant="outline" asChild>
                  <Link href={`/api/recibos/${r.id}/pdf`} target="_blank">
                    Recibo — {emp?.nombre ?? r.correlativo}
                  </Link>
                </Button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Per-employee sections */}
      <div className="space-y-6">
        {planilla.empleados.map((emp) => (
          <EmpleadoPartidas
            key={emp.id}
            planillaId={id}
            empleado={emp}
            editable={esBorrador}
          />
        ))}
      </div>
    </div>
  );
}
