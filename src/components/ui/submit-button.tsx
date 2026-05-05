"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "./button";

export interface SubmitButtonProps extends Omit<ButtonProps, "type"> {
  /** Texto a mostrar mientras se envía (default: "Guardando..."). */
  pendingLabel?: string;
  /** Si true, muestra solo el spinner sin texto. Útil para botones icon. */
  iconOnly?: boolean;
  /** Pide confirmación nativa del navegador antes de submitear. */
  confirm?: string;
}

/**
 * Botón de submit que se deshabilita automáticamente mientras el formulario
 * está pendiente. Resuelve el problema de doble-click que duplica registros.
 *
 * Úsalo dentro de cualquier <form action={...}>. Lee el estado del formulario
 * vía `useFormStatus()` de react-dom.
 */
export const SubmitButton = React.forwardRef<HTMLButtonElement, SubmitButtonProps>(
  function SubmitButton(
    { children, pendingLabel = "Guardando...", iconOnly = false, confirm, disabled, ...props },
    ref,
  ) {
    const { pending } = useFormStatus();

    const handleClick = confirm
      ? (e: React.MouseEvent<HTMLButtonElement>) => {
          if (!window.confirm(confirm)) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      : undefined;

    return (
      <Button
        ref={ref}
        type="submit"
        disabled={disabled || pending}
        onClick={handleClick}
        {...props}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {iconOnly ? null : pendingLabel}
          </>
        ) : (
          children
        )}
      </Button>
    );
  },
);
