-- AlterTable
ALTER TABLE "planillas" ADD COLUMN "medioPago" "MedioPago" NOT NULL DEFAULT 'EFECTIVO';

-- AlterTable
ALTER TABLE "recibos_pago" ADD COLUMN "medioPago" "MedioPago" NOT NULL DEFAULT 'EFECTIVO';
