-- Permitir mismo nombre de concepto en INGRESO y EGRESO (ej. "Actividades Club")
-- 1) Quitar unique en nombre, crear unique compuesto (nombre, tipo)
ALTER TABLE "conceptos" DROP CONSTRAINT IF EXISTS "conceptos_nombre_key";
CREATE UNIQUE INDEX IF NOT EXISTS "conceptos_nombre_tipo_key" ON "conceptos" ("nombre", "tipo");

-- 2) Insertar versiones EGRESO de los conceptos compartidos.
--    Se hace UPSERT manual: si ya existe (nombre, tipo=EGRESO), no insertamos.
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

-- 3) Reasignar movimientos EGRESO que apuntan al concepto INGRESO compartido,
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

-- 4) Inversamente: movimientos INGRESO que apuntan a un concepto EGRESO con el mismo nombre,
--    reasignarlos al INGRESO. (Caso menos probable pero mejor cubrirlo)
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
