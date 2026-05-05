"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withAuditContext } from "@/lib/audit-extension";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Wrapper para Server Actions: parsea con Zod, requiere usuario autenticado,
 * y ejecuta dentro del AsyncLocalStorage de auditoría.
 */
export async function runAction<TInput, TOutput>(
  schema: z.ZodType<TInput>,
  raw: unknown,
  fn: (input: TInput, userId: string) => Promise<TOutput>,
): Promise<ActionResult<TOutput>> {
  const user = await requireUser();

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_root";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors,
    };
  }

  try {
    const result = await withAuditContext(user.id, () => fn(parsed.data, user.id));
    return { ok: true, data: result };
  } catch (e) {
    console.error("[Action error]", e);
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error: msg };
  }
}
