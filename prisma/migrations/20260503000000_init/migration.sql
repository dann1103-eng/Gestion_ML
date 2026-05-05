-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('INGRESO', 'EGRESO');
CREATE TYPE "TipoCuenta" AS ENUM ('CAJA_CHICA', 'BANCO');
CREATE TYPE "TipoDonante" AS ENUM ('COOPERADOR', 'SUPERNUMERARIO', 'EMPRESA_FE', 'OCASIONAL');
CREATE TYPE "EstadoDonante" AS ENUM ('ACTIVO', 'PAUSADO', 'INACTIVO');
CREATE TYPE "Genero" AS ENUM ('M', 'F', 'OTRO');
CREATE TYPE "MedioPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'TARJETA', 'REMESA', 'OTRO');
CREATE TYPE "EstadoCierre" AS ENUM ('ABIERTO', 'CERRADO');
CREATE TYPE "TipoCorrelativo" AS ENUM ('INGR', 'EGR', 'AFCYD', 'RECIBO');
CREATE TYPE "ModalidadSesion" AS ENUM ('PRESENCIAL', 'VIRTUAL', 'HIBRIDA');
CREATE TYPE "EstadoSesion" AS ENUM ('PROGRAMADA', 'REALIZADA', 'CANCELADA');
CREATE TYPE "TipoPlan" AS ENUM ('GOLD', 'SILVER', 'BRONCE');
CREATE TYPE "TipoPartida" AS ENUM ('SUELDO', 'BONO', 'HORA_EXTRA', 'DESCUENTO_ISSS', 'DESCUENTO_AFP', 'DESCUENTO_ISR', 'DESCUENTO_OTRO');
CREATE TYPE "EstadoPlanilla" AS ENUM ('BORRADOR', 'APROBADA', 'PAGADA');
CREATE TYPE "TipoPlantilla" AS ENUM ('CONVENIO', 'RECIBO_DONANTE', 'RECIBO_PAGO', 'OTRO');

-- Usuarios (id matches Supabase auth.users.id)
CREATE TABLE "usuarios" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- Conceptos
CREATE TABLE "conceptos" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "tipo" "TipoMovimiento" NOT NULL,
  "generaAfcyd" BOOLEAN NOT NULL DEFAULT false,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "conceptos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "conceptos_nombre_key" ON "conceptos"("nombre");
CREATE INDEX "conceptos_tipo_activo_idx" ON "conceptos"("tipo", "activo");

-- Clasificaciones
CREATE TABLE "clasificaciones" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "orden" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "clasificaciones_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "clasificaciones_nombre_key" ON "clasificaciones"("nombre");

-- Cuentas
CREATE TABLE "cuentas" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "tipo" "TipoCuenta" NOT NULL,
  "banco" TEXT,
  "numeroCuenta" TEXT,
  "saldoInicial" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "fechaSaldoIni" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cuentas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cuentas_tipo_activo_idx" ON "cuentas"("tipo", "activo");

-- Donantes
CREATE TABLE "donantes" (
  "id" TEXT NOT NULL,
  "tipo" "TipoDonante" NOT NULL,
  "nombre" TEXT NOT NULL,
  "dui" TEXT,
  "nit" TEXT,
  "fechaNacimiento" TIMESTAMP(3),
  "genero" "Genero",
  "profesion" TEXT,
  "telefonoPrincipal" TEXT,
  "telefonoSecundario" TEXT,
  "correo" TEXT,
  "direccion" TEXT,
  "ciudad" TEXT,
  "departamento" TEXT,
  "entregaReciboFiscal" BOOLEAN NOT NULL DEFAULT false,
  "estado" "EstadoDonante" NOT NULL DEFAULT 'ACTIVO',
  "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fechaBaja" TIMESTAMP(3),
  "notas" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdById" UUID,
  "updatedById" UUID,
  CONSTRAINT "donantes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "donantes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios"("id") ON DELETE SET NULL,
  CONSTRAINT "donantes_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "usuarios"("id") ON DELETE SET NULL
);
CREATE INDEX "donantes_tipo_estado_idx" ON "donantes"("tipo", "estado");
CREATE INDEX "donantes_dui_idx" ON "donantes"("dui");
CREATE INDEX "donantes_nit_idx" ON "donantes"("nit");
CREATE INDEX "donantes_nombre_idx" ON "donantes"("nombre");

-- Empresa Detalle
CREATE TABLE "empresa_detalle" (
  "id" TEXT NOT NULL,
  "donanteId" TEXT NOT NULL,
  "razonSocial" TEXT,
  "nitEmpresa" TEXT,
  "nrc" TEXT,
  "giro" TEXT,
  "rubro" TEXT,
  "personeria" TEXT,
  "representanteLegal" TEXT,
  "planFE" "TipoPlan",
  "fechaInicioConvenio" TIMESTAMP(3),
  "fechaVencimientoConvenio" TIMESTAMP(3),
  "notas" TEXT,
  CONSTRAINT "empresa_detalle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "empresa_detalle_donanteId_fkey" FOREIGN KEY ("donanteId") REFERENCES "donantes"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "empresa_detalle_donanteId_key" ON "empresa_detalle"("donanteId");

-- Movimientos
CREATE TABLE "movimientos" (
  "id" TEXT NOT NULL,
  "fecha" TIMESTAMP(3) NOT NULL,
  "tipo" "TipoMovimiento" NOT NULL,
  "conceptoId" TEXT NOT NULL,
  "clasificacionId" TEXT,
  "cuentaId" TEXT NOT NULL,
  "monto" DECIMAL(14,2) NOT NULL,
  "medioPago" "MedioPago" NOT NULL DEFAULT 'EFECTIVO',
  "descripcion" TEXT NOT NULL,
  "donanteId" TEXT,
  "valeNumero" TEXT NOT NULL,
  "notas" TEXT,
  "anulado" BOOLEAN NOT NULL DEFAULT false,
  "motivoAnulacion" TEXT,
  "importHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdById" UUID,
  "updatedById" UUID,
  CONSTRAINT "movimientos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "movimientos_conceptoId_fkey" FOREIGN KEY ("conceptoId") REFERENCES "conceptos"("id"),
  CONSTRAINT "movimientos_clasificacionId_fkey" FOREIGN KEY ("clasificacionId") REFERENCES "clasificaciones"("id"),
  CONSTRAINT "movimientos_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "cuentas"("id"),
  CONSTRAINT "movimientos_donanteId_fkey" FOREIGN KEY ("donanteId") REFERENCES "donantes"("id"),
  CONSTRAINT "movimientos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios"("id") ON DELETE SET NULL,
  CONSTRAINT "movimientos_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "usuarios"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "movimientos_valeNumero_key" ON "movimientos"("valeNumero");
CREATE UNIQUE INDEX "movimientos_importHash_key" ON "movimientos"("importHash");
CREATE INDEX "movimientos_fecha_idx" ON "movimientos"("fecha");
CREATE INDEX "movimientos_tipo_fecha_idx" ON "movimientos"("tipo", "fecha");
CREATE INDEX "movimientos_cuentaId_fecha_idx" ON "movimientos"("cuentaId", "fecha");
CREATE INDEX "movimientos_donanteId_idx" ON "movimientos"("donanteId");
CREATE INDEX "movimientos_conceptoId_idx" ON "movimientos"("conceptoId");
CREATE INDEX "movimientos_anulado_idx" ON "movimientos"("anulado");

-- Movimientos AFCYD
CREATE TABLE "movimientos_afcyd" (
  "id" TEXT NOT NULL,
  "movimientoId" TEXT NOT NULL,
  "fecha" TIMESTAMP(3) NOT NULL,
  "donanteId" TEXT NOT NULL,
  "monto" DECIMAL(14,2) NOT NULL,
  "medio" "MedioPago" NOT NULL,
  "notas" TEXT,
  "snapshotDui" TEXT,
  "snapshotNombre" TEXT NOT NULL,
  "snapshotCorreo" TEXT,
  "snapshotNit" TEXT,
  "correlativo" TEXT NOT NULL,
  "anulado" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "movimientos_afcyd_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "movimientos_afcyd_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "movimientos"("id") ON DELETE CASCADE,
  CONSTRAINT "movimientos_afcyd_donanteId_fkey" FOREIGN KEY ("donanteId") REFERENCES "donantes"("id")
);
CREATE UNIQUE INDEX "movimientos_afcyd_movimientoId_key" ON "movimientos_afcyd"("movimientoId");
CREATE UNIQUE INDEX "movimientos_afcyd_correlativo_key" ON "movimientos_afcyd"("correlativo");
CREATE INDEX "movimientos_afcyd_fecha_idx" ON "movimientos_afcyd"("fecha");
CREATE INDEX "movimientos_afcyd_donanteId_idx" ON "movimientos_afcyd"("donanteId");
CREATE INDEX "movimientos_afcyd_anulado_idx" ON "movimientos_afcyd"("anulado");

-- Adjuntos
CREATE TABLE "adjuntos" (
  "id" TEXT NOT NULL,
  "movimientoId" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "nombreOriginal" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "tamanoBytes" INTEGER NOT NULL,
  "uploadedById" UUID,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "adjuntos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "adjuntos_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "movimientos"("id") ON DELETE CASCADE,
  CONSTRAINT "adjuntos_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "usuarios"("id") ON DELETE SET NULL
);
CREATE INDEX "adjuntos_movimientoId_idx" ON "adjuntos"("movimientoId");

-- Cierres mes
CREATE TABLE "cierres_mes" (
  "id" TEXT NOT NULL,
  "mes" INTEGER NOT NULL,
  "anio" INTEGER NOT NULL,
  "estado" "EstadoCierre" NOT NULL DEFAULT 'ABIERTO',
  "cerradoPorId" UUID,
  "cerradoAt" TIMESTAMP(3),
  "notas" TEXT,
  CONSTRAINT "cierres_mes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cierres_mes_cerradoPorId_fkey" FOREIGN KEY ("cerradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "cierres_mes_mes_anio_key" ON "cierres_mes"("mes", "anio");

-- Correlativos
CREATE TABLE "correlativos" (
  "id" TEXT NOT NULL,
  "tipo" "TipoCorrelativo" NOT NULL,
  "anio" INTEGER NOT NULL,
  "mes" INTEGER NOT NULL,
  "ultimoNumero" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "correlativos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "correlativos_tipo_anio_mes_key" ON "correlativos"("tipo", "anio", "mes");

-- Planes FE
CREATE TABLE "planes" (
  "id" TEXT NOT NULL,
  "tipo" "TipoPlan" NOT NULL,
  "nombre" TEXT NOT NULL,
  "precio" DECIMAL(14,2) NOT NULL,
  "cantidadConferencias" INTEGER NOT NULL,
  "horasCoaching" INTEGER NOT NULL DEFAULT 0,
  "descuentoExtras" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "vigente" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "planes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "planes_tipo_key" ON "planes"("tipo");

-- Conferencias catálogo
CREATE TABLE "conferencias_catalogo" (
  "id" TEXT NOT NULL,
  "codigo" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "descripcion" TEXT,
  "duracionMin" INTEGER NOT NULL DEFAULT 60,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conferencias_catalogo_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "conferencias_catalogo_codigo_key" ON "conferencias_catalogo"("codigo");
CREATE INDEX "conferencias_catalogo_categoria_activo_idx" ON "conferencias_catalogo"("categoria", "activo");

-- Convenios
CREATE TABLE "convenios" (
  "id" TEXT NOT NULL,
  "donanteId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "fechaFirma" TIMESTAMP(3) NOT NULL,
  "fechaInicio" TIMESTAMP(3) NOT NULL,
  "fechaFin" TIMESTAMP(3) NOT NULL,
  "montoTotal" DECIMAL(14,2) NOT NULL,
  "ciudadFirma" TEXT,
  "urlDocxGenerado" TEXT,
  "urlPdfGenerado" TEXT,
  "notas" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "convenios_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "convenios_donanteId_fkey" FOREIGN KEY ("donanteId") REFERENCES "donantes"("id"),
  CONSTRAINT "convenios_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planes"("id")
);
CREATE INDEX "convenios_donanteId_idx" ON "convenios"("donanteId");
CREATE INDEX "convenios_fechaFin_idx" ON "convenios"("fechaFin");

-- Sesiones
CREATE TABLE "sesiones" (
  "id" TEXT NOT NULL,
  "convenioId" TEXT NOT NULL,
  "conferenciaId" TEXT NOT NULL,
  "fecha" TIMESTAMP(3) NOT NULL,
  "modalidad" "ModalidadSesion" NOT NULL,
  "ponente" TEXT,
  "asistentes" INTEGER NOT NULL DEFAULT 0,
  "estado" "EstadoSesion" NOT NULL DEFAULT 'PROGRAMADA',
  "notas" TEXT,
  CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sesiones_convenioId_fkey" FOREIGN KEY ("convenioId") REFERENCES "convenios"("id"),
  CONSTRAINT "sesiones_conferenciaId_fkey" FOREIGN KEY ("conferenciaId") REFERENCES "conferencias_catalogo"("id")
);
CREATE INDEX "sesiones_convenioId_fecha_idx" ON "sesiones"("convenioId", "fecha");
CREATE INDEX "sesiones_fecha_estado_idx" ON "sesiones"("fecha", "estado");

-- Empleados
CREATE TABLE "empleados" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "dui" TEXT,
  "nit" TEXT,
  "isss" TEXT,
  "afp" TEXT,
  "cargo" TEXT,
  "sueldoBase" DECIMAL(14,2) NOT NULL,
  "fechaIngreso" TIMESTAMP(3) NOT NULL,
  "fechaSalida" TIMESTAMP(3),
  "cuentaBanco" TEXT,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "empleados_dui_key" ON "empleados"("dui");

-- Planillas
CREATE TABLE "planillas" (
  "id" TEXT NOT NULL,
  "anio" INTEGER NOT NULL,
  "mes" INTEGER NOT NULL,
  "quincena" INTEGER NOT NULL,
  "fechaInicio" TIMESTAMP(3) NOT NULL,
  "fechaFin" TIMESTAMP(3) NOT NULL,
  "fechaPago" TIMESTAMP(3) NOT NULL,
  "totalBruto" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalDescuentos" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalNeto" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "estado" "EstadoPlanilla" NOT NULL DEFAULT 'BORRADOR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "planillas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "planillas_anio_mes_quincena_key" ON "planillas"("anio", "mes", "quincena");

-- Partidas planilla
CREATE TABLE "partidas_planilla" (
  "id" TEXT NOT NULL,
  "planillaId" TEXT NOT NULL,
  "empleadoId" TEXT NOT NULL,
  "tipo" "TipoPartida" NOT NULL,
  "monto" DECIMAL(14,2) NOT NULL,
  "descripcion" TEXT,
  CONSTRAINT "partidas_planilla_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "partidas_planilla_planillaId_fkey" FOREIGN KEY ("planillaId") REFERENCES "planillas"("id") ON DELETE CASCADE,
  CONSTRAINT "partidas_planilla_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id")
);
CREATE INDEX "partidas_planilla_planillaId_empleadoId_idx" ON "partidas_planilla"("planillaId", "empleadoId");

-- Recibos pago
CREATE TABLE "recibos_pago" (
  "id" TEXT NOT NULL,
  "planillaId" TEXT NOT NULL,
  "empleadoId" TEXT NOT NULL,
  "montoNeto" DECIMAL(14,2) NOT NULL,
  "fechaFirma" TIMESTAMP(3),
  "urlPdfGenerado" TEXT,
  "correlativo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recibos_pago_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recibos_pago_planillaId_fkey" FOREIGN KEY ("planillaId") REFERENCES "planillas"("id"),
  CONSTRAINT "recibos_pago_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id")
);
CREATE UNIQUE INDEX "recibos_pago_correlativo_key" ON "recibos_pago"("correlativo");
CREATE INDEX "recibos_pago_planillaId_empleadoId_idx" ON "recibos_pago"("planillaId", "empleadoId");

-- Plantillas documento
CREATE TABLE "plantillas_documento" (
  "id" TEXT NOT NULL,
  "tipo" "TipoPlantilla" NOT NULL,
  "nombre" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "activa" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "plantillas_documento_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "plantillas_documento_tipo_version_key" ON "plantillas_documento"("tipo", "version");
