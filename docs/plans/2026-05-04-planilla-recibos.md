# Spec #4 — Planilla y Recibos — Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Build the complete payroll module: employee CRUD, biweekly planilla with editable partidas and deduction toggle, state flow BORRADOR→APROBADA→PAGADA, and PDF receipt generation.

**Architecture:** Server Actions with `runAction`/`requireUser` for auth, Prisma transactions for all multi-step mutations, `recalcularTotales` called in every partition-mutating action, client components for interactive parts (toggle, inline edit, add extra).

**Tech Stack:** Next.js 15 App Router, Prisma + Postgres, Zod validation, `@react-pdf/renderer`, `Prisma.Decimal` for all financial arithmetic.

**Spec doc:** `docs/superpowers/specs/2026-05-04-planilla-recibos-design.md`

---

## Task 1: Prisma Migration — add `medioPago` to Planilla and ReciboPago

**Files:**
- Modify: `prisma/schema.prisma` (Planilla model at line ~470, ReciboPago model at line ~505)

**Step 1: Add `medioPago` field to both models in schema.prisma**

In the `Planilla` model, add after `estado`:
```prisma
medioPago       MedioPago      @default(EFECTIVO)
```

In the `ReciboPago` model, add after `montoNeto`:
```prisma
medioPago       MedioPago      @default(EFECTIVO)
```

Both models should look like this after the edit:

```prisma
model Planilla {
  id              String         @id @default(cuid())
  anio            Int
  mes             Int
  quincena        Int
  fechaInicio     DateTime
  fechaFin        DateTime
  fechaPago       DateTime
  medioPago       MedioPago      @default(EFECTIVO)    // ← NEW
  totalBruto      Decimal        @default(0) @db.Decimal(14, 2)
  totalDescuentos Decimal        @default(0) @db.Decimal(14, 2)
  totalNeto       Decimal        @default(0) @db.Decimal(14, 2)
  estado          EstadoPlanilla @default(BORRADOR)
  createdAt       DateTime       @default(now())

  partidas PartidaPlanilla[]
  recibos  ReciboPago[]

  @@unique([anio, mes, quincena])
  @@map("planillas")
}

model ReciboPago {
  id             String    @id @default(cuid())
  planillaId     String
  planilla       Planilla  @relation(fields: [planillaId], references: [id])
  empleadoId     String
  empleado       Empleado  @relation(fields: [empleadoId], references: [id])
  montoNeto      Decimal   @db.Decimal(14, 2)
  medioPago      MedioPago @default(EFECTIVO)           // ← NEW
  fechaFirma     DateTime?
  urlPdfGenerado String?
  correlativo    String?   @unique
  createdAt      DateTime  @default(now())

  @@index([planillaId, empleadoId])
  @@map("recibos_pago")
}
```

**Step 2: Run migration**

```bash
cd "C:\Users\Daniel\Desktop\Gestión ML"
npx prisma migrate dev --name add_mediopago_to_planilla_recibo
```

Expected: migration file created in `prisma/migrations/`, Prisma client regenerated.

**Step 3: Verify TypeScript types updated**

```bash
npx tsc --noEmit
```

Expected: no errors related to `medioPago`.

---

## Task 2: Zod Schemas

**Files:**
- Modify: `src/lib/zod-schemas.ts`

Add these imports at the top (merge with existing imports):

```typescript
import {
  // existing...
  TipoPartida,
  EstadoPlanilla,
} from "@prisma/client";
```

Append these three schemas at the end of `src/lib/zod-schemas.ts`:

```typescript
// ----------------------------------------
// EMPLEADO
// ----------------------------------------
export const empleadoSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  dui: duiSchema,
  nit: nitSchema,
  isss: opt(z.string().trim()),
  afp: opt(z.string().trim()),
  cargo: opt(z.string().trim()),
  sueldoBase: decimalString,
  fechaIngreso: z.coerce.date(),
  fechaSalida: fechaOpt,
  cuentaBanco: opt(z.string().trim()),
  activo: z.coerce.boolean().default(true),
});
export type EmpleadoInput = z.infer<typeof empleadoSchema>;

// ----------------------------------------
// PLANILLA
// ----------------------------------------
export const planillaSchema = z.object({
  anio: z.coerce.number().int().min(2020).max(2099),
  mes: z.coerce.number().int().min(1).max(12),
  quincena: z.coerce.number().int().min(1).max(2),
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date(),
  fechaPago: z.coerce.date(),
  medioPago: z.nativeEnum(MedioPago).default(MedioPago.EFECTIVO),
});
export type PlanillaInput = z.infer<typeof planillaSchema>;

// ----------------------------------------
// PARTIDA
// ----------------------------------------
export const partidaSchema = z.object({
  tipo: z.nativeEnum(TipoPartida),
  monto: decimalString,
  descripcion: opt(z.string().trim()),
});
export type PartidaInput = z.infer<typeof partidaSchema>;
```

**Step: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

## Task 3: Business Logic — Deducciones

**Files:**
- Create: `src/lib/planillas/deducciones.ts`

```typescript
import { Prisma } from "@prisma/client";

const D = (n: string) => new Prisma.Decimal(n);

export function calcularDeducciones(sueldoBase: Prisma.Decimal): {
  isss: Prisma.Decimal;
  afp: Prisma.Decimal;
  isr: Prisma.Decimal;
} {
  // ISSS: min(sueldoBase × 3%, $30.00 cap)
  const isssRaw = sueldoBase.times(D("0.03"));
  const isss = isssRaw.greaterThan(D("30.00")) ? D("30.00") : isssRaw;

  // AFP: sueldoBase × 6.25%
  const afp = sueldoBase.times(D("0.0625"));

  // ISR — tramos oficiales Ministerio de Hacienda El Salvador
  // Los valores $42.35 y $271.09 son constantes publicadas por Hacienda
  let isr: Prisma.Decimal;
  if (sueldoBase.lessThanOrEqualTo(D("472.00"))) {
    isr = D("0");
  } else if (sueldoBase.lessThanOrEqualTo(D("895.24"))) {
    isr = sueldoBase.minus(D("472.00")).times(D("0.10"));
  } else if (sueldoBase.lessThanOrEqualTo(D("2038.10"))) {
    isr = D("42.35").plus(sueldoBase.minus(D("895.24")).times(D("0.20")));
  } else {
    isr = D("271.09").plus(sueldoBase.minus(D("2038.10")).times(D("0.30")));
  }

  return {
    isss: isss.toDecimalPlaces(2),
    afp: afp.toDecimalPlaces(2),
    isr: isr.toDecimalPlaces(2),
  };
}
```

**Step: Verify smoke cases mentally**
- sueldo $250: ISSS = 250×0.03 = $7.50, AFP = 250×0.0625 = $15.63 (rounded), ISR = $0 (≤472)
- sueldo $1000: ISSS = $30 (cap), AFP = $62.50, ISR = (1000−895.24)×0.20 + 42.35 = 20.95 + 42.35 = $63.30

```bash
npx tsc --noEmit
```

---

## Task 4: Business Logic — Totales

**Files:**
- Create: `src/lib/planillas/totales.ts`

```typescript
import { Prisma, TipoPartida } from "@prisma/client";

const TIPOS_DESCUENTO = [
  TipoPartida.DESCUENTO_ISSS,
  TipoPartida.DESCUENTO_AFP,
  TipoPartida.DESCUENTO_ISR,
  TipoPartida.DESCUENTO_OTRO,
];

export async function recalcularTotales(
  planillaId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const partidas = await tx.partidaPlanilla.findMany({ where: { planillaId } });

  let totalBruto = new Prisma.Decimal(0);
  let totalDescuentos = new Prisma.Decimal(0);

  for (const p of partidas) {
    if (TIPOS_DESCUENTO.includes(p.tipo)) {
      totalDescuentos = totalDescuentos.plus(p.monto);
    } else {
      totalBruto = totalBruto.plus(p.monto);
    }
  }

  await tx.planilla.update({
    where: { id: planillaId },
    data: {
      totalBruto,
      totalDescuentos,
      totalNeto: totalBruto.minus(totalDescuentos),
    },
  });
}
```

```bash
npx tsc --noEmit
```

---

## Task 5: Server Actions — Empleados

**Files:**
- Create: `src/server/actions/empleados.ts`

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { empleadoSchema } from "@/lib/zod-schemas";
import { runAction } from "./helpers";
import { requireUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function listarEmpleados() {
  await requireUser();
  return prisma.empleado.findMany({
    orderBy: { nombre: "asc" },
  });
}

export async function obtenerEmpleado(id: string) {
  await requireUser();
  return prisma.empleado.findUnique({ where: { id } });
}

export async function crearEmpleado(formData: FormData) {
  return runAction(empleadoSchema, Object.fromEntries(formData), async (data) => {
    const empleado = await prisma.empleado.create({
      data: {
        nombre: data.nombre,
        dui: data.dui ?? null,
        nit: data.nit ?? null,
        isss: data.isss ?? null,
        afp: data.afp ?? null,
        cargo: data.cargo ?? null,
        sueldoBase: new Prisma.Decimal(data.sueldoBase),
        fechaIngreso: data.fechaIngreso,
        fechaSalida: data.fechaSalida ?? null,
        cuentaBanco: data.cuentaBanco ?? null,
        activo: data.activo,
      },
    });
    return { id: empleado.id };
  });
}

export async function actualizarEmpleado(id: string, formData: FormData) {
  return runAction(empleadoSchema, Object.fromEntries(formData), async (data) => {
    await prisma.empleado.update({
      where: { id },
      data: {
        nombre: data.nombre,
        dui: data.dui ?? null,
        nit: data.nit ?? null,
        isss: data.isss ?? null,
        afp: data.afp ?? null,
        cargo: data.cargo ?? null,
        sueldoBase: new Prisma.Decimal(data.sueldoBase),
        fechaIngreso: data.fechaIngreso,
        fechaSalida: data.fechaSalida ?? null,
        cuentaBanco: data.cuentaBanco ?? null,
        activo: data.activo,
      },
    });
    revalidatePath("/empleados");
    revalidatePath(`/empleados/${id}`);
    return {};
  });
}

// Form wrappers (return void, redirect on success)
export async function crearEmpleadoForm(formData: FormData): Promise<void> {
  const res = await crearEmpleado(formData);
  if (!res.ok) throw new Error(res.error);
  redirect("/empleados");
}
```

```bash
npx tsc --noEmit
```

---

## Task 6: Server Actions — Planillas

**Files:**
- Create: `src/server/actions/planillas.ts`

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { planillaSchema, partidaSchema } from "@/lib/zod-schemas";
import { runAction } from "./helpers";
import { requireUser } from "@/lib/auth";
import { Prisma, TipoPartida, TipoCorrelativo, EstadoPlanilla, MedioPago } from "@prisma/client";
import { recalcularTotales } from "@/lib/planillas/totales";
import { calcularDeducciones } from "@/lib/planillas/deducciones";
import { generarCorrelativo } from "@/lib/correlativo";

const TIPOS_DESCUENTO = [
  TipoPartida.DESCUENTO_ISSS,
  TipoPartida.DESCUENTO_AFP,
  TipoPartida.DESCUENTO_ISR,
  TipoPartida.DESCUENTO_OTRO,
];

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function listarPlanillas(anio?: number) {
  await requireUser();
  return prisma.planilla.findMany({
    where: anio ? { anio } : undefined,
    orderBy: [{ anio: "desc" }, { mes: "desc" }, { quincena: "desc" }],
  });
}

export async function obtenerPlanilla(id: string) {
  await requireUser();
  const planilla = await prisma.planilla.findUnique({
    where: { id },
    include: {
      partidas: {
        include: { empleado: true },
        orderBy: [{ empleadoId: "asc" }, { tipo: "asc" }],
      },
      recibos: { orderBy: { correlativo: "asc" } },
    },
  });
  if (!planilla) return null;

  // Serialize Decimals and group partidas by employee for RSC → Client boundary
  const empleadoMap = new Map<string, {
    id: string;
    nombre: string;
    cargo: string | null;
    sueldoBase: number;
    isss: string | null;
    afp: string | null;
    partidas: { id: string; tipo: TipoPartida; monto: number; descripcion: string | null }[];
  }>();

  for (const p of planilla.partidas) {
    if (!empleadoMap.has(p.empleadoId)) {
      empleadoMap.set(p.empleadoId, {
        id: p.empleado.id,
        nombre: p.empleado.nombre,
        cargo: p.empleado.cargo,
        sueldoBase: Number(p.empleado.sueldoBase),
        isss: p.empleado.isss,
        afp: p.empleado.afp,
        partidas: [],
      });
    }
    empleadoMap.get(p.empleadoId)!.partidas.push({
      id: p.id,
      tipo: p.tipo,
      monto: Number(p.monto),
      descripcion: p.descripcion,
    });
  }

  return {
    id: planilla.id,
    anio: planilla.anio,
    mes: planilla.mes,
    quincena: planilla.quincena,
    fechaInicio: planilla.fechaInicio,
    fechaFin: planilla.fechaFin,
    fechaPago: planilla.fechaPago,
    medioPago: planilla.medioPago,
    totalBruto: Number(planilla.totalBruto),
    totalDescuentos: Number(planilla.totalDescuentos),
    totalNeto: Number(planilla.totalNeto),
    estado: planilla.estado,
    empleados: Array.from(empleadoMap.values()),
    recibos: planilla.recibos.map((r) => ({
      id: r.id,
      empleadoId: r.empleadoId,
      correlativo: r.correlativo,
    })),
  };
}

// ─── Crear planilla ───────────────────────────────────────────────────────────

export async function crearPlanilla(formData: FormData) {
  return runAction(planillaSchema, Object.fromEntries(formData), async (data) => {
    return prisma.$transaction(async (tx) => {
      const planilla = await tx.planilla.create({
        data: {
          anio: data.anio,
          mes: data.mes,
          quincena: data.quincena,
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
          fechaPago: data.fechaPago,
          medioPago: data.medioPago,
        },
      });

      const empleados = await tx.empleado.findMany({ where: { activo: true } });
      if (empleados.length > 0) {
        await tx.partidaPlanilla.createMany({
          data: empleados.map((e) => ({
            planillaId: planilla.id,
            empleadoId: e.id,
            tipo: TipoPartida.SUELDO,
            monto: e.sueldoBase.dividedBy(2).toDecimalPlaces(2),
          })),
        });
      }

      await recalcularTotales(planilla.id, tx);
      return { id: planilla.id };
    });
  });
}

export async function crearPlanillaForm(formData: FormData): Promise<void> {
  const res = await crearPlanilla(formData);
  if (!res.ok) throw new Error(res.error);
  redirect(`/planillas/${res.data!.id}`);
}

// ─── Mutaciones de partidas ───────────────────────────────────────────────────

export async function actualizarPartida(
  partidaId: string,
  monto: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  try {
    const montoD = new Prisma.Decimal(monto);
    if (montoD.isNegative() || montoD.isZero()) throw new Error("El monto debe ser mayor que cero");

    await prisma.$transaction(async (tx) => {
      const partida = await tx.partidaPlanilla.findUniqueOrThrow({ where: { id: partidaId } });
      await tx.partidaPlanilla.update({ where: { id: partidaId }, data: { monto: montoD } });
      await recalcularTotales(partida.planillaId, tx);
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function agregarPartida(
  planillaId: string,
  empleadoId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const parsed = partidaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.partidaPlanilla.create({
        data: {
          planillaId,
          empleadoId,
          tipo: parsed.data.tipo,
          monto: new Prisma.Decimal(parsed.data.monto),
          descripcion: parsed.data.descripcion ?? null,
        },
      });
      await recalcularTotales(planillaId, tx);
    });
    revalidatePath(`/planillas/${planillaId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function eliminarPartida(
  partidaId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  try {
    await prisma.$transaction(async (tx) => {
      const partida = await tx.partidaPlanilla.findUniqueOrThrow({ where: { id: partidaId } });
      await tx.partidaPlanilla.delete({ where: { id: partidaId } });
      await recalcularTotales(partida.planillaId, tx);
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function aplicarDeducciones(
  planillaId: string,
  empleadoId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  try {
    const empleado = await prisma.empleado.findUniqueOrThrow({ where: { id: empleadoId } });
    const { isss, afp, isr } = calcularDeducciones(empleado.sueldoBase);

    await prisma.$transaction(async (tx) => {
      await tx.partidaPlanilla.deleteMany({
        where: {
          planillaId,
          empleadoId,
          tipo: { in: [TipoPartida.DESCUENTO_ISSS, TipoPartida.DESCUENTO_AFP, TipoPartida.DESCUENTO_ISR] },
        },
      });
      await tx.partidaPlanilla.createMany({
        data: [
          { planillaId, empleadoId, tipo: TipoPartida.DESCUENTO_ISSS, monto: isss },
          { planillaId, empleadoId, tipo: TipoPartida.DESCUENTO_AFP, monto: afp },
          { planillaId, empleadoId, tipo: TipoPartida.DESCUENTO_ISR, monto: isr },
        ],
      });
      await recalcularTotales(planillaId, tx);
    });

    revalidatePath(`/planillas/${planillaId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function quitarDeducciones(
  planillaId: string,
  empleadoId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.partidaPlanilla.deleteMany({
        where: {
          planillaId,
          empleadoId,
          tipo: { in: [TipoPartida.DESCUENTO_ISSS, TipoPartida.DESCUENTO_AFP, TipoPartida.DESCUENTO_ISR] },
        },
      });
      await recalcularTotales(planillaId, tx);
    });
    revalidatePath(`/planillas/${planillaId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

// ─── Flujo de estados ─────────────────────────────────────────────────────────

async function requireEstado(id: string, expected: EstadoPlanilla) {
  const planilla = await prisma.planilla.findUniqueOrThrow({ where: { id } });
  if (planilla.estado !== expected) {
    throw new Error(`La planilla está en estado ${planilla.estado}, se esperaba ${expected}`);
  }
  return planilla;
}

export async function aprobarPlanilla(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  try {
    await requireEstado(id, EstadoPlanilla.BORRADOR);
    await prisma.planilla.update({ where: { id }, data: { estado: EstadoPlanilla.APROBADA } });
    revalidatePath(`/planillas/${id}`);
    revalidatePath("/planillas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function revertirABorrador(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  try {
    await requireEstado(id, EstadoPlanilla.APROBADA);
    await prisma.planilla.update({ where: { id }, data: { estado: EstadoPlanilla.BORRADOR } });
    revalidatePath(`/planillas/${id}`);
    revalidatePath("/planillas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function marcarPagada(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  try {
    const planilla = await requireEstado(id, EstadoPlanilla.APROBADA);

    await prisma.$transaction(async (tx) => {
      const partidas = await tx.partidaPlanilla.findMany({ where: { planillaId: id } });

      // Group partidas by empleado
      const byEmpleado = new Map<string, typeof partidas>();
      for (const p of partidas) {
        const arr = byEmpleado.get(p.empleadoId) ?? [];
        arr.push(p);
        byEmpleado.set(p.empleadoId, arr);
      }

      // Create one ReciboPago per employee
      for (const [empleadoId, ps] of byEmpleado) {
        let neto = new Prisma.Decimal(0);
        for (const p of ps) {
          if (TIPOS_DESCUENTO.includes(p.tipo)) {
            neto = neto.minus(p.monto);
          } else {
            neto = neto.plus(p.monto);
          }
        }

        const correlativo = await generarCorrelativo(tx, TipoCorrelativo.RECIBO, planilla.fechaPago);

        await tx.reciboPago.create({
          data: {
            planillaId: id,
            empleadoId,
            montoNeto: neto,
            medioPago: planilla.medioPago,
            fechaFirma: planilla.fechaPago,
            correlativo,
          },
        });
      }

      await tx.planilla.update({ where: { id }, data: { estado: EstadoPlanilla.PAGADA } });
    });

    revalidatePath(`/planillas/${id}`);
    revalidatePath("/planillas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
```

```bash
npx tsc --noEmit
```

---

## Task 7: EmpleadoForm Component

**Files:**
- Create: `src/components/forms/EmpleadoForm.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EmpleadoInicial = {
  nombre: string;
  dui?: string | null;
  nit?: string | null;
  isss?: string | null;
  afp?: string | null;
  cargo?: string | null;
  sueldoBase: string; // serialized as string
  fechaIngreso: Date;
  fechaSalida?: Date | null;
  cuentaBanco?: string | null;
  activo: boolean;
};

type Props = {
  initial?: EmpleadoInicial | null;
  onSubmit: (formData: FormData) => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string[]> }>;
  submitLabel?: string;
};

const fmtDate = (d: Date | null | undefined) => {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
};

export function EmpleadoForm({ initial, onSubmit, submitLabel = "Guardar empleado" }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const e = (k: string) => fieldErrors[k]?.[0];

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setGlobalError(null);
    setFieldErrors({});
    const res = await onSubmit(formData);
    setPending(false);
    if (!res.ok) {
      setGlobalError(res.error ?? "Error al guardar");
      setFieldErrors(res.fieldErrors ?? {});
      return;
    }
    router.push("/empleados");
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {globalError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {globalError}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="nombre">Nombre completo *</Label>
            <Input id="nombre" name="nombre" required defaultValue={initial?.nombre ?? ""} />
            {e("nombre") ? <p className="text-xs text-destructive mt-1">{e("nombre")}</p> : null}
          </div>

          <div>
            <Label htmlFor="dui">DUI</Label>
            <Input id="dui" name="dui" placeholder="12345678-9" defaultValue={initial?.dui ?? ""} />
            {e("dui") ? <p className="text-xs text-destructive mt-1">{e("dui")}</p> : null}
          </div>

          <div>
            <Label htmlFor="nit">NIT</Label>
            <Input id="nit" name="nit" defaultValue={initial?.nit ?? ""} />
            {e("nit") ? <p className="text-xs text-destructive mt-1">{e("nit")}</p> : null}
          </div>

          <div>
            <Label htmlFor="isss">Número ISSS</Label>
            <Input id="isss" name="isss" defaultValue={initial?.isss ?? ""} />
          </div>

          <div>
            <Label htmlFor="afp">Número AFP</Label>
            <Input id="afp" name="afp" defaultValue={initial?.afp ?? ""} />
          </div>

          <div>
            <Label htmlFor="cargo">Cargo</Label>
            <Input id="cargo" name="cargo" defaultValue={initial?.cargo ?? ""} />
          </div>

          <div>
            <Label htmlFor="cuentaBanco">Cuenta banco</Label>
            <Input id="cuentaBanco" name="cuentaBanco" defaultValue={initial?.cuentaBanco ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contrato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="sueldoBase">Sueldo base mensual *</Label>
            <Input
              id="sueldoBase"
              name="sueldoBase"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={initial?.sueldoBase ?? ""}
            />
            {e("sueldoBase") ? <p className="text-xs text-destructive mt-1">{e("sueldoBase")}</p> : null}
          </div>

          <div>
            <Label htmlFor="fechaIngreso">Fecha de ingreso *</Label>
            <Input
              id="fechaIngreso"
              name="fechaIngreso"
              type="date"
              required
              defaultValue={fmtDate(initial?.fechaIngreso)}
            />
            {e("fechaIngreso") ? <p className="text-xs text-destructive mt-1">{e("fechaIngreso")}</p> : null}
          </div>

          <div>
            <Label htmlFor="fechaSalida">Fecha de salida</Label>
            <Input
              id="fechaSalida"
              name="fechaSalida"
              type="date"
              defaultValue={fmtDate(initial?.fechaSalida)}
            />
            <p className="text-xs text-muted-foreground mt-1">Al llenarla el empleado queda inactivo.</p>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="activo"
              name="activo"
              value="true"
              defaultChecked={initial?.activo ?? true}
              className="h-4 w-4 rounded border-border"
            />
            <Label htmlFor="activo">Activo</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
```

```bash
npx tsc --noEmit
```

---

## Task 8: Empleados Pages

**Files:**
- Create: `src/app/(app)/empleados/page.tsx`
- Create: `src/app/(app)/empleados/nuevo/page.tsx`
- Create: `src/app/(app)/empleados/[id]/page.tsx`

### `src/app/(app)/empleados/page.tsx`

```tsx
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
```

### `src/app/(app)/empleados/nuevo/page.tsx`

```tsx
import { crearEmpleado } from "@/server/actions/empleados";
import { EmpleadoForm } from "@/components/forms/EmpleadoForm";

export const dynamic = "force-dynamic";

export default function NuevoEmpleadoPage() {
  async function onSubmit(formData: FormData) {
    "use server";
    return crearEmpleado(formData);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Nuevo empleado</h1>
      </header>
      <EmpleadoForm onSubmit={onSubmit} />
    </div>
  );
}
```

### `src/app/(app)/empleados/[id]/page.tsx`

```tsx
import { notFound } from "next/navigation";
import { obtenerEmpleado, actualizarEmpleado } from "@/server/actions/empleados";
import { EmpleadoForm } from "@/components/forms/EmpleadoForm";

export const dynamic = "force-dynamic";

export default async function EditarEmpleadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const empleado = await obtenerEmpleado(id);
  if (!empleado) notFound();

  async function onSubmit(formData: FormData) {
    "use server";
    return actualizarEmpleado(id, formData);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Editar empleado</h1>
        <p className="text-muted-foreground">{empleado.nombre}</p>
      </header>
      <EmpleadoForm
        initial={{
          ...empleado,
          sueldoBase: String(empleado.sueldoBase),
        }}
        onSubmit={onSubmit}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
```

**Step: Build check**

```bash
npx tsc --noEmit
```

---

## Task 9: PlanillaForm + Planillas List Page + Nueva Page

**Files:**
- Create: `src/components/forms/PlanillaForm.tsx`
- Create: `src/app/(app)/planillas/page.tsx`
- Create: `src/app/(app)/planillas/nueva/page.tsx`

### `src/components/forms/PlanillaForm.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  onSubmit: (formData: FormData) => Promise<void>;
};

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function lastDayOfMonth(anio: number, mes: number) {
  return new Date(anio, mes, 0).getDate(); // mes is 1-based, Date(y,m,0) = last day
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function PlanillaForm({ onSubmit }: Props) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [quincena, setQuincena] = useState<1 | 2>(1);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute default dates whenever anio/mes/quincena change
  useEffect(() => {
    if (quincena === 1) {
      setFechaInicio(toISODate(new Date(Date.UTC(anio, mes - 1, 1))));
      setFechaFin(toISODate(new Date(Date.UTC(anio, mes - 1, 15))));
    } else {
      setFechaInicio(toISODate(new Date(Date.UTC(anio, mes - 1, 16))));
      setFechaFin(toISODate(new Date(Date.UTC(anio, mes - 1, lastDayOfMonth(anio, mes)))));
    }
  }, [anio, mes, quincena]);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await onSubmit(formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
      setPending(false);
    }
  }

  const anioActual = hoy.getFullYear();
  const anios = Array.from({ length: 6 }, (_, i) => anioActual - 1 + i);

  return (
    <form action={handleSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Período</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="anio">Año *</Label>
            <Select
              id="anio"
              name="anio"
              value={String(anio)}
              onChange={(e) => setAnio(Number(e.target.value))}
            >
              {anios.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="mes">Mes *</Label>
            <Select
              id="mes"
              name="mes"
              value={String(mes)}
              onChange={(e) => setMes(Number(e.target.value))}
            >
              {MESES.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="quincena">Quincena *</Label>
            <Select
              id="quincena"
              name="quincena"
              value={String(quincena)}
              onChange={(e) => setQuincena(Number(e.target.value) as 1 | 2)}
            >
              <option value="1">1ª quincena (1–15)</option>
              <option value="2">2ª quincena (16–fin de mes)</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="fechaInicio">Fecha inicio *</Label>
            <Input
              id="fechaInicio"
              name="fechaInicio"
              type="date"
              required
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="fechaFin">Fecha fin *</Label>
            <Input
              id="fechaFin"
              name="fechaFin"
              type="date"
              required
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="fechaPago">Fecha de pago *</Label>
            <Input id="fechaPago" name="fechaPago" type="date" required />
          </div>

          <div>
            <Label htmlFor="medioPago">Medio de pago *</Label>
            <Select id="medioPago" name="medioPago" defaultValue="EFECTIVO">
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia bancaria</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creando..." : "Crear planilla"}
        </Button>
      </div>
    </form>
  );
}
```

### `src/app/(app)/planillas/page.tsx`

```tsx
import Link from "next/link";
import { listarPlanillas } from "@/server/actions/planillas";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const MESES = [
  "","Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: "bg-yellow-100 text-yellow-700",
  APROBADA: "bg-blue-100 text-blue-700",
  PAGADA:   "bg-green-100 text-green-700",
};

export default async function PlanillasPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  const params = await searchParams;
  const anioFiltro = params.anio ? Number(params.anio) : undefined;
  const planillas = await listarPlanillas(anioFiltro);

  const anioActual = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Planillas</h1>
          <p className="text-muted-foreground">{planillas.length} planilla(s)</p>
        </div>
        <Button asChild>
          <Link href="/planillas/nueva">Nueva planilla</Link>
        </Button>
      </div>

      {/* Filtro año */}
      <div className="flex gap-2">
        {[anioActual - 1, anioActual, anioActual + 1].map((a) => (
          <Link
            key={a}
            href={`/planillas?anio=${a}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium border transition-colors ${
              anioFiltro === a
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-muted"
            }`}
          >
            {a}
          </Link>
        ))}
        {anioFiltro ? (
          <Link href="/planillas" className="rounded-md px-3 py-1.5 text-sm border border-border hover:bg-muted">
            Todas
          </Link>
        ) : null}
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Período</th>
              <th className="px-4 py-3 text-left font-medium">Fecha pago</th>
              <th className="px-4 py-3 text-right font-medium">Bruto</th>
              <th className="px-4 py-3 text-right font-medium">Descuentos</th>
              <th className="px-4 py-3 text-right font-medium">Neto</th>
              <th className="px-4 py-3 text-center font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {planillas.map((p) => (
              <tr key={p.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">
                  {p.quincena === 1 ? "1ª" : "2ª"} Quincena — {MESES[p.mes]} {p.anio}
                </td>
                <td className="px-4 py-3">
                  {new Intl.DateTimeFormat("es-SV", { dateStyle: "medium", timeZone: "UTC" }).format(p.fechaPago)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(p.totalBruto)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-destructive">{formatMoney(p.totalDescuentos)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{formatMoney(p.totalNeto)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[p.estado]}`}>
                    {p.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/planillas/${p.id}`} className="text-primary text-xs hover:underline">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
            {planillas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No hay planillas. Crea la primera con el botón de arriba.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### `src/app/(app)/planillas/nueva/page.tsx`

```tsx
import { crearPlanillaForm } from "@/server/actions/planillas";
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
      <PlanillaForm onSubmit={crearPlanillaForm} />
    </div>
  );
}
```

```bash
npx tsc --noEmit
```

---

## Task 10: Planilla Detail Page

**Files:**
- Create: `src/app/(app)/planillas/[id]/page.tsx`

This is a server component that renders the header and wires up state-transition buttons as server action forms.

```tsx
import { notFound } from "next/navigation";
import { obtenerPlanilla, aprobarPlanilla, revertirABorrador, marcarPagada } from "@/server/actions/planillas";
import { EmpleadoPartidas } from "@/components/planillas/EmpleadoPartidas";
import { Button } from "@/components/ui/button";
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
          <form
            action={async () => {
              "use server";
              await aprobarPlanilla(id);
            }}
          >
            <Button type="submit">Aprobar planilla</Button>
          </form>
        ) : null}

        {esAprobada ? (
          <>
            <form
              action={async () => {
                "use server";
                await marcarPagada(id);
              }}
            >
              <Button type="submit">Marcar como pagada</Button>
            </form>
            <form
              action={async () => {
                "use server";
                await revertirABorrador(id);
              }}
            >
              <Button type="submit" variant="outline">
                Revertir a borrador
              </Button>
            </form>
          </>
        ) : null}

        {planilla.estado === "PAGADA" ? (
          <div className="flex gap-2 flex-wrap">
            {planilla.recibos.map((r) => {
              const emp = planilla.empleados.find((e) => e.id === r.empleadoId);
              return (
                <Button key={r.id} variant="outline" asChild>
                  <Link href={`/api/recibos/${r.id}/pdf`} target="_blank">
                    PDF — {emp?.nombre ?? r.correlativo}
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
```

```bash
npx tsc --noEmit
```

---

## Task 11: EmpleadoPartidas Components

**Files:**
- Create: `src/components/planillas/AgregarPartidaInline.tsx`
- Create: `src/components/planillas/EmpleadoPartidas.tsx`

### `src/components/planillas/AgregarPartidaInline.tsx`

```tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { agregarPartida } from "@/server/actions/planillas";
import { useRouter } from "next/navigation";

type Props = {
  planillaId: string;
  empleadoId: string;
  onDone: () => void;
};

export function AgregarPartidaInline({ planillaId, empleadoId, onDone }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await agregarPartida(planillaId, empleadoId, formData);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Error al agregar");
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <form action={handleSubmit} className="flex items-end gap-2 pt-2">
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="w-40">
        <Select name="tipo" defaultValue="BONO" className="text-sm">
          <option value="BONO">Bono</option>
          <option value="HORA_EXTRA">Hora extra</option>
          <option value="DESCUENTO_OTRO">Descuento otro</option>
        </Select>
      </div>
      <div className="flex-1">
        <Input name="descripcion" placeholder="Descripción (opcional)" className="text-sm" />
      </div>
      <div className="w-28">
        <Input
          name="monto"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Monto"
          required
          className="text-sm"
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "..." : "Agregar"}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onDone}>
        Cancelar
      </Button>
    </form>
  );
}
```

### `src/components/planillas/EmpleadoPartidas.tsx`

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AgregarPartidaInline } from "./AgregarPartidaInline";
import {
  aplicarDeducciones,
  quitarDeducciones,
  actualizarPartida,
  eliminarPartida,
} from "@/server/actions/planillas";
import { formatMoney } from "@/lib/money";
import { TipoPartida } from "@prisma/client";

type Partida = {
  id: string;
  tipo: TipoPartida;
  monto: number;
  descripcion: string | null;
};

type Empleado = {
  id: string;
  nombre: string;
  cargo: string | null;
  sueldoBase: number;
  isss: string | null;
  afp: string | null;
  partidas: Partida[];
};

type Props = {
  planillaId: string;
  empleado: Empleado;
  editable: boolean;
};

const TIPO_LABEL: Record<TipoPartida, string> = {
  SUELDO:          "Sueldo quincenal",
  BONO:            "Bono",
  HORA_EXTRA:      "Hora extra",
  DESCUENTO_ISSS:  "ISSS",
  DESCUENTO_AFP:   "AFP",
  DESCUENTO_ISR:   "ISR",
  DESCUENTO_OTRO:  "Descuento",
};

const DESCUENTOS: TipoPartida[] = [
  TipoPartida.DESCUENTO_ISSS,
  TipoPartida.DESCUENTO_AFP,
  TipoPartida.DESCUENTO_ISR,
  TipoPartida.DESCUENTO_OTRO,
];

export function EmpleadoPartidas({ planillaId, empleado, editable }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAgregar, setShowAgregar] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMonto, setEditMonto] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const tieneDeducciones = empleado.partidas.some((p) => DESCUENTOS.includes(p.tipo));
  const isssWarning = !empleado.isss || !empleado.afp;

  const bruto = empleado.partidas
    .filter((p) => !DESCUENTOS.includes(p.tipo))
    .reduce((sum, p) => sum + p.monto, 0);
  const descuentos = empleado.partidas
    .filter((p) => DESCUENTOS.includes(p.tipo))
    .reduce((sum, p) => sum + p.monto, 0);
  const neto = bruto - descuentos;

  function handleToggleDeducciones(checked: boolean) {
    setActionError(null);
    startTransition(async () => {
      const fn = checked ? aplicarDeducciones : quitarDeducciones;
      const res = await fn(planillaId, empleado.id);
      if (!res.ok) setActionError(res.error ?? "Error");
      else router.refresh();
    });
  }

  function startEdit(p: Partida) {
    setEditingId(p.id);
    setEditMonto(String(p.monto));
  }

  async function saveEdit(partidaId: string) {
    setActionError(null);
    const res = await actualizarPartida(partidaId, editMonto);
    if (!res.ok) {
      setActionError(res.error ?? "Error");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function handleEliminar(partidaId: string) {
    setActionError(null);
    const res = await eliminarPartida(partidaId);
    if (!res.ok) setActionError(res.error ?? "Error");
    else router.refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{empleado.nombre}</CardTitle>
            {empleado.cargo ? (
              <p className="text-xs text-muted-foreground">{empleado.cargo}</p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Neto</p>
            <p className="text-lg font-bold tabular-nums">{formatMoney(neto)}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {actionError ? (
          <p className="text-xs text-destructive">{actionError}</p>
        ) : null}

        {/* Partidas table */}
        <div className="space-y-1">
          {empleado.partidas.map((p) => {
            const esDescuento = DESCUENTOS.includes(p.tipo);
            return (
              <div key={p.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/30 text-sm">
                <span className="flex-1 text-muted-foreground">
                  {TIPO_LABEL[p.tipo]}
                  {p.descripcion ? ` — ${p.descripcion}` : ""}
                </span>
                {editable && editingId === p.id ? (
                  <>
                    <Input
                      className="w-24 h-7 text-sm"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editMonto}
                      onChange={(e) => setEditMonto(e.target.value)}
                    />
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={() => saveEdit(p.id)}>
                      OK
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingId(null)}>
                      ✕
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className={`tabular-nums font-medium ${esDescuento ? "text-destructive" : ""}`}
                    >
                      {esDescuento ? "−" : "+"}{formatMoney(p.monto)}
                    </span>
                    {editable ? (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="text-xs text-primary hover:underline"
                        >
                          Editar
                        </button>
                        {p.tipo !== TipoPartida.SUELDO ? (
                          <button
                            type="button"
                            onClick={() => handleEliminar(p.id)}
                            className="text-xs text-destructive hover:underline"
                          >
                            ✕
                          </button>
                        ) : null}
                      </>
                    ) : null}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Totals row */}
        <div className="flex justify-end gap-6 border-t pt-2 text-sm">
          <span className="text-muted-foreground">Bruto: {formatMoney(bruto)}</span>
          <span className="text-destructive">Desc.: {formatMoney(descuentos)}</span>
          <span className="font-bold">Neto: {formatMoney(neto)}</span>
        </div>

        {/* Controls (BORRADOR only) */}
        {editable ? (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* Deducciones toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={tieneDeducciones}
                disabled={isPending}
                onChange={(e) => handleToggleDeducciones(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Aplicar deducciones legales
            </label>

            {tieneDeducciones && isssWarning ? (
              <span className="text-xs text-amber-600">
                ⚠ Empleado sin número ISSS/AFP registrado
              </span>
            ) : null}

            {/* Add extra button */}
            {!showAgregar ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowAgregar(true)}
              >
                + Extra
              </Button>
            ) : null}
          </div>
        ) : null}

        {showAgregar ? (
          <AgregarPartidaInline
            planillaId={planillaId}
            empleadoId={empleado.id}
            onDone={() => setShowAgregar(false)}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
```

```bash
npx tsc --noEmit
```

---

## Task 12: Recibo PDF + Endpoint

**Files:**
- Create: `src/lib/planillas/recibo-pdf.tsx`
- Create: `src/app/api/recibos/[id]/pdf/route.tsx`

### `src/lib/planillas/recibo-pdf.tsx`

```tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { MedioPago } from "@prisma/client";
import { montoEnLetras } from "@/lib/money";
import { Prisma } from "@prisma/client";

const MESES_ES = [
  "","ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
  "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE",
];

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 12,
    color: "#0B1C2B",
    paddingVertical: 80,
    paddingHorizontal: 70,
  },
  por: {
    fontSize: 11,
    textAlign: "right",
    marginBottom: 32,
  },
  porMonto: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
  },
  line: {
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 1.5,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  lugar: {
    marginTop: 28,
    marginBottom: 40,
    fontSize: 12,
  },
  firma: {
    textAlign: "right",
    fontSize: 12,
  },
  firmaLine: {
    textAlign: "right",
    borderTopWidth: 0.8,
    borderColor: "#0B1C2B",
    paddingTop: 4,
    marginTop: 2,
    fontSize: 11,
  },
  pago: {
    marginTop: 24,
    fontSize: 12,
  },
});

function formatMontoLetras(monto: Prisma.Decimal): string {
  // montoEnLetras returns e.g. "ciento veinticinco 00/100 dólares"
  // We need "CIENTO VEINTICINCO CON 00/100 DÓLARES"
  const raw = montoEnLetras(monto);
  const withCon = raw.replace(/(\d{2}\/100)/, "CON $1");
  return withCon.toUpperCase();
}

function concepto(mes: number, anio: number, quincena: number): string {
  if (quincena === 1) {
    return `ANTICIPO DE SUELDO DE ${MESES_ES[mes]} DEL ${anio}`;
  }
  return `SUELDO SEGUNDA QUINCENA DE ${MESES_ES[mes]} DEL ${anio}`;
}

function fechaLarga(d: Date): string {
  const utc = new Date(d);
  const dia = utc.getUTCDate();
  const mes = MESES_ES[utc.getUTCMonth() + 1];
  const anio = utc.getUTCFullYear();
  return `SANTA ANA, ${dia} DE ${mes} DE ${anio}`;
}

function medioPagoLabel(mp: MedioPago): string {
  return mp === MedioPago.EFECTIVO ? "PAGO EN EFECTIVO." : "PAGO BANCO.";
}

type ReciboData = {
  montoNeto: Prisma.Decimal;
  medioPago: MedioPago;
  fechaFirma: Date;
  empleadoNombre: string;
  mes: number;
  anio: number;
  quincena: number;
};

export function ReciboPDF({ data }: { data: ReciboData }) {
  const { montoNeto, medioPago, fechaFirma, empleadoNombre, mes, anio, quincena } = data;

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.por}>
          <Text>
            POR{"  "}
            <Text style={s.porMonto}>${Number(montoNeto).toFixed(2)}</Text>
          </Text>
        </View>

        <Text style={s.line}>RECIBÍ DE PATRONATO DE CENTRO CULTURAL EL MOLINO</Text>

        <Text style={s.line}>
          LA CANTIDAD DE{" "}
          <Text style={s.bold}>{formatMontoLetras(montoNeto)}</Text>
        </Text>

        <Text style={s.line}>
          EN CONCEPTO DE{" "}
          <Text style={s.bold}>{concepto(mes, anio, quincena)}</Text>
        </Text>

        <Text style={s.lugar}>{fechaLarga(fechaFirma)}</Text>

        <View style={s.firma}>
          <Text>F. ___________________</Text>
          <Text style={{ ...s.firmaLine, marginTop: 8 }}>{empleadoNombre}</Text>
        </View>

        <Text style={s.pago}>{medioPagoLabel(medioPago)}</Text>
      </Page>
    </Document>
  );
}
```

### `src/app/api/recibos/[id]/pdf/route.tsx`

```tsx
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ReciboPDF } from "@/lib/planillas/recibo-pdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;

  const recibo = await prisma.reciboPago.findUnique({
    where: { id },
    include: {
      empleado: { select: { nombre: true } },
      planilla: { select: { mes: true, anio: true, quincena: true } },
    },
  });

  if (!recibo) return new NextResponse("Not found", { status: 404 });

  const data = {
    montoNeto: recibo.montoNeto,
    medioPago: recibo.medioPago,
    fechaFirma: recibo.fechaFirma ?? recibo.createdAt,
    empleadoNombre: recibo.empleado.nombre,
    mes: recibo.planilla.mes,
    anio: recibo.planilla.anio,
    quincena: recibo.planilla.quincena,
  };

  const buffer = await renderToBuffer(<ReciboPDF data={data} />);

  const filename = `Recibo_${recibo.empleado.nombre.replace(/\s+/g, "_")}_${recibo.correlativo ?? id}.pdf`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
```

```bash
npx tsc --noEmit
```

---

## Task 13: Nav Update

**Files:**
- Modify: `src/components/ui/nav-links.tsx`

Add `UserRound` and `Receipt` to the lucide-react import, and insert two new entries into `NAV_MAIN`:

```typescript
import {
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  UserRound,   // ← NEW
  Landmark,
  Receipt,     // ← NEW
  FileText,
  CalendarCheck,
  Tag,
  Layers,
  Handshake,
  CalendarClock,
  BookOpen,
} from "lucide-react";
```

Update `NAV_MAIN` array — add `Empleados` after `Donantes` and `Planillas` after `Cuentas`:

```typescript
const NAV_MAIN = [
  { href: "/",                          label: "Dashboard",      icon: LayoutDashboard, exact: true },
  { href: "/movimientos",               label: "Movimientos",    icon: ArrowLeftRight                },
  { href: "/donantes",                  label: "Donantes",       icon: Users                         },
  { href: "/empleados",                 label: "Empleados",      icon: UserRound                     },  // ← NEW
  { href: "/cuentas",                   label: "Cuentas",        icon: Landmark                      },
  { href: "/planillas",                 label: "Planillas",      icon: Receipt                       },  // ← NEW
  { href: "/reportes",                  label: "Reportes",       icon: FileText                      },
  { href: "/cierre",                    label: "Cierre de mes",  icon: CalendarCheck                 },
  { href: "/catalogos/conceptos",       label: "Conceptos",      icon: Tag                           },
  { href: "/catalogos/clasificaciones", label: "Clasificaciones",icon: Layers                        },
];
```

```bash
npx tsc --noEmit
npx next build 2>&1 | head -40
```

---

## Task 14: Smoke Verification

Start the dev server and manually verify the full flow:

```bash
npx next dev -p 3004
```

**Checklist (from spec):**

1. Go to `/empleados` → empty list with "Nuevo empleado" button
2. Create employee with nombre "Tomás Colocho Hernández", sueldo $250/month → appears in list
3. Go to `/planillas/nueva` → fill 1ª quincena Mayo 2026, pago effective → create
4. Go to detail page → SUELDO partida for Tomás = $125.00
5. Toggle "Aplicar deducciones":
   - ISSS = $7.50 (250 × 0.03)
   - AFP = $15.63 (250 × 0.0625 → 15.625 → rounded $15.63)
   - ISR = $0.00 (250 ≤ 472)
6. Edit AFP manually to $16.00 → neto updates
7. Add BONO $50 → extras show, neto updates
8. Click "Aprobar planilla" → estado badge = APROBADA, controls disappear
9. Click "Marcar como pagada" → estado = PAGADA, PDF button appears with correlativo RECIBO-2026-05-001
10. Click PDF button → browser opens PDF with:
    - "POR $..." in top right
    - "RECIBÍ DE PATRONATO DE CENTRO CULTURAL EL MOLINO"
    - "EN CONCEPTO DE ANTICIPO DE SUELDO DE MAYO DEL 2026"
    - Monto en letras with "CON" before fraction
    - "PAGO EN EFECTIVO."
11. Back to `/planillas/nueva` → create 2ª quincena May 2026 → detail shows quincena 2, when paid PDF says "SUELDO SEGUNDA QUINCENA DE MAYO DEL 2026"
12. Try creating another 1ª quincena May 2026 → Prisma unique constraint error visible in form
13. Try reverting a PAGADA planilla → action returns error (never succeeds because PAGADA is terminal)
14. Sidebar shows "Empleados" between Donantes and Cuentas, "Planillas" between Cuentas and Reportes
