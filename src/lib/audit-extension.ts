import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Contexto de auditoría: el userId del usuario autenticado se inyecta
 * en cada Server Action vía withAuditContext() y se lee aquí.
 *
 * NOTA: La auditoría createdById/updatedById se hace de forma explícita en
 * cada Server Action que lo requiere, pasando los campos en el `data` del create/update.
 * Este store está disponible si en el futuro queremos automatizarlo con
 * un Prisma Client Extension; por ahora se mantiene simple.
 */
type AuditCtx = { userId: string | null };
const als = new AsyncLocalStorage<AuditCtx>();

export function withAuditContext<T>(userId: string | null, fn: () => Promise<T>) {
  return als.run({ userId }, fn);
}

export function getAuditUserId(): string | null {
  return als.getStore()?.userId ?? null;
}
