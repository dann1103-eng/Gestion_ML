"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { renovarConvenio } from "@/server/actions/convenios";

export function RenovarButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (
      !confirm(
        "Crear una renovación de este convenio? Las fechas se ajustarán al periodo siguiente y la empresa quedará apuntando al nuevo convenio.",
      )
    )
      return;
    start(async () => {
      const res = await renovarConvenio(id);
      if (res.ok && res.nuevoId) {
        router.push(`/convenios/${res.nuevoId}`);
        router.refresh();
      } else {
        alert(res.error ?? "No se pudo renovar");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? "Renovando..." : "Renovar"}
    </Button>
  );
}
