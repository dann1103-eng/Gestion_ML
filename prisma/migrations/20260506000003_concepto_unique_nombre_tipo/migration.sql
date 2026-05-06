-- Permitir mismo nombre de concepto en INGRESO y EGRESO (ej. "Actividades Club")
-- 1) Quitar el unique index de "nombre" (Prisma @unique crea INDEX, no CONSTRAINT)
DROP INDEX IF EXISTS "conceptos_nombre_key";

-- 2) Crear unique compuesto (nombre, tipo)
CREATE UNIQUE INDEX IF NOT EXISTS "conceptos_nombre_tipo_key" ON "conceptos" ("nombre", "tipo");

-- 3) Insertar versiones EGRESO de los conceptos compartidos en el Excel.
--    Sólo si todavía no existe la versión EGRESO con ese nombre.
INSERT INTO "conceptos" ("id", "nombre", "tipo", "generaAfcyd", "activo", "orden", "createdAt", "updatedAt")
SELECT
  'cseed_' || md5("nombre" || '_egreso'),
  "nombre",
  'EGRESO'::"TipoMovimiento",
  false,
  true,
  COALESCE("orden", 0),
  NOW(),
  NOW()
FROM "conceptos" c
WHERE c."tipo" = 'INGRESO'
  AND c."nombre" IN ('Actividades Club', 'Actividades sg', 'Actividades Universitarios')
  AND NOT EXISTS (
    SELECT 1 FROM "conceptos" c2
    WHERE c2."nombre" = c."nombre" AND c2."tipo" = 'EGRESO'
  );

-- 4) Reasignar movimientos EGRESO que apuntan al concepto INGRESO compartido
--    al nuevo concepto EGRESO con el mismo nombre.
UPDATE "movimientos" m
SET "conceptoId" = (
  SELECT cnew."id"
  FROM "conceptos" cold
  JOIN "conceptos" cnew ON cnew."nombre" = cold."nombre" AND cnew."tipo" = 'EGRESO'
  WHERE cold."id" = m."conceptoId" AND cold."tipo" = 'INGRESO'
  LIMIT 1
)
WHERE m."tipo" = 'EGRESO'
  AND m."conceptoId" IN (
    SELECT "id" FROM "conceptos"
    WHERE "tipo" = 'INGRESO'
      AND "nombre" IN ('Actividades Club', 'Actividades sg', 'Actividades Universitarios')
  );

-- 5) Inversamente: movimientos INGRESO apuntando a un concepto EGRESO compartido
--    se reasignan al INGRESO. (Cubrir caso simétrico.)
UPDATE "movimientos" m
SET "conceptoId" = (
  SELECT cnew."id"
  FROM "conceptos" cold
  JOIN "conceptos" cnew ON cnew."nombre" = cold."nombre" AND cnew."tipo" = 'INGRESO'
  WHERE cold."id" = m."conceptoId" AND cold."tipo" = 'EGRESO'
  LIMIT 1
)
WHERE m."tipo" = 'INGRESO'
  AND m."conceptoId" IN (
    SELECT "id" FROM "conceptos"
    WHERE "tipo" = 'EGRESO'
      AND "nombre" IN ('Actividades Club', 'Actividades sg', 'Actividades Universitarios')
  );
