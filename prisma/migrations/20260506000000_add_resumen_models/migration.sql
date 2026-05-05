-- CreateEnum
CREATE TYPE "SeccionNota" AS ENUM ('INGRESOS', 'EGRESOS');

-- CreateTable
CREATE TABLE "presupuestos" (
    "id" TEXT NOT NULL,
    "conceptoId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "montoMensual" DECIMAL(14,2) NOT NULL,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,
    CONSTRAINT "presupuestos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saldos_anuales_iniciales" (
    "anio" INTEGER NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,
    CONSTRAINT "saldos_anuales_iniciales_pkey" PRIMARY KEY ("anio")
);

-- CreateTable
CREATE TABLE "notas_mensuales" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "seccion" "SeccionNota" NOT NULL,
    "texto" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,
    CONSTRAINT "notas_mensuales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "presupuestos_conceptoId_anio_key" ON "presupuestos"("conceptoId", "anio");
CREATE INDEX "presupuestos_anio_idx" ON "presupuestos"("anio");

-- CreateIndex
CREATE UNIQUE INDEX "notas_mensuales_anio_mes_seccion_key" ON "notas_mensuales"("anio", "mes", "seccion");
CREATE INDEX "notas_mensuales_anio_mes_idx" ON "notas_mensuales"("anio", "mes");

-- AddForeignKey
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_conceptoId_fkey" FOREIGN KEY ("conceptoId") REFERENCES "conceptos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
