"use client";

import { useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CerrarMesDialog } from "./CerrarMesDialog";
import type { ResumenMes } from "@/server/actions/cierre";

type Props = { resumen: ResumenMes };

export function CierreMesActions({ resumen }: Props) {
  const [openDialog, setOpenDialog] = useState<"cerrar" | "reabrir" | null>(null);
  const cerrado = resumen.estado === "CERRADO";

  return (
    <>
      {cerrado ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpenDialog("reabrir")}
          className="gap-1.5 text-xs"
        >
          <Unlock size={12} />
          Reabrir
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => setOpenDialog("cerrar")}
          className="gap-1.5 text-xs bg-primary text-primary-foreground hover:brightness-110"
        >
          <Lock size={12} />
          Cerrar mes
        </Button>
      )}

      {openDialog ? (
        <CerrarMesDialog
          resumen={resumen}
          modo={openDialog}
          onClose={() => setOpenDialog(null)}
        />
      ) : null}
    </>
  );
}
