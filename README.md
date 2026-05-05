# Gestión ML — Centro Cultural El Molino

Plataforma contable interna del Centro Cultural El Molino (Santa Ana, El Salvador). Cubre movimientos, donantes, reportes (caja chica, AFCYD, FE mensual, resumen anual), dashboard, Formación Empresarial (convenios + sesiones + cobranza), planillas con recibos PDF, conciliación bancaria y alertas.

## Stack

- **Frontend**: Next.js 15 (App Router) · TypeScript · Tailwind · shadcn-style UI
- **Hosting**: Vercel Pro
- **Backend de datos**: Supabase Pro (Postgres + Auth magic link + Storage)
- **ORM**: Prisma
- **PDFs**: `@react-pdf/renderer`

## Setup local

1. **Requisitos**: Node 20+, pnpm 10+, una base de datos Supabase ya creada.

2. **Instalar dependencias**:
   ```bash
   pnpm install
   ```
   (`postinstall` corre `prisma generate` automáticamente)

3. **Variables de entorno**: copia `.env.example` a `.env` y completa con tus valores reales:
   - URL del proyecto Supabase + anon key + service role key
   - `DATABASE_URL` con pooler (puerto 6543, `pgbouncer=true`)
   - `DIRECT_URL` para migrations (puerto 5432)
   - Buckets de Storage: `adjuntos`, `plantillas`, `generados` (todos privados)

4. **Sincronizar la base de datos**:
   ```bash
   pnpm prisma:deploy
   ```

5. **(Opcional) Sembrar catálogos iniciales** (planes FE, conferencias, conceptos):
   ```bash
   pnpm db:seed
   ```

6. **Arrancar dev server**:
   ```bash
   pnpm dev
   ```
   App en `http://localhost:3000`. Login por magic link al email registrado en Supabase Auth.

## Comandos útiles

| Comando | Descripción |
|---|---|
| `pnpm dev` | Dev server con Turbopack |
| `pnpm build` | Build de producción (incluye `prisma migrate deploy`) |
| `pnpm typecheck` | Verifica tipos sin emitir |
| `pnpm prisma:migrate` | Crea nueva migration en dev |
| `pnpm prisma:deploy` | Aplica migrations pendientes (producción) |
| `pnpm prisma:studio` | Abre Prisma Studio para ver/editar datos |
| `pnpm db:seed` | Carga datos iniciales |
| `pnpm import:excel` | Importa movimientos desde Excel |
| `pnpm test` | Tests unitarios (vitest) |

## Deploy a producción (Vercel)

Push a `main` → Vercel auto-despliega desde GitHub.

**Variables de entorno** se configuran en Vercel → Settings → Environment Variables (mismo set que `.env.example`). El `NEXT_PUBLIC_APP_URL` debe apuntar al dominio de Vercel (o tu dominio personalizado).

**Build**: Vercel ejecuta `pnpm build`, que incluye `prisma generate && prisma migrate deploy`. Las migrations pendientes se aplican automáticamente en cada deploy.

### Cambios de schema en producción

```bash
# 1. Edita prisma/schema.prisma
# 2. Crea la migration
pnpm prisma:migrate -- --name descripcion_del_cambio

# 3. Verifica que se aplicó bien en local
pnpm typecheck

# 4. Commit y push
git add prisma/schema.prisma prisma/migrations/
git commit -m "schema: descripción del cambio"
git push

# Vercel correrá `prisma migrate deploy` automáticamente al desplegar.
```

## Funcionalidades

| Módulo | Descripción |
|---|---|
| **Movimientos** | Ingresos/egresos con correlativo mensual atómico, generación automática de fila AFCYD si aplica, adjuntos drag-drop, anulación con motivo, exportar CSV |
| **Donantes** | 4 tipos: Cooperador, Supernumerario, Empresa FE, Ocasional. Form condicional para Empresa FE. Historial completo en la página de detalle. |
| **Convenios FE** | CRUD + renovación + anulación. Cobranza derivada (esperado vs recibido por mes). PDF del convenio con react-pdf. |
| **Sesiones** | Programar / cancelar / eliminar. Vista global cross-convenio + filtros. Programar desde `/sesiones/nueva` o desde el detalle del convenio. |
| **Conferencias** | Catálogo agrupado por categoría (CRUD admin). |
| **Planillas** | Quincenal, partidas Sueldo/Bono/Descuentos ISSS/AFP/ISR, estados BORRADOR → APROBADA → PAGADA, PDF de planilla y recibos. Eliminar borradores. |
| **Reportes** | Caja Chica Mensual, AFCYD, FE Mensual, Resumen Anual. PDF + CSV. |
| **Dashboard** | KPIs financieros, saldos por cuenta, movimientos recientes, alertas (FE atrasada, convenios por vencer, saldo bajo, sesiones próximas). |
| **Conciliación** | Marcar movimientos como conciliados contra el saldo del banco. |
| **Cierre de mes** | Estado ABIERTO/CERRADO con audit (cerradoPor + cerradoAt). |

## Notas operativas

- **Backups**: Supabase Pro hace backups automáticos diarios (Point-in-Time Recovery disponible).
- **Auth**: magic link a emails registrados en Supabase Auth dashboard. El trigger Postgres `on auth.users insert` sincroniza a la tabla `usuarios`.
- **Storage privado**: bucket `adjuntos` con signed URLs (TTL 1h).
- **Audit**: `createdById` y `updatedById` en todas las tablas relevantes.
- **Anulación vs. eliminación**:
  - Movimientos: soft-delete (`anulado=true`) con motivo.
  - Convenios: soft-delete (`anulado=true`) con motivo, cancela sesiones futuras.
  - Planillas: eliminación física solo en `BORRADOR` (revertir desde APROBADA primero).
  - Sesiones: eliminación física solo si NO está `REALIZADA`.

## Importar histórico desde Excel

```bash
# Dry run primero — reporta filas no parseadas sin tocar la DB
pnpm import:excel "ruta/al/ML CAJA gestión 2026.xlsx" --config scripts/import/config.example.json --dry-run

# Si todo OK, sin --dry-run
pnpm import:excel "ruta/al/ML CAJA gestión 2026.xlsx" --config scripts/import/config.example.json
```

El importador es idempotente (`importHash` único por movimiento) — re-correrlo no duplica datos.

## Estructura del proyecto

```
src/
├── app/
│   ├── (app)/              # rutas autenticadas (sidebar)
│   ├── (auth)/login/       # magic link
│   └── api/                # PDF, CSV, uploads
├── components/             # UI + forms
├── lib/                    # prisma, auth, money, reportes, convenios, planillas
└── server/actions/         # Server Actions (CRUD + state changes)
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```
