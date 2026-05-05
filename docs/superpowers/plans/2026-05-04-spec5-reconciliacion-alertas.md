# Spec #5 — Reconciliación Bancaria + Alertas FE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/conciliacion` page where the user marks movements as reconciled against the bank balance, and expand the dashboard AlertasWidget to detect overdue FE monthly payments.

**Architecture:** One new boolean field on `Movimiento` (`conciliado`), two Server Action mutations, one plain async query, one Client Component for the interactive table, one Server Component page, and an extension of the existing `getDashboardData` / `AlertasWidget` for FE-overdue detection.

**Tech Stack:** Next.js 15 App Router, Prisma ORM, TypeScript, Tailwind CSS, shadcn/ui, `useTransition` for optimistic updates, `calcularCobranza` from `src/lib/convenios/cobranza.ts` for FE payment checking.

**Spec:** `docs/superpowers/specs/2026-05-04-spec5-reconciliacion-alertas-design.md`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `conciliado Boolean @default(false)` to `Movimiento` |
| `src/lib/conciliacion/queries.ts` | Create | Plain async query — `obtenerMovimientosConciliacion(cuentaId, anio, mes)` |
| `src/server/actions/conciliacion.ts` | Create | Mutations: `toggleConciliado`, `marcarLoteConciliados` |
| `src/components/conciliacion/ConciliacionTable.tsx` | Create | Client Component — checkboxes, bank balance input, stats cards |
| `src/app/(app)/conciliacion/page.tsx` | Create | Server Component — loads cuentas + movements, renders table |
| `src/server/actions/dashboard.ts` | Modify | Add `"fe-atrasada"` to `Alerta` type + FE overdue query in `Promise.all` |
| `src/components/dashboard/AlertasWidget.tsx` | Modify | Add `"fe-atrasada"` to `ICONO` map with red styling |
| `src/components/ui/nav-links.tsx` | Modify | Add "Conciliación" nav item with `GitMerge` icon |

---

## Task 1: Schema — add `conciliado` to `Movimiento`

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the field**

Open `prisma/schema.prisma`. Find the `Movimiento` model. Add `conciliado` after the `anulado` field:

```prisma
model Movimiento {
  // ...existing fields...
  anulado           Boolean   @default(false)
  motivoAnulacion   String?
  conciliado        Boolean   @default(false)   // ← ADD THIS LINE
  // ...rest of model...
}
```

- [ ] **Step 2: Push schema to database**

```bash
npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema. 🚀`  
(Do NOT use `prisma migrate dev` — this project uses Supabase which lacks a shadow DB.)

- [ ] **Step 3: Regenerate Prisma client**

Kill any running dev server first (kills all Node processes on Windows):
```powershell
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
```
Then:
```bash
npx prisma generate
```
Expected: `Generated Prisma Client`

- [ ] **Step 4: Restart dev server**

```bash
npm run dev
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add conciliado flag to Movimiento"
```

---

## Task 2: Data layer — `obtenerMovimientosConciliacion`

**Files:**
- Create: `src/lib/conciliacion/queries.ts`

This is a **plain async function** (no `"use server"` directive) called only from the Server Component page. It returns typed data safe to pass across the RSC→Client boundary (all Decimals converted to `number`).

- [ ] **Step 1: Create the file**

```typescript
// src/lib/conciliacion/queries.ts
import { prisma } from "@/lib/prisma";
import { TipoMovimiento } from "@prisma/client";

export type ConciliacionRow = {
  id: string;
  fecha: Date;
  tipo: TipoMovimiento;
  valeNumero: string | null;
  concepto: string;
  descripcion: string;
  monto: number;
  conciliado: boolean;
  anulado: boolean;
};

export async function obtenerMovimientosConciliacion(
  cuentaId: string,
  anio: number,
  mes: number,
): Promise<ConciliacionRow[]> {
  const inicio = new Date(Date.UTC(anio, mes - 1, 1));
  const fin = new Date(Date.UTC(anio, mes, 1));

  const rows = await prisma.movimiento.findMany({
    where: {
      cuentaId,
      fecha: { gte: inicio, lt: fin },
    },
    include: { concepto: { select: { nombre: true } } },
    orderBy: { fecha: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    fecha: r.fecha,
    tipo: r.tipo,
    valeNumero: r.valeNumero,
    concepto: r.concepto.nombre,
    descripcion: r.descripcion,
    monto: Number(r.monto),
    conciliado: r.conciliado,
    anulado: r.anulado,
  }));
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/conciliacion/queries.ts
git commit -m "feat: add obtenerMovimientosConciliacion query"
```

---

## Task 3: Server Action mutations

**Files:**
- Create: `src/server/actions/conciliacion.ts`

These two mutations do NOT use `runAction` because their input is just IDs (no Zod schema needed). They follow the same `requireUser` + `revalidatePath` pattern as `actualizarPartida` in `planillas.ts`.

- [ ] **Step 1: Create the file**

```typescript
// src/server/actions/conciliacion.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function toggleConciliado(
  id: string,
  conciliado: boolean,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  try {
    await prisma.movimiento.update({
      where: { id },
      data: { conciliado },
    });
    revalidatePath("/conciliacion");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function marcarLoteConciliados(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  if (ids.length === 0) return { ok: true };
  try {
    await prisma.movimiento.updateMany({
      where: { id: { in: ids } },
      data: { conciliado: true },
    });
    revalidatePath("/conciliacion");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/conciliacion.ts
git commit -m "feat: add toggleConciliado and marcarLoteConciliados server actions"
```

---

## Task 4: `ConciliacionTable` client component

**Files:**
- Create: `src/components/conciliacion/ConciliacionTable.tsx`

This is the interactive Client Component. It receives movements as props (already fetched server-side) and manages:
- `saldoBanco` — local string state for the bank balance input (not persisted to DB)
- Optimistic `conciliado` toggle via `useTransition`
- "Marcar visibles" bulk action

- [ ] **Step 1: Create the component**

```typescript
// src/components/conciliacion/ConciliacionTable.tsx
"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TipoMovimiento } from "@prisma/client";
import type { ConciliacionRow } from "@/lib/conciliacion/queries";
import { toggleConciliado, marcarLoteConciliados } from "@/server/actions/conciliacion";
import { formatMoney } from "@/lib/money";

type Props = { movimientos: ConciliacionRow[] };

export function ConciliacionTable({ movimientos: inicial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [saldoBanco, setSaldoBanco] = useState("");

  const rows = inicial.map((r) => ({
    ...r,
    conciliado: optimistic[r.id] ?? r.conciliado,
  }));

  const noAnulados = rows.filter((r) => !r.anulado);
  const conciliados = noAnulados.filter((r) => r.conciliado);
  const saldoSistema = noAnulados.reduce(
    (s, r) => s + (r.tipo === TipoMovimiento.INGRESO ? r.monto : -r.monto),
    0,
  );
  const saldoBancoNum = parseFloat(saldoBanco.replace(",", ".")) || 0;
  const diferencia = saldoBancoNum - saldoSistema;
  const cuadra = saldoBanco !== "" && Math.abs(diferencia) < 0.01;

  function handleToggle(id: string, current: boolean) {
    setOptimistic((prev) => ({ ...prev, [id]: !current }));
    startTransition(async () => {
      const res = await toggleConciliado(id, !current);
      if (!res.ok) {
        setOptimistic((prev) => ({ ...prev, [id]: current })); // revert
      } else {
        router.refresh();
      }
    });
  }

  function handleMarcarTodos() {
    const ids = noAnulados.filter((r) => !r.conciliado).map((r) => r.id);
    if (ids.length === 0) return;
    ids.forEach((id) => setOptimistic((prev) => ({ ...prev, [id]: true })));
    startTransition(async () => {
      await marcarLoteConciliados(ids);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Saldo sistema" value={formatMoney(saldoSistema)} sub="según movimientos" />
        <div className="rounded-lg border border-[hsl(var(--ring))] bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Saldo banco
          </p>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={saldoBanco}
            onChange={(e) => setSaldoBanco(e.target.value)}
            className="w-full text-base font-bold tabular-nums border border-input rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
          />
          <p className="text-[10px] text-muted-foreground mt-1">ingresa el saldo real</p>
        </div>
        <div
          className={`rounded-lg border p-4 ${
            saldoBanco === ""
              ? "bg-card border-border"
              : cuadra
              ? "bg-green-50 border-green-300"
              : "bg-red-50 border-red-300"
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Diferencia
          </p>
          {saldoBanco === "" ? (
            <p className="text-base font-bold text-muted-foreground">—</p>
          ) : cuadra ? (
            <p className="text-base font-bold text-green-700">✅ Todo cuadra</p>
          ) : (
            <>
              <p className="text-base font-bold text-red-700 tabular-nums">
                {diferencia >= 0 ? "+" : ""}
                {formatMoney(diferencia)}
              </p>
              <p className="text-[10px] text-red-600">revisa pendientes</p>
            </>
          )}
        </div>
        <StatCard
          label="Conciliados"
          value={`${conciliados.length} / ${noAnulados.length}`}
          sub={`${noAnulados.length - conciliados.length} pendientes`}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
            <tr>
              <th className="w-10 px-3 py-3" />
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide font-semibold">Fecha</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide font-semibold">Vale</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide font-semibold">Concepto</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide font-semibold">Descripción</th>
              <th className="px-3 py-3 text-right text-[11px] uppercase tracking-wide font-semibold">Monto</th>
              <th className="px-3 py-3 text-center text-[11px] uppercase tracking-wide font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No hay movimientos para esta cuenta en el período seleccionado.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-t border-border ${i % 2 === 1 ? "bg-muted/30" : ""} ${
                    r.anulado ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={r.conciliado}
                      disabled={r.anulado || isPending}
                      onChange={() => handleToggle(r.id, r.conciliado)}
                      className="accent-green-600 w-4 h-4"
                    />
                  </td>
                  <td className="px-3 py-3 tabular-nums text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("es-SV", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(r.fecha)}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground font-mono">{r.valeNumero ?? "—"}</td>
                  <td className="px-3 py-3 font-medium">{r.concepto}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground truncate max-w-[180px]">
                    {r.descripcion ?? "—"}
                  </td>
                  <td className={`px-3 py-3 text-right font-semibold tabular-nums ${
                    r.tipo === TipoMovimiento.INGRESO ? "text-green-700" : "text-destructive"
                  }`}>
                    {r.tipo === TipoMovimiento.INGRESO ? "+" : "−"}{formatMoney(r.monto)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {r.anulado ? (
                      <span className="text-xs text-muted-foreground">Anulado</span>
                    ) : r.conciliado ? (
                      <span className="inline-block rounded-full bg-green-100 text-green-700 text-[10px] px-2 py-0.5">
                        ✓ Conciliado
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5">
                        ⏳ Pendiente
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk action */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>{rows.length} movimientos · {rows.filter((r) => !r.anulado && !r.conciliado).length} pendientes</span>
        <button
          onClick={handleMarcarTodos}
          disabled={isPending || rows.filter((r) => !r.anulado && !r.conciliado).length === 0}
          className="rounded-md bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-40 transition"
        >
          Marcar visibles como conciliados
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/conciliacion/ConciliacionTable.tsx
git commit -m "feat: add ConciliacionTable client component"
```

---

## Task 5: `/conciliacion` page + nav update

**Files:**
- Create: `src/app/(app)/conciliacion/page.tsx`
- Modify: `src/components/ui/nav-links.tsx`

The page is a Server Component. Filters (cuentaId, anio, mes) come from `searchParams`. When no `cuentaId` is provided, the first active account is selected by default.

- [ ] **Step 1: Create the page**

```typescript
// src/app/(app)/conciliacion/page.tsx
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { obtenerMovimientosConciliacion } from "@/lib/conciliacion/queries";
import { ConciliacionTable } from "@/components/conciliacion/ConciliacionTable";

export const dynamic = "force-dynamic";

export default async function ConciliacionPage({
  searchParams,
}: {
  searchParams: Promise<{ cuentaId?: string; anio?: string; mes?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;

  const now = new Date();
  const anio = sp.anio ? parseInt(sp.anio) : now.getUTCFullYear();
  const mes = sp.mes ? parseInt(sp.mes) : now.getUTCMonth() + 1;

  const cuentas = await prisma.cuenta.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });

  const cuentaId = sp.cuentaId ?? cuentas[0]?.id ?? "";
  const cuentaActual = cuentas.find((c) => c.id === cuentaId);

  const movimientos = cuentaId
    ? await obtenerMovimientosConciliacion(cuentaId, anio, mes)
    : [];

  const anioActual = now.getUTCFullYear();
  const anios = Array.from({ length: 4 }, (_, i) => anioActual - 1 + i);

  const MESES = [
    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Conciliación bancaria</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Marca los movimientos que confirmaste en el estado de cuenta del banco
        </p>
      </div>

      {/* Filters (GET form — no JS needed) */}
      <form method="GET" className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Cuenta</label>
          <select
            name="cuentaId"
            defaultValue={cuentaId}
            className="border border-input rounded-md px-3 py-2 text-sm bg-background"
          >
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Mes</label>
          <select
            name="mes"
            defaultValue={String(mes)}
            className="border border-input rounded-md px-3 py-2 text-sm bg-background"
          >
            {MESES.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Año</label>
          <select
            name="anio"
            defaultValue={String(anio)}
            className="border border-input rounded-md px-3 py-2 text-sm bg-background"
          >
            {anios.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition"
        >
          Filtrar
        </button>
      </form>

      {/* Subtitle with current selection */}
      {cuentaActual && (
        <p className="text-sm text-muted-foreground">
          {cuentaActual.nombre} · {MESES[mes]} {anio}
        </p>
      )}

      {/* Table */}
      <ConciliacionTable movimientos={movimientos} />
    </div>
  );
}
```

- [ ] **Step 2: Add nav item**

Open `src/components/ui/nav-links.tsx`. Add `GitMerge` to the import and a new entry to `NAV_MAIN` (not `NAV_FE`). Place it after the `{ href: "/cierre", ... }` entry, before `{ href: "/catalogos/conceptos", ... }`:

```typescript
// Add to import:
import {
  // ...existing icons...
  GitMerge,
} from "lucide-react";

// Add to NAV_MAIN array, after CalendarCheck (Cierre de mes):
{ href: "/conciliacion", label: "Conciliación", icon: GitMerge },
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke test the page**

With the dev server running, navigate to `/conciliacion`. Verify:
- Page loads without error
- Account selector shows active accounts
- Changing account + clicking "Filtrar" updates the URL and table
- "Conciliación" appears in the sidebar nav

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/conciliacion/page.tsx src/components/ui/nav-links.tsx
git commit -m "feat: add /conciliacion page and nav item"
```

---

## Task 6: FE overdue alerts in dashboard

**Files:**
- Modify: `src/server/actions/dashboard.ts`
- Modify: `src/components/dashboard/AlertasWidget.tsx`

### 6a — Extend `Alerta` type and add FE overdue query

- [ ] **Step 1: Update `dashboard.ts`**

The changes are:
1. Add `TipoMovimiento` to the Prisma import (already imported)
2. Add `calcularCobranza` import
3. Add FE overdue query to `Promise.all`
4. Add FE alert generation to the alertas section
5. Extend `Alerta` type

Open `src/server/actions/dashboard.ts` and apply these changes:

**Add import** at the top (after existing imports):
```typescript
import { calcularCobranza } from "@/lib/convenios/cobranza";
```

**Add to `Promise.all`** (as the 8th element, after `sesionesManana`):
```typescript
// Active convenios with their plan price and donante's ingreso movements
prisma.convenio.findMany({
  where: { fechaFin: { gte: now } },
  include: {
    plan: { select: { precio: true } },
    donante: {
      select: {
        nombre: true,
        movimientos: {
          where: { anulado: false, tipo: TipoMovimiento.INGRESO },
          select: { fecha: true, monto: true, tipo: true, anulado: true },
        },
      },
    },
  },
}),
```

**Destructure the 8th element** in the `const [...]` destructure:
```typescript
const [
  cuentas,
  saldosPorMov,
  totalesMes,
  totalesMesAnterior,
  movimientosRecientes,
  convenios,
  sesionesManana,
  conveniosParaCobranza,   // ← ADD
] = await Promise.all([...]);
```

**Add FE overdue alert generation** in the `// ── Alertas` section, after the `sesionesManana` loop:
```typescript
for (const conv of conveniosParaCobranza) {
  const { cuotas } = calcularCobranza({
    fechaInicio: conv.fechaInicio,
    fechaFin: conv.fechaFin,
    precioMensual: Number(conv.plan.precio),
    movimientosIngreso: conv.donante.movimientos,
  });

  const atrasadas = cuotas.filter(
    (c) =>
      (c.estado === "VENCIDO" || c.estado === "PARCIAL") &&
      (c.anio < anio || (c.anio === anio && c.mes < mes)),
  );

  if (atrasadas.length > 0) {
    const pendiente = atrasadas.reduce(
      (s, c) => s + Math.max(0, c.esperado - c.recibido),
      0,
    );
    alertas.push({
      tipo: "fe-atrasada",
      mensaje: `FE atrasada — ${conv.donante.nombre}: ${formatMoneyShort(pendiente)} pendiente`,
    });
  }
}
```

**Update the `Alerta` type** at the bottom of the file:
```typescript
export type Alerta = {
  tipo: "saldo-bajo" | "convenio-vence" | "sesion-proxima" | "fe-atrasada";
  mensaje: string;
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

### 6b — Update `AlertasWidget`

- [ ] **Step 3: Update AlertasWidget**

Open `src/components/dashboard/AlertasWidget.tsx`. Apply:

**Add `CircleAlert` to the import:**
```typescript
import { AlertTriangle, Banknote, CalendarDays, CircleAlert } from "lucide-react";
```

**Add entry to `ICONO` map:**
```typescript
const ICONO = {
  "saldo-bajo": Banknote,
  "convenio-vence": AlertTriangle,
  "sesion-proxima": CalendarDays,
  "fe-atrasada": CircleAlert,   // ← ADD
};
```

**Update the icon color** in the render — currently all icons use the same gold color. Make `"fe-atrasada"` red:

Replace the existing icon render:
```typescript
<Icon size={14} className="text-[hsl(var(--ring))] shrink-0 mt-0.5" strokeWidth={2} />
```

With:
```typescript
<Icon
  size={14}
  className={`shrink-0 mt-0.5 ${
    a.tipo === "fe-atrasada" ? "text-red-600" : "text-[hsl(var(--ring))]"
  }`}
  strokeWidth={2}
/>
```

Also wrap the alert row div to show red background for FE overdue:

Replace the row `className`:
```typescript
className="flex gap-3 items-start p-2.5 rounded hover:bg-[hsl(var(--accent))] transition-colors"
```

With:
```typescript
className={`flex gap-3 items-start p-2.5 rounded transition-colors ${
  a.tipo === "fe-atrasada"
    ? "bg-red-50 hover:bg-red-100"
    : "hover:bg-[hsl(var(--accent))]"
}`}
```

The `alertas.slice(0, 5)` limit means at most 5 alerts show. FE overdue alerts are pushed first (they're added before `convenios` and `sesionesManana` alerts in `getDashboardData`) so they naturally appear at the top. Actually, to ensure FE alerts always appear before others, reorder the alert generation in `dashboard.ts` so FE overdue is pushed **before** the saldo-bajo loop. Edit the alertas section order:

```
1. FE atrasadas (conveniosParaCobranza loop)
2. Saldo bajo (cuentasConSaldo loop)
3. Convenios por vencer (convenios loop)
4. Sesiones próximas (sesionesManana loop)
```

Reorder the entire alertas section to match spec priority. The final order must be:
1. FE atrasadas (`conveniosParaCobranza` loop) — pushed first → appear at top
2. Convenios por vencer (`convenios` loop)
3. Saldo bajo (`cuentasConSaldo` loop)
4. Sesiones próximas (`sesionesManana` loop)

Move all four loops into this order inside the `// ── Alertas` section.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Smoke test alerts**

With dev server running:
1. Go to the Dashboard
2. If there's a convenio activo with an unpaid past month, verify the red FE alert appears at the top of the widget
3. Verify the badge count updates to include FE alerts
4. Verify existing alerts (saldo bajo, convenio vence) still render correctly

- [ ] **Step 6: Commit**

```bash
git add src/server/actions/dashboard.ts src/components/dashboard/AlertasWidget.tsx
git commit -m "feat: add fe-atrasada alerts to dashboard AlertasWidget"
```

---

## Task 7: Full smoke verification

Run through the spec checklist:

- [ ] Login → `/conciliacion` → default account loads, default month is current
- [ ] Select Davivienda CC + current month → movements appear (or empty state if none)
- [ ] Mark 3 movements as conciliado → badge updates to "3 / N", checkboxes stay checked after refresh
- [ ] Enter bank balance → difference appears (red if mismatch, green "✅ Todo cuadra" if $0.00)
- [ ] Click "Marcar visibles como conciliados" → all unchecked rows become conciliado
- [ ] Dashboard → AlertasWidget shows FE-atrasada alerts (red) if overdue payments exist
- [ ] Verify FE alerts appear before yellow alerts in the widget
- [ ] Verify "Conciliación" appears in sidebar between "Cierre de mes" and "Conceptos"
- [ ] `npx tsc --noEmit` passes clean
- [ ] `npm run build` succeeds without errors

- [ ] **Final commit if any last fixes:**

```bash
git add -p
git commit -m "fix: spec5 smoke test adjustments"
```
