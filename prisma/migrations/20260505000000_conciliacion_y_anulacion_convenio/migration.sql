-- Spec #5: Reconciliación bancaria — campo conciliado en movimientos
ALTER TABLE "movimientos" ADD COLUMN IF NOT EXISTS "conciliado" BOOLEAN NOT NULL DEFAULT false;

-- Spec #6: Anulación de convenios FE
ALTER TABLE "convenios" ADD COLUMN IF NOT EXISTS "anulado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "convenios" ADD COLUMN IF NOT EXISTS "motivoAnulacion" TEXT;
