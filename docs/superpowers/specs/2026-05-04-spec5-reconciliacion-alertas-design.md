# Spec #5 — Reconciliación Bancaria + Alertas Expandidas

**Fecha:** 2026-05-04  
**Proyecto:** Gestión ML — Centro Cultural El Molino  
**Estado:** Aprobado por usuario

---

## Contexto

Specs 1–4 completos: movimientos, donantes, reportes, dashboard, Formación Empresarial, planilla y recibos. La plataforma centraliza ya toda la contabilidad. Quedan dos brechas operativas:

1. **Reconciliación bancaria**: El equipo revisa semanalmente que los movimientos registrados en el sistema coincidan con lo que muestra el banco online (Davivienda CC y Dv Pro). Actualmente este proceso es manual sin soporte en la app — se detectan movimientos faltantes, montos incorrectos y diferencias de saldo sin trazabilidad.

2. **Alertas incompletas**: El `AlertasWidget` del dashboard existe pero no detecta cuotas FE atrasadas (la principal fuente de ingresos del Centro). Las alertas existentes (convenio por vencer, saldo bajo, sesión mañana) se mantienen.

---

## Decisiones de diseño

| Tema | Decisión |
|---|---|
| Formato estados de cuenta | Manual — el usuario ingresa transacciones a mano, no hay importación de CSV/PDF |
| Frecuencia de conciliación | Semanal — revisa en la app del banco y marca en el sistema |
| Tipo de problemas a detectar | Los tres: movimiento faltante, monto incorrecto, saldo diferente |
| Enfoque reconciliación | Flag `conciliado` en `Movimiento` + entrada manual del saldo banco → diferencia en tiempo real |
| Nueva tabla de BD | No — solo un campo booleano en `Movimiento` |
| Alertas FE | Detectar cuota mensual no pagada usando la lógica de cobranza existente (Spec #3) |
| UI alertas | Expandir el `AlertasWidget` del dashboard (sin página dedicada) |

---

## Alcance funcional

### 1. Página `/conciliacion`

**Header con filtros:**
- Selector de cuenta (Davivienda CC, Dv Pro, Caja Chica Principal, etc. — todas las cuentas activas)
- Selector mes/año (default: mes actual)

**Panel de estadísticas (4 tarjetas):**
- `Saldo sistema` — suma de movimientos de la cuenta en el período (read-only, calculado)
- `Saldo banco` — campo de entrada numérico libre (el usuario ingresa el saldo real del banco)
- `Diferencia` — `saldo banco - saldo sistema`, verde si $0.00, rojo si distinto
- `Conciliados` — "X / Y movimientos"

**Tabla de movimientos:**
- Columnas: checkbox | Fecha | Vale | Concepto | Descripción | Monto (coloreado +/-) | Badge Estado (Conciliado / Pendiente)
- Filas alternas, ordenadas por fecha descendente
- El checkbox llama a `toggleConciliado(id, !actual)` — optimistic update inmediato
- Badge "Conciliado" (verde) o "Pendiente" (amarillo) según el campo

**Acciones bulk:**
- Botón "Marcar visibles como conciliados" — llama a `marcarLoteConciliados(ids[])` con todos los IDs visibles en la tabla actual

**Comportamiento:**
- El saldo banco se guarda solo en estado local del cliente (no persiste en BD) — es un campo de trabajo temporal para la sesión de reconciliación
- La diferencia se recalcula en tiempo real al cambiar el saldo banco o marcar/desmarcar movimientos
- Si diferencia = $0 → mensaje "✅ Todo cuadra" en verde
- Si diferencia ≠ $0 → "⚠ Diferencia de $ X.XX — revisa los movimientos pendientes" en rojo

**Estado vacío:** Si no hay movimientos para la cuenta/período seleccionados, mostrar las 4 tarjetas de stats con valores en cero y una fila vacía en la tabla con el texto "No hay movimientos para esta cuenta en el período seleccionado".

**Nav:** Añadir ítem "Conciliación" (ícono `GitMerge`) en sidebar entre "Cierre de mes" y "Conceptos".

---

### 2. AlertasWidget expandido

**Nuevas alertas (FE atrasadas):**

"Convenio activo" se define como `where: { fechaFin: { gte: new Date() } }` — no existe campo `activo` en el modelo `Convenio`.

Para cada convenio activo, calcula si el mes anterior tiene `recibido < esperado`. La lógica reutiliza `calcularCobranza` de `src/lib/convenios/cobranza.ts` (llamada via `cobranzaConvenio(convenioId)` en `src/server/actions/convenios.ts`). Si hay déficit en algún mes pasado:
- Severidad: **rojo** (crítica)
- Texto: `"FE atrasada — [Razón Social]"` + subtexto con mes y monto pendiente
- Ordenadas al tope del widget, antes de alertas amarillas

**Alertas existentes que se mantienen:**
- Convenio por vencer ≤ 30 días (amarillo)
- Saldo bajo en cualquier cuenta (amarillo) — umbral fijo $500
- Sesión FE programada mañana (marino/info)

**Orden de prioridad en el widget:**
1. FE atrasadas (rojo) — múltiples posibles, una por empresa
2. Convenios por vencer (amarillo)
3. Saldo bajo (amarillo)
4. Sesiones mañana (marino)

**Badge de conteo** en el header del widget refleja el total de alertas activas.

**Tipo `Alerta` — extensión requerida:** El tipo existente en `dashboard.ts` es `type Alerta = { tipo: "saldo-bajo" | "convenio-vence" | "sesion-proxima"; ... }`. Se debe añadir `"fe-atrasada"` al union. El mapa de íconos en `AlertasWidget.tsx` (objeto `ICONO` con una entrada por `tipo`) debe incluir la entrada `"fe-atrasada": CircleAlert` (o `AlertCircle`) de lucide-react.

**Cambio en query del dashboard:** La función `obtenerAlertas()` en `dashboard.ts` (o `alertas.ts`) pasa a incluir la query de cuotas FE atrasadas, ejecutada en paralelo con las demás mediante `Promise.all`.

---

## Cambios de schema

```prisma
model Movimiento {
  // ... campos existentes ...
  conciliado        Boolean   @default(false)   // NUEVO
}
```

Una migración `prisma db push` aplica el cambio sin romper datos existentes (default false).

---

## Archivos a crear / modificar

**Nuevo:**
- `src/app/(app)/conciliacion/page.tsx` — página principal (Server Component con filtros); llama directamente a `obtenerMovimientosConciliacion` como función async plain (no Server Action)
- `src/components/conciliacion/ConciliacionTable.tsx` — tabla con checkboxes (Client Component)
- `src/server/actions/conciliacion.ts` — solo las mutaciones: `toggleConciliado`, `marcarLoteConciliados` (ambas con `"use server"` y `revalidatePath("/conciliacion")`)
- `src/lib/conciliacion/queries.ts` — `obtenerMovimientosConciliacion(cuentaId, anio, mes)`: función async plain (sin `"use server"`), usada solo desde Server Components

**Modificar:**
- `prisma/schema.prisma` — añadir campo `conciliado` a `Movimiento`
- `src/server/actions/dashboard.ts` — añadir `alertasFEAtrasadas()` al `Promise.all`
- `src/components/dashboard/AlertasWidget.tsx` — renderizar alertas FE (nueva sección roja)
- `src/components/ui/nav-links.tsx` — añadir ítem Conciliación

---

## Patrones técnicos

- **`toggleConciliado`**: Server Action que llama `prisma.movimiento.update({ where: { id }, data: { conciliado } })` + `revalidatePath("/conciliacion")`. No necesita transacción.
- **`marcarLoteConciliados`**: `prisma.movimiento.updateMany({ where: { id: { in: ids } }, data: { conciliado: true } })`.
- **Saldo banco**: Estado local React (`useState`), no persiste en BD. Diferencia calculada con `sueldoSistema - saldoBanco` en el cliente.
- **Alertas FE**: Reutiliza `calcularCobranza` de `src/lib/convenios/cobranza.ts` vía `cobranzaConvenio(convenioId)`. Filtra convenios con `fechaFin >= new Date()`, luego por cada convenio calcula la cobranza y busca filas con `mes < mesActual` y `recibido < esperado`. Se ejecuta con `Promise.all` junto a las otras queries del dashboard.
- **Optimistic update**: El checkbox marca visualmente de inmediato (sin esperar el server round-trip). Si el server falla, `useTransition` lo revierte.
- **Audit**: `conciliado` no necesita auditoría de usuario (no es un cambio financiero, es una marca operativa).

---

## Verificación

**Smoke manual (checklist):**
1. Login → `/conciliacion` → seleccionar Davivienda CC, Mayo 2026
2. Verificar que aparecen los movimientos de esa cuenta en ese mes
3. Marcar 3 movimientos como conciliados → badge "Conciliados" actualiza
4. Ingresar saldo banco → diferencia aparece en rojo/verde correctamente
5. Diferencia = $0 → mensaje "✅ Todo cuadra"
6. Botón "Marcar visibles" → todos los de la página quedan conciliados
7. Dashboard → AlertasWidget muestra alertas FE atrasadas si existe convenio con cuota impaga
8. Navegar a un convenio → cobranza muestra el mes atrasado
9. Registrar pago FE → alerta desaparece al refrescar dashboard
10. Nav sidebar muestra "Conciliación" en la posición correcta

---

## Estimación

A 4-6 hrs/día:

| Bloque | Días |
|---|---|
| Schema + `prisma db push` | 0.25 |
| Server actions conciliación | 0.5 |
| Página `/conciliacion` + tabla con checkboxes | 1.5 |
| Query alertas FE + `AlertasWidget` expandido | 1 |
| Nav update + smoke testing | 0.25 |
| **Total Spec #5** | **~3.5 días hábiles** |
