# Spec #4 — Planilla y Recibos

**Fecha:** 2026-05-04  
**Proyecto:** Gestión ML — Centro Cultural El Molino  
**Estado:** Aprobado por el usuario

---

## Contexto

El Centro Cultural El Molino tiene 2 empleados con planilla quincenal (24 planillas/año). Actualmente los recibos de pago se generan manualmente. Este spec crea el módulo completo: CRUD de empleados, gestión de planillas quincenales con partidas editables, cálculo automático de deducciones legales (ISSS, AFP, ISR), y generación de recibos PDF firmables.

El schema de base de datos (modelos `Empleado`, `Planilla`, `PartidaPlanilla`, `ReciboPago`) ya existe desde Spec #1 y está migrado. Este spec requiere **una migración adicional** para añadir el campo `medioPago` al modelo `ReciboPago` (ver sección "Migración requerida").

---

## Migración requerida

El modelo `ReciboPago` necesita un campo para almacenar el medio de pago (efectivo o banco), que se imprime en el PDF. Se añade vía nueva migración Prisma:

```prisma
model ReciboPago {
  // ... campos existentes ...
  medioPago  MedioPago @default(EFECTIVO)   // ← NUEVO
}
```

El enum `MedioPago` ya existe en el schema (`EFECTIVO`, `TRANSFERENCIA`, etc.). Se usa `MedioPago.EFECTIVO` como default.

El medio de pago se define al nivel de **planilla** (un valor para toda la quincena, no por empleado) y se copia a cada `ReciboPago` al generarse.

---

## Alcance funcional

### 1. Empleados (`/empleados`)

**Listado** — tabla con: Nombre, Cargo, Sueldo base, Fecha ingreso, Estado (activo/inactivo). Botón "Nuevo empleado".

**`/empleados/[id]`** — sirve como página de edición directa (igual que el patrón de `/donantes/[id]`).

**Formulario crear/editar** — campos:
- Nombre (requerido)
- DUI (`########-#`, opcional)
- NIT (opcional)
- Número ISSS (opcional) — si está vacío se muestra aviso informativo en el toggle de deducciones
- Número AFP (opcional) — ídem
- Cargo (opcional)
- Sueldo base — `Decimal(14,2)`, requerido
- Fecha de ingreso (requerido)
- Fecha de salida (opcional — al llenarla el empleado queda inactivo automáticamente)
- Cuenta banco (opcional)
- Activo (checkbox, default true)

No se elimina físicamente — `activo = false` lo excluye de nuevas planillas pero conserva historial.

---

### 2. Planillas (`/planillas` y `/planillas/[id]`)

#### Listado `/planillas`

Tabla con: Año, Mes, Quincena, Fecha pago, Total bruto, Total descuentos, Total neto, Estado (badge), Acciones.  
Filtro por año. Botón "Nueva planilla".

#### Crear planilla (`/planillas/nueva`)

Campos del formulario:
- Año, Mes, Quincena (1 ó 2)
- Fecha inicio (default: día 1 ó 16 del mes)
- Fecha fin (default: día 15 ó último día del mes)
- Fecha de pago
- Medio de pago: `EFECTIVO` | `TRANSFERENCIA` — se persiste en cada `ReciboPago` al generarlos

Constraint único en DB: `@@unique([anio, mes, quincena])` — error visible si se intenta duplicar.

**Al guardar:** dentro de `prisma.$transaction`, se generan partidas `SUELDO` para cada empleado activo con `monto = sueldoBase / 2` (usando `Prisma.Decimal`, no JS float). Estado inicial: BORRADOR.

#### Detalle `/planillas/[id]`

**Cabecera:** período (ej. "1ª Quincena — Mayo 2026"), fecha pago, medio de pago, estado badge, totales (bruto / descuentos / neto), botones de acción según estado.

**Tabla por empleado** — una sección por empleado con:

| Columna | Detalle |
|---|---|
| Sueldo quincenal | `sueldoBase / 2` — editable en BORRADOR |
| Extras | suma de BONO + HORA_EXTRA |
| Descuentos | suma de DESCUENTO_* |
| **Neto** | Sueldo + Extras − Descuentos |

Controles por empleado (solo visibles en estado BORRADOR):
- **Toggle "Aplicar deducciones"** — genera las tres partidas de descuento (ISSS, AFP, ISR) calculadas sobre `sueldoBase` mensual. Si `isss` o `afp` del empleado están vacíos, muestra aviso informativo pero permite aplicarlas igualmente.
- Al desactivar el toggle se eliminan las partidas `DESCUENTO_ISSS`, `DESCUENTO_AFP`, `DESCUENTO_ISR` existentes.
- **Botón "+ Extra"** — abre fila inline: tipo (BONO | HORA_EXTRA | DESCUENTO_OTRO), descripción opcional, monto
- Cada partida individual tiene campo de monto editable in-place

**`recalcularTotales(planillaId, tx)`** se ejecuta dentro de la misma `prisma.$transaction` en **todas** las acciones que crean, editan o eliminan partidas: `actualizarPartida`, `agregarPartida`, `eliminarPartida`, `aplicarDeducciones`, `quitarDeducciones`.

#### Cálculo de deducciones

> **Importante:** todos los cálculos usan `Prisma.Decimal` (no JS floats) para evitar errores de precisión en punto flotante. El resultado final se redondea a 2 decimales con `.toDecimalPlaces(2)`.

Calculadas sobre el **salario mensual** (`sueldoBase`), no sobre el quincenal:

**ISSS:** `min(sueldoBase × 0.03, 30.00)`  
*(tope de $30 cuando sueldoBase > $1,000)*

**AFP:** `sueldoBase × 0.0625`

**ISR** — tramos oficiales Ministerio de Hacienda El Salvador.  
> Los valores fijos de cada tramo ($42.35, $271.09) son constantes publicadas por Hacienda — se usan tal cual, no se derivan del tramo anterior:

| Rango mensual | Fórmula |
|---|---|
| $0.00 – $472.00 | $0.00 |
| $472.01 – $895.24 | (sueldoBase − 472.00) × 0.10 |
| $895.25 – $2,038.10 | 42.35 + (sueldoBase − 895.24) × 0.20 |
| > $2,038.10 | 271.09 + (sueldoBase − 2,038.10) × 0.30 |

#### Flujo de estados

```
BORRADOR → [Aprobar] → APROBADA → [Marcar como pagada] → PAGADA
```

- **BORRADOR** — editable libremente.
- **APROBADA** — solo lectura. Se puede revertir a BORRADOR únicamente desde este estado (la acción `revertirABorrador` rechaza cualquier planilla que no esté en APROBADA). PAGADA es terminal y nunca puede revertirse.
- **PAGADA** — al transicionar: se crean los `ReciboPago` (uno por empleado) con:
  - `montoNeto` = neto del empleado
  - `medioPago` = medio de pago de la planilla
  - `fechaFirma` = fechaPago de la planilla
  - `correlativo` = `RECIBO-AAAA-MM-NNN` generado atómicamente vía `generarCorrelativo(TipoCorrelativo.RECIBO, anio, mes)` (formato zero-padded, e.g. `RECIBO-2026-05-001`)

---

### 3. Recibos PDF

#### Endpoint

`GET /api/recibos/[id]/pdf` — recibe el `ReciboPago.id`, genera y devuelve el PDF en stream.

#### Formato del PDF (react-pdf)

Replica el formato del Centro. Fuente: Helvetica, tamaño carta, márgenes generosos.

```
                        POR  $125.00

RECIBÍ DE PATRONATO DE CENTRO CULTURAL EL MOLINO

LA CANTIDAD DE CIENTO VEINTICINCO CON 00/100 DÓLARES

EN CONCEPTO DE ANTICIPO DE SUELDO DE ABRIL DEL 2026

SANTA ANA, 20 DE ABRIL DE 2026

                                    F. ___________________
                               TOMÁS COLOCHO HERNÁNDEZ

PAGO EN EFECTIVO.
```

**Concepto según quincena:**
- Quincena 1: `ANTICIPO DE SUELDO DE {MES EN MAYÚSCULAS} DEL {AÑO}`
- Quincena 2: `SUELDO SEGUNDA QUINCENA DE {MES EN MAYÚSCULAS} DEL {AÑO}`

**Monto en letras:** se obtiene de `montoEnLetras()` en `src/lib/money.ts`, luego se transforma con `.toUpperCase()` y se inserta la palabra `CON ` antes de la fracción de centavos (`XX/100`). Ejemplo: `"ciento veinticinco 00/100 dólares"` → `"CIENTO VEINTICINCO CON 00/100 DÓLARES"`.

**Medio de pago:** `PAGO EN EFECTIVO` si `medioPago === EFECTIVO`, `PAGO BANCO` si `medioPago === TRANSFERENCIA`.

---

### 4. Navegación

Dos items nuevos en el sidebar principal (fuera del grupo Formación Empresarial):

- **Empleados** — ícono `UserRound`, entre Donantes y Cuentas → `/empleados`
- **Planillas** — ícono `Receipt`, entre Cuentas y Reportes → `/planillas`

---

## Archivos a crear / modificar

### Schema + migración
- `prisma/schema.prisma` — añadir `medioPago MedioPago @default(EFECTIVO)` a `ReciboPago`
- `prisma/migrations/` — nueva migración `add_mediopago_to_recibo_pago`

### Server actions
- `src/server/actions/empleados.ts` — `listarEmpleados`, `crearEmpleado`, `actualizarEmpleado` + Form wrappers
- `src/server/actions/planillas.ts` — `listarPlanillas`, `crearPlanilla`, `obtenerPlanilla`, `actualizarPartida`, `agregarPartida`, `eliminarPartida`, `aplicarDeducciones`, `quitarDeducciones`, `aprobarPlanilla`, `marcarPagada`, `revertirABorrador`

### Validación
- `src/lib/zod-schemas.ts` — añadir `empleadoSchema`, `planillaSchema`, `partidaSchema`

### Lógica de negocio
- `src/lib/planillas/deducciones.ts` — `calcularDeducciones(sueldoBase: Prisma.Decimal): { isss, afp, isr }` usando `Prisma.Decimal` arithmetic
- `src/lib/planillas/totales.ts` — `recalcularTotales(planillaId: string, tx: Prisma.TransactionClient): Promise<void>`

### Pages
- `src/app/(app)/empleados/page.tsx`
- `src/app/(app)/empleados/nuevo/page.tsx`
- `src/app/(app)/empleados/[id]/page.tsx` — página de edición directa (patrón donantes)
- `src/app/(app)/planillas/page.tsx`
- `src/app/(app)/planillas/nueva/page.tsx`
- `src/app/(app)/planillas/[id]/page.tsx`

### Forms / Components
- `src/components/forms/EmpleadoForm.tsx` — client component, crear/editar
- `src/components/forms/PlanillaForm.tsx` — client component, crear planilla
- `src/components/planillas/EmpleadoPartidas.tsx` — sección por empleado con toggle, extras, edición (client)
- `src/components/planillas/AgregarPartidaInline.tsx` — fila inline para extras (client)

### PDF
- `src/lib/planillas/recibo-pdf.tsx` — componente react-pdf
- `src/app/api/recibos/[id]/pdf/route.tsx` — handler GET (`renderToBuffer` + `requireUser()`)

### Modificaciones
- `src/components/ui/nav-links.tsx` — añadir Empleados y Planillas

---

## Patrones técnicos

- `runAction` + `requireUser()` de `src/server/actions/helpers.ts` para todas las mutaciones
- **Serializar `Decimal` → `number`** antes de pasar como prop a cualquier Client Component
- `recalcularTotales` se llama dentro de `prisma.$transaction` en toda acción que muta partidas
- Correlativo: `generarCorrelativo(TipoCorrelativo.RECIBO, anio, mes)` de `src/lib/correlativo.ts`
- Aritmética de deducciones: `Prisma.Decimal` (no JS `number`) para evitar errores de precisión
- Fechas: `Date.UTC()` + `.slice(0,10)` para inputs; `Intl.DateTimeFormat("es-SV")` para display

---

## Verificación (smoke checklist)

1. Crear empleado → aparece en listado con sueldo base correcto
2. Crear planilla 1ª quincena mayo → partidas SUELDO generadas para empleados activos
3. Toggle deducciones en empleado con sueldo $250 → ISSS $7.50, AFP $15.63 (`250 × 0.0625` con Decimal = $15.63), ISR $0 (exento)
4. Editar manualmente AFP a $16.00 → neto actualizado
5. Agregar BONO $50 → extras suma, neto actualizado
6. Aprobar planilla → estado APROBADA, controles desaparecen
7. Marcar como pagada → ReciboPago con correlativo `RECIBO-2026-05-001`, `RECIBO-2026-05-002`
8. Descargar PDF → monto en letras en mayúsculas con "CON", concepto "ANTICIPO DE SUELDO DE MAYO DEL 2026"
9. 2ª quincena mismo mes → concepto "SUELDO SEGUNDA QUINCENA DE MAYO DEL 2026"
10. Planilla duplicada → error visible en formulario
11. Intentar revertir planilla PAGADA → acción rechazada

---

## Estimación

| Bloque | Días |
|---|---|
| Migración + CRUD Empleados | 1.5 |
| Lógica deducciones + totales (lib) | 0.5 |
| Crear planilla + auto-generación partidas | 1 |
| Detalle planilla: toggle, extras, edición in-place | 2.5 |
| Flujo estados + generación ReciboPago | 1 |
| PDF recibo + endpoint | 1 |
| Nav + smoke | 0.5 |
| **Total** | **~8 días hábiles** |
