# Gestión ML — Handoff Document

**Última actualización:** 2026-05-06
**Repo:** https://github.com/dann1103-eng/Gestion_ML
**Producción:** Vercel Pro (URL en dashboard)
**Base de datos:** Supabase Pro (proyecto `mnurqrryjjdyiufuxgtk`)

Este documento es la fuente de verdad para retomar el desarrollo en una sesión nueva. Léelo antes de hacer cambios.

---

## 1. Contexto del proyecto

**Cliente:** Centro Cultural El Molino (Santa Ana, El Salvador), ONG promovida por la Asociación de Fomento Cultural y Deportivo (AFCYD).

**Problema original:** la contabilidad se llevaba en un Excel de 22 hojas (`ML CAJA gestión XXXX.xlsx`) más un bot N8N de Telegram que escribía en Google Sheets. Múltiples fuentes de verdad, datos fragmentados, generación manual de reportes mensuales (caja chica, AFCYD Central), planillas y recibos.

**Solución:** una plataforma web propia que reemplaza Excel + el bot Telegram, centralizando: registro de movimientos, base de donantes, reportes, dashboard, módulo Formación Empresarial (planes Gold/Silver/Bronce), planilla quincenal con recibos PDF, conciliación bancaria, alertas.

**Usuario principal:** Daniel Mancía (admin único por ahora; pre-creado `elmolinoml@gmail.com`).

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind + shadcn-style UI |
| Hosting | Vercel Pro (`iad1` region) |
| Backend de datos | Supabase Pro (Postgres + Auth + Storage) |
| ORM | Prisma 6.x |
| PDFs | `@react-pdf/renderer` (con styles en `src/lib/reportes/pdf-styles.ts`) |
| Auth | Supabase email + password (magic link removido del UI) |
| Validación | Zod schemas en `src/lib/zod-schemas.ts` |
| Forms | React Hook Form (en algunos), useState pattern (en la mayoría) |

**Versiones críticas:** Node 20+, pnpm 10+, Next 15.5+, React 19, Prisma 6.

---

## 3. Estado actual — Specs implementados

### ✅ Spec #1 — Cimientos
- Schema completo de DB (todas las tablas de los 5 specs)
- Auth Supabase con sync a tabla `Usuario` por trigger Postgres
- CRUD Donantes (4 tipos: COOPERADOR, SUPERNUMERARIO, EMPRESA_FE, OCASIONAL) con form condicional
- CRUD Cuentas, Conceptos, Clasificaciones (catálogos editables)
- Form Movimientos con correlativo mensual atómico (`INGR-2026-05-001`)
- Generación automática de fila `MovimientoAfcyd` con snapshot del donante cuando aplica
- Listado con filtros (mes, tipo, cuenta, concepto, donante) + paginación + búsqueda
- Anulación lógica (`anulado=true`) con cascada al espejo AFCYD
- Adjuntos: bucket privado Supabase Storage con signed URLs (TTL 1h), upload directo cliente→Supabase
- Importador Excel CLI con `--dry-run` e idempotencia (`importHash`)
- Seed: ~25 conceptos, 3 planes FE (GOLD/SILVER/BRONCE), 44 conferencias del Anexo II del convenio

### ✅ Spec #2 — Reportes y Dashboard
- Dashboard `/` con 6 widgets: Saldo total, Ingresos mes, Egresos mes (con % vs mes anterior), Saldos por cuenta, Movimientos recientes, Alertas
- Reporte **Caja Chica Mensual** PDF + CSV (agrupado por concepto, con líneas de firma)
- Reporte **AFCYD** PDF + CSV (formato fijo: Fecha · Medio · DUI · Nombre · Monto · Notas · Correo)
- Cierre de mes UI suave (tabla + modal de confirmación, permite reabrir)

### ✅ Spec #3 — Formación Empresarial
- `/convenios` listado + detalle con 4 secciones (datos, sesiones, cobranza, anular)
- `/convenios/nuevo` con auto-cálculo de monto (precio × meses) y sync con `EmpresaDetalle`
- Renovación de convenios (crea nueva versión con `version+1`)
- **Anulación de convenios** (Spec #6.1): soft delete con motivo, cancela sesiones futuras automáticamente
- `/sesiones` lista global filtrable + acciones (Realizada/Cancelar/Eliminar)
- `/sesiones/nueva` permite programar sin abrir un convenio específico
- `/conferencias` catálogo (CRUD admin agrupado por categoría)
- **Cobranza derivada** (`src/lib/convenios/cobranza.ts`): tabla mes × esperado vs recibido por convenio
- **PDF del convenio** (`src/lib/convenios/convenio-pdf.tsx`): texto oficial del .docx del cliente, 3 páginas (cuerpo + Anexo I + Anexo II)
- AlertasWidget lee del Convenio activo (no del campo legacy de EmpresaDetalle)

### ✅ Spec #4 — Planilla y Recibos
- `/planillas` + `/planillas/nueva` + `/planillas/[id]`
- Planilla quincenal con partidas (SUELDO, BONO, HORA_EXTRA, DESCUENTO_ISSS/AFP/ISR/OTRO)
- Cálculo automático de deducciones (`src/lib/planillas/deducciones.ts`)
- Estados BORRADOR → APROBADA → PAGADA (con revertir y eliminar borrador)
- Generación automática de **ReciboPago** al marcar pagada (uno por empleado)
- PDF de planilla (`src/lib/planillas/planilla-pdf.tsx`)
- PDF de recibo individual (`src/lib/planillas/recibo-pdf.tsx`) replicando formato manuscrito original

### ✅ Spec #5 — Reconciliación + Alertas expandidas
- `/conciliacion` con selector de cuenta + mes/año
- Tabla con checkbox por movimiento (optimistic update con `useTransition`)
- 4 tarjetas: Saldo sistema · Saldo banco (input local) · Diferencia · Conciliados (X/Y)
- Botón "Marcar visibles como conciliados"
- Campo `Movimiento.conciliado` añadido al schema
- AlertasWidget extendido con detección de cuotas FE atrasadas (rojo, prioridad alta)

### ✅ Spec #6 — Mejoras post-lanzamiento
- **A — Exportar CSV movimientos** (`/api/movimientos/csv`): respeta los filtros activos
- **B — Historial del donante** en `/donantes/[id]`: stats + tabla completa + bloque cobranza FE si es EMPRESA_FE
- **C — Reporte FE Mensual** PDF + CSV (cobranza del mes + sesiones del mes)
- **D — Resumen Anual** PDF + CSV (estado de resultados por concepto, balance neto)
- **Loading state global**: componente `SubmitButton` con `useFormStatus` + spinner
- **Eliminación / anulación** en convenios, planillas BORRADOR, sesiones no REALIZADAS
- **Login con password** + página `/perfil` para cambiar contraseña
- **Script `pnpm create-user <email> <password>`** (admin via Supabase Auth API)

### ✅ Spec #7 — Resumen mensual con Presupuestos
- Modelos `Presupuesto`, `SaldoAnualInicial`, `NotaMensual` (+ enum `SeccionNota`)
- `/resumen` con matriz Ingresos/Egresos/Saldos (8 cols resumen + 12 mensuales) replicando hoja Resumen del Excel
- Edición inline de presupuesto y saldo año anterior (optimistic update con `useTransition`)
- 6 gráficos con Recharts: tendencia, real vs presupuesto, saldo, composiciones donut, cumplimiento horizontal
- Observaciones mensuales (`NotaMensual` por anio+mes+seccion) con auto-save al blur
- `/presupuestos` para CRUD anual con totales mensual/anual
- Exportación PDF (3 páginas: Ingresos, Egresos, Saldos+Observaciones) y XLSX con valores estáticos
- CLI `pnpm import:presupuesto <ruta.xlsx> --anio YYYY [--dry-run]` con tabla de alias Excel→DB
- Specs futuros relacionados (NO implementados): #8 aporte mensual esperado por donante, #9 vistas Control s/Club, #10 numerarios + automatización FESAL

### ✅ Spec #6.5 — Despliegue a producción
- Repo en GitHub (privado)
- Vercel Pro conectado, auto-deploy desde `main`
- `vercel.json` con `maxDuration: 60s` para endpoints PDF/CSV
- Migrations sincronizadas (las dos hechas con `db push` se materializaron en migration files y se marcaron como aplicadas)
- 195 movimientos del Excel 2026 importados (Ene–May)

---

## 4. Modelo de datos (Prisma)

Modelos críticos en `prisma/schema.prisma`. Aquí lo esencial:

**Auth & catálogos**
- `Usuario`: sync con `auth.users` por trigger Postgres
- `Cuenta` (CAJA_CHICA o BANCO): `saldoInicial`, `activo`, `orden`
- `Concepto`: `tipo` (INGRESO/EGRESO), `generaAfcyd`, `activo`
- `Clasificacion`

**Donantes**
- `Donante`: 4 tipos en enum `TipoDonante`. Campos: nombre, dui, nit, fechaNacimiento, género, profesión, contacto, dirección, `entregaReciboFiscal`, `estado` (ACTIVO/PAUSADO/INACTIVO)
- `EmpresaDetalle` (1:1, solo cuando tipo=EMPRESA_FE): razónSocial, nitEmpresa, nrc, giro, rubro, personería, representanteLegal, planFE, fechas

**Movimientos**
- `Movimiento`: fecha, tipo, conceptoId, clasificacionId?, cuentaId, monto (`Decimal(14,2)`), medioPago, descripción, donanteId?, valeNumero (único), `anulado`, `motivoAnulacion`, `conciliado`, `importHash` (idempotencia importer), createdById/updatedById
- `MovimientoAfcyd` (1:1, espejo con snapshot del donante): correlativo propio, anulado en cascada
- `Adjunto`: storagePath en Supabase, mimeType, tamañoBytes

**Cierre / correlativos**
- `CierreMes`: estado ABIERTO/CERRADO, cerradoPor, cerradoAt
- `Correlativo`: `ON CONFLICT DO UPDATE` atómico. Tipos enum: INGR, EGR, AFCYD, RECIBO

**FE (Spec #3)**
- `Plan`: GOLD ($600/mes, 2h coaching + 2 conferencias), SILVER ($400, 2 conf.), BRONCE ($200, 1 conf.)
- `ConferenciaCatalogo`: 7 categorías × ~40 conferencias (Anexo II del convenio)
- `Convenio`: donanteId, planId, version, fechaFirma/Inicio/Fin, montoTotal, ciudadFirma, **`anulado`**, **`motivoAnulacion`**
- `Sesion`: convenioId, conferenciaId, fecha, modalidad (PRESENCIAL/VIRTUAL/HIBRIDA), ponente, asistentes, estado (PROGRAMADA/REALIZADA/CANCELADA)

**Planilla (Spec #4)**
- `Empleado`: nombre, dui, isss, afp, cargo, sueldoBase, fechaIngreso/Salida, cuentaBanco, activo
- `Planilla`: anio + mes + quincena (unique), fechaInicio/Fin/Pago, medioPago, totales, estado (BORRADOR/APROBADA/PAGADA)
- `PartidaPlanilla`: tipo enum, monto, descripción
- `ReciboPago`: planillaId, empleadoId, montoNeto, medioPago, fechaFirma, urlPdfGenerado, correlativo

**Plantillas**
- `PlantillaDocumento`: tipo (CONVENIO/RECIBO_DONANTE/RECIBO_PAGO), storagePath, version, activa. **No usado actualmente** (los PDFs se generan con react-pdf directamente). Disponible si en el futuro se quiere implementar `docxtemplater`.

---

## 5. Rutas (App Router)

```
src/app/
├── (auth)/
│   └── login/page.tsx            ← email + password (magic link removido)
├── (app)/                        ← layout con sidebar + auth guard
│   ├── page.tsx                  ← Dashboard
│   ├── perfil/page.tsx           ← cambiar contraseña
│   ├── movimientos/{page,nuevo,[id]}.tsx
│   ├── donantes/{page,nuevo,[id]}.tsx
│   ├── empleados/{page,nuevo,[id]}.tsx
│   ├── cuentas/page.tsx
│   ├── planillas/{page,nueva,[id]}.tsx
│   ├── convenios/{page,nuevo,[id],[id]/editar}.tsx
│   ├── sesiones/{page,nueva}.tsx
│   ├── conferencias/page.tsx
│   ├── reportes/page.tsx
│   ├── cierre/page.tsx
│   ├── conciliacion/page.tsx
│   └── catalogos/{conceptos,clasificaciones}/page.tsx
├── api/
│   ├── adjuntos/upload/route.ts
│   ├── auth/{callback,signout}/route.ts
│   ├── movimientos/csv/route.ts
│   ├── reportes/{caja-chica,afcyd,fe-mensual,anual}/route.tsx
│   ├── convenios/[id]/pdf/route.tsx
│   ├── planillas/[id]/pdf/route.tsx
│   └── recibos/[id]/pdf/route.tsx
├── layout.tsx
└── middleware.ts                 ← redirige a /login si no autenticado
```

---

## 6. Convenciones y patrones

### Server Actions
- Mutaciones complejas: `runAction<TInput, TOutput>` wrapper en `src/server/actions/helpers.ts` → input Zod-validated, `requireUser()` + `withAuditContext`, retorno `ActionResult<T>`.
- Mutaciones simples (un ID): function directa con `requireUser()` + `revalidatePath()`.
- **Form action wrappers**: `*Form(formData)` que retorna `Promise<void>` para usar en `<form action={...}>`.

### Audit
- `createdById`, `updatedById` en tablas relevantes
- Prisma Client Extension con `$extends` lee `userId` desde `AsyncLocalStorage` poblado en cada Server Action (`src/lib/audit-extension.ts`)

### Money
- Siempre `Prisma.Decimal` en DB y server-side
- Nunca `Number` para dinero excepto al final del flujo (display)
- Helper `formatMoney(n)` en `src/lib/money.ts`
- Helper `montoEnLetras(n)` para PDFs (recibos)

### Fechas
- `Date.UTC(y, m-1, d)` para construcción
- `Intl.DateTimeFormat("es-SV", { timeZone: "UTC" })` para display
- Sin `date-fns` aunque está instalada

### PDFs
- Componente react-pdf con `Document` + `Page` + `View` + `Text`
- Estilos compartidos en `src/lib/reportes/pdf-styles.ts` (paleta marino + oro, fonts built-in Times-Roman + Helvetica)
- Encabezado institucional consistente: escudo "EM" + razón social + divisor oro
- Endpoints en `src/app/api/.../route.tsx`: `renderToBuffer(<Component />)` → `NextResponse` con headers correctos

### Loading states (anti doble-click)
- **Forms grandes** (`MovimientoForm`, `ConvenioForm`, etc.): `useState` para `pending` + `disabled={pending}` en submit button
- **Inline server actions** (`<form action={async () => {...}}>`): usar `<SubmitButton>` de `src/components/ui/submit-button.tsx` (lee `useFormStatus` automáticamente, soporta `confirm="..."` para confirmación nativa)

### Eliminación vs anulación
- **Soft delete (anular)**: Movimientos, Convenios → conserva auditoría
- **Hard delete (eliminar)**: Planillas en BORRADOR, Sesiones no REALIZADAS

### Identidad visual
- Paleta CSS variables en `src/app/globals.css`:
  - Marino `#1A3550` (sidebar, primary, headings)
  - Oro `#F0AA1C` (acentos, focus, badges)
  - Crema `#FAF4EA` (texto sobre marino)
  - Verde bosque `#1E5C2E` (ingresos)
  - Rojo ladrillo `#B14040` (egresos)
- Tipografía: Lora serif (headings), Nunito sans (body)

---

## 7. Producción

### URLs
- **Repo**: https://github.com/dann1103-eng/Gestion_ML
- **Vercel**: dashboard del proyecto Gestion_ML
- **Supabase**: proyecto `mnurqrryjjdyiufuxgtk` (`https://mnurqrryjjdyiufuxgtk.supabase.co`)

### Variables de entorno (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL          ← pooler (puerto 6543, pgbouncer=true)
DIRECT_URL            ← directa (puerto 5432) para migrations
NEXT_PUBLIC_APP_URL   ← URL de Vercel
SUPABASE_STORAGE_BUCKET_ADJUNTOS=adjuntos
SUPABASE_STORAGE_BUCKET_PLANTILLAS=plantillas
SUPABASE_STORAGE_BUCKET_GENERADOS=generados
```

### Build pipeline
1. Vercel detecta push a `main`
2. `pnpm install` (corre `postinstall: prisma generate`)
3. `pnpm build` que es `prisma generate && prisma migrate deploy && next build`
4. Auto-deploy en ~3 min

### Supabase Auth config
- **Site URL**: `https://[tu-app].vercel.app`
- **Redirect URLs**: `https://[tu-app].vercel.app/**` y `http://localhost:3000/**`

### Usuario admin
- Email: `elmolinoml@gmail.com`
- Password inicial: `Madrid1928` (debería cambiarla desde `/perfil`)
- Crear más con `pnpm create-user <email> <password>`

---

## 8. Workflow de desarrollo

### Hacer cambios

```bash
# 1. Pull cambios remotos primero
git pull

# 2. Hacer cambios localmente, probar con dev server
pnpm dev

# 3. Verificar TypeScript
pnpm typecheck

# 4. Commit + push
git add .
git commit -m "feat: ..."
git push

# Vercel auto-despliega en 2-3 min
```

### Cambios de schema Prisma

```bash
# 1. Editar prisma/schema.prisma

# 2. Crear migration
pnpm prisma:migrate -- --name descripcion_del_cambio
# Esto crea prisma/migrations/<timestamp>_<descripcion>/migration.sql

# 3. Verificar localmente
pnpm typecheck
pnpm dev

# 4. Commit incluyendo schema y migration
git add prisma/
git commit -m "schema: ..."
git push

# Vercel correrá `prisma migrate deploy` automáticamente
```

**⚠️ Importante**: Supabase no soporta shadow DB, así que **no** usar `prisma migrate dev` que requiere shadow. Usar `--create-only` y luego `db push` localmente, o editar el SQL manualmente.

### Crear migration sin shadow DB

```bash
# Si prisma migrate dev falla con error de shadow DB:
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_<descripcion>
# Editar manualmente el migration.sql
# Aplicar con prisma db push
# Marcar como aplicada con prisma migrate resolve --applied <name>
```

---

## 9. Comandos útiles

| Comando | Descripción |
|---|---|
| `pnpm dev` | Dev server con Turbopack |
| `pnpm build` | Build de producción local |
| `pnpm typecheck` | Verificar tipos sin emitir |
| `pnpm prisma:studio` | UI gráfica para ver/editar la DB |
| `pnpm prisma:deploy` | Aplicar migrations pendientes |
| `pnpm db:seed` | Cargar datos iniciales (planes, conferencias, conceptos) |
| `pnpm create-user <email> <password>` | Crear usuario admin |
| `pnpm import:excel <ruta.xlsx> --config <cfg> [--dry-run]` | Importar movimientos del Excel |
| `pnpm import:donantes` | Importar donantes |
| `pnpm import:presupuesto <ruta.xlsx> --anio YYYY [--dry-run]` | Importar presupuesto desde hoja "Presupuesto 2025" del Excel |
| `npx tsx --env-file=.env scripts/import/check-import.ts` | Resumen post-import por mes |

---

## 10. Pendientes / limitaciones conocidas

### 🔴 Funcional
- **Importer no auto-vincula donantes**: el campo "Nombre" del Excel se guarda como `notas`, no como `donanteId`. Las filas AFCYD no se generan automáticamente para los movimientos importados. **Solución pendiente**: script de fuzzy match donantes.
- **Hojas de banco del Excel no importadas**: Davivienda y Dv pro tienen estructura distinta (estado de cuenta), no las cubre el importer actual.
- **No hay confirmación email** en los magic links — si el usuario los reactivara, el redirect URL en Supabase debe estar configurado.
- **`PlantillaDocumento`** existe en schema pero no se usa. Reservada para `docxtemplater` futuro.

### 🟡 UX
- Filtros en tablas (`/movimientos`, `/convenios`) son GET forms simples — no hay autocomplete ni date pickers fancy.
- Sin paginación en `/donantes` (asume <500 donantes).
- Sin búsqueda global (cmd+K).
- Mobile no testeado a fondo (sidebar es desktop-first).

### 🟢 Cosmético
- Algunos warnings de ESLint sobre vars no usadas (no bloquean build).
- LF/CRLF: Windows convierte automáticamente; sin impacto funcional.

### 🔮 Ideas futuras
- **Notificaciones email** (Resend/SendGrid): sesión mañana al ponente, cuota FE atrasada a empresa
- **Calendario visual** de sesiones FE
- **Renovación masiva** de convenios vencidos (selección múltiple)
- **Audit log UI** (los datos están en `createdById`/`updatedById`, falta vista)
- **Dashboard expandido**: widget de cobranza FE total, sesiones de la semana, pipeline de renovaciones
- **Multi-currency** (todo está en USD ahora)
- **Plantillas .docx** con `docxtemplater` (en lugar de react-pdf) cuando el usuario tenga modificaciones complejas en los documentos

---

## 11. Archivos críticos a conocer

### Server-side
- `src/server/actions/helpers.ts` — `runAction` wrapper, `requireUser`, audit context
- `src/lib/auth.ts` — `requireUser()`, `getCurrentUser()`, AsyncLocalStorage
- `src/lib/prisma.ts` — cliente con extensión de audit
- `src/lib/correlativo.ts` — increment atómico
- `src/lib/afcyd.ts` — generación automática de fila espejo

### Lógica de negocio
- `src/lib/convenios/cobranza.ts` — `calcularCobranza` (esperado vs recibido por mes)
- `src/lib/convenios/estado.ts` — `estadoConvenio()` (Vigente/Por vencer/Vencido)
- `src/lib/planillas/deducciones.ts` — cálculo automático ISSS/AFP/ISR
- `src/lib/planillas/totales.ts` — totales bruto/descuentos/neto

### PDFs
- `src/lib/reportes/pdf-styles.ts` — estilos compartidos
- `src/lib/reportes/queries.ts` — datos para todos los reportes
- `src/lib/reportes/csv.ts` — generación CSV con BOM para Excel
- `src/lib/convenios/convenio-pdf.tsx` — convenio con texto oficial del .docx
- `src/lib/planillas/{planilla,recibo}-pdf.tsx`

### Componentes UI clave
- `src/components/ui/submit-button.tsx` — anti doble-click
- `src/components/forms/MovimientoForm.tsx` — form más complejo (referencia)
- `src/components/dashboard/AlertasWidget.tsx` — render de alertas con prioridades
- `src/components/conciliacion/ConciliacionTable.tsx` — optimistic updates

---

## 12. Cómo retomar en una sesión nueva

Cuando inicies un chat nuevo:

1. **Comparte este documento** o pídele al asistente que lo lea: `Read C:\Users\Daniel\Desktop\Gestión ML\docs\HANDOFF.md`
2. **Indica qué quieres hacer**: feature nueva, fix de bug, refactor, etc.
3. **Si es feature nueva grande**: pídele que use el flujo brainstorm → spec → plan → implementación.
4. **Si es fix simple**: ve directo a editar.

### Promptal asistente
> Lee `docs/HANDOFF.md` para entender el contexto del proyecto. Después quiero que [implementes/arregles/refactores] X.

### Si el asistente perdió contexto sobre algo específico
- **DB**: pídele leer `prisma/schema.prisma`
- **Patterns**: pídele leer `src/server/actions/movimientos.ts` (es el más completo)
- **PDFs**: pídele leer `src/lib/reportes/afcyd-pdf.tsx`
- **Estado actual**: corre `pnpm prisma:studio` o `npx tsx --env-file=.env scripts/import/check-import.ts`

---

## 13. Decisiones arquitectónicas que NO debes cambiar sin razón

- **No usar `prisma migrate dev`** en este repo — Supabase no tiene shadow DB. Usar `db push` para dev y migrations manuales para producción.
- **No quitar `connection_limit=1`** del DATABASE_URL — necesario en serverless.
- **No usar `Number` para money** — siempre `Prisma.Decimal`.
- **No usar `<a href="...">` para navegación interna** — siempre `<Link>` (Vercel ESLint lo bloquea).
- **No quitar `&quot;` o caracteres unicode** en strings JSX — `react/no-unescaped-entities` falla en producción.
- **No commitear `.env`** — está en `.gitignore`. Variables van a Vercel via UI.
- **Mantener `revalidatePath()`** después de mutaciones — sin esto, las pantallas no actualizan.
- **No introducir `useEffect` para fetching** — usar Server Components + Server Actions.

---

**Si tienes dudas mientras desarrollas, este documento es la fuente de verdad. Actualízalo cuando hagas cambios significativos para que la próxima sesión tenga contexto correcto.**
