import { z } from "zod";
import {
  TipoMovimiento,
  TipoCuenta,
  TipoDonante,
  EstadoDonante,
  Genero,
  MedioPago,
  TipoPlan,
  ModalidadSesion,
  EstadoSesion,
  TipoPartida,
  EstadoPlanilla,
  SeccionNota,
} from "@prisma/client";

// ----------------------------------------
// Helpers comunes
// ----------------------------------------

/** Preprocesa "" / null / undefined a null antes de aplicar el schema interno. */
const opt = <T extends z.ZodTypeAny>(inner: T) =>
  z.preprocess(
    (v) => {
      if (v == null) return null;
      if (typeof v === "string" && v.trim() === "") return null;
      return v;
    },
    inner.nullable().optional(),
  ) as unknown as z.ZodOptional<z.ZodNullable<T>>;

const stringOrNull = opt(z.string().trim());

const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, "Monto inválido")
  .refine((v) => Number(v) > 0, "Debe ser mayor que cero");

// DUI: 8 dígitos - 1 dígito
const duiSchema = opt(z.string().regex(/^\d{8}-\d$/, "DUI debe tener formato 12345678-9"));

// NIT: homologado (12345678-9) o tradicional (XXXX-XXXXXX-XXX-X)
const nitSchema = opt(
  z
    .string()
    .regex(
      /^(\d{8}-\d|\d{4}-\d{6}-\d{3}-\d)$/,
      "NIT debe ser 12345678-9 (homologado) o XXXX-XXXXXX-XXX-X",
    ),
);

const correoOpt = opt(z.string().email("Correo inválido"));
const fechaOpt = opt(z.coerce.date());

// ----------------------------------------
// CUENTA
// ----------------------------------------
export const cuentaSchema = z.object({
  nombre: z.string().min(2, "Nombre requerido"),
  tipo: z.nativeEnum(TipoCuenta),
  banco: stringOrNull,
  numeroCuenta: stringOrNull,
  saldoInicial: z
    .string()
    .regex(/^-?\d+(\.\d{1,2})?$/, "Saldo inválido")
    .default("0"),
  fechaSaldoIni: fechaOpt,
  activo: z.coerce.boolean().default(true),
  orden: z.coerce.number().int().default(0),
});
export type CuentaInput = z.input<typeof cuentaSchema>;

// ----------------------------------------
// CONCEPTO
// ----------------------------------------
export const conceptoSchema = z.object({
  nombre: z.string().min(2, "Nombre requerido"),
  tipo: z.nativeEnum(TipoMovimiento),
  generaAfcyd: z.coerce.boolean().default(false),
  activo: z.coerce.boolean().default(true),
  orden: z.coerce.number().int().default(0),
});
export type ConceptoInput = z.input<typeof conceptoSchema>;

// ----------------------------------------
// CLASIFICACIÓN
// ----------------------------------------
export const clasificacionSchema = z.object({
  nombre: z.string().min(2, "Nombre requerido"),
  activo: z.coerce.boolean().default(true),
  orden: z.coerce.number().int().default(0),
});
export type ClasificacionInput = z.input<typeof clasificacionSchema>;

// ----------------------------------------
// DONANTE
// ----------------------------------------
const donanteBaseSchema = z.object({
  tipo: z.nativeEnum(TipoDonante),
  nombre: z.string().min(2, "Nombre requerido"),
  dui: duiSchema,
  nit: nitSchema,
  fechaNacimiento: fechaOpt,
  genero: opt(z.nativeEnum(Genero)),
  profesion: stringOrNull,
  telefonoPrincipal: stringOrNull,
  telefonoSecundario: stringOrNull,
  correo: correoOpt,
  direccion: stringOrNull,
  ciudad: stringOrNull,
  departamento: stringOrNull,
  entregaReciboFiscal: z.coerce.boolean().default(false),
  estado: z.nativeEnum(EstadoDonante).default(EstadoDonante.ACTIVO),
  notas: stringOrNull,
  aporteMensualEsperado: opt(
    z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/, "Monto inválido"),
  ),
});

const empresaDetalleSchema = z.object({
  razonSocial: stringOrNull,
  nitEmpresa: nitSchema,
  nrc: stringOrNull,
  giro: stringOrNull,
  rubro: stringOrNull,
  personeria: stringOrNull,
  representanteLegal: stringOrNull,
  planFE: opt(z.nativeEnum(TipoPlan)),
  fechaInicioConvenio: fechaOpt,
  fechaVencimientoConvenio: fechaOpt,
});

export const donanteSchema = donanteBaseSchema.merge(empresaDetalleSchema).superRefine((v, ctx) => {
  if (v.tipo === TipoDonante.EMPRESA_FE) {
    if (!v.razonSocial && !v.nombre) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["razonSocial"],
        message: "Razón social requerida para empresas",
      });
    }
    if (!v.planFE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["planFE"],
        message: "Plan FE requerido",
      });
    }
  }
});
export type DonanteInput = z.input<typeof donanteSchema>;

// ----------------------------------------
// MOVIMIENTO
// ----------------------------------------
export const movimientoSchema = z.object({
  fecha: z.coerce.date(),
  tipo: z.nativeEnum(TipoMovimiento),
  conceptoId: z.string().min(1, "Concepto requerido"),
  clasificacionId: opt(z.string()),
  cuentaId: z.string().min(1, "Cuenta requerida"),
  monto: decimalString,
  medioPago: z.nativeEnum(MedioPago).default(MedioPago.EFECTIVO),
  descripcion: z.string().min(2, "Descripción requerida"),
  donanteId: opt(z.string()),
  notas: stringOrNull,
});
export type MovimientoInput = z.input<typeof movimientoSchema>;

export const anularMovimientoSchema = z.object({
  motivoAnulacion: z.string().min(5, "Motivo requerido (mín 5 caracteres)"),
});

// ----------------------------------------
// CONVENIO FE
// ----------------------------------------
export const convenioSchema = z
  .object({
    donanteId: z.string().min(1, "Empresa requerida"),
    planTipo: z.nativeEnum(TipoPlan),
    fechaFirma: z.coerce.date(),
    fechaInicio: z.coerce.date(),
    fechaFin: z.coerce.date(),
    ciudadFirma: stringOrNull,
    montoTotal: decimalString,
    notas: stringOrNull,
  })
  .superRefine((v, ctx) => {
    if (v.fechaFin <= v.fechaInicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fechaFin"],
        message: "Fecha fin debe ser posterior a fecha inicio",
      });
    }
  });
export type ConvenioInput = z.input<typeof convenioSchema>;

// ----------------------------------------
// SESIÓN FE
// ----------------------------------------
export const sesionSchema = z.object({
  convenioId: z.string().min(1, "Convenio requerido"),
  conferenciaId: z.string().min(1, "Conferencia requerida"),
  fecha: z.coerce.date(),
  modalidad: z.nativeEnum(ModalidadSesion).default(ModalidadSesion.PRESENCIAL),
  ponente: stringOrNull,
  asistentes: z.coerce.number().int().min(0).default(0),
  estado: z.nativeEnum(EstadoSesion).default(EstadoSesion.PROGRAMADA),
  notas: stringOrNull,
});
export type SesionInput = z.input<typeof sesionSchema>;

// ----------------------------------------
// CONFERENCIA (catálogo)
// ----------------------------------------
export const conferenciaSchema = z.object({
  titulo: z.string().min(2, "Título requerido"),
  categoria: z.string().min(2, "Categoría requerida"),
  descripcion: stringOrNull,
  duracionMin: z.coerce.number().int().min(15).max(480).default(60),
  activo: z.coerce.boolean().default(true),
});
export type ConferenciaInput = z.input<typeof conferenciaSchema>;

// ----------------------------------------
// EMPLEADO
// ----------------------------------------
export const empleadoSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  dui: duiSchema,
  nit: nitSchema,
  isss: opt(z.string().trim()),
  afp: opt(z.string().trim()),
  cargo: opt(z.string().trim()),
  sueldoBase: decimalString,
  fechaIngreso: z.coerce.date(),
  fechaSalida: fechaOpt,
  cuentaBanco: opt(z.string().trim()),
  activo: z.coerce.boolean().default(true),
});
export type EmpleadoInput = z.infer<typeof empleadoSchema>;

// ----------------------------------------
// PLANILLA
// ----------------------------------------
export const planillaSchema = z.object({
  anio: z.coerce.number().int().min(2020).max(2099),
  mes: z.coerce.number().int().min(1).max(12),
  quincena: z.coerce.number().int().min(1).max(2),
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date(),
  fechaPago: z.coerce.date(),
  medioPago: z.nativeEnum(MedioPago).default(MedioPago.EFECTIVO),
});
export type PlanillaInput = z.infer<typeof planillaSchema>;

// ----------------------------------------
// PARTIDA
// ----------------------------------------
export const partidaSchema = z.object({
  tipo: z.nativeEnum(TipoPartida),
  monto: decimalString,
  descripcion: opt(z.string().trim()),
});
export type PartidaInput = z.infer<typeof partidaSchema>;

// ----------------------------------------
// PRESUPUESTO / SALDO ANUAL / NOTA MENSUAL (Spec #7)
// ----------------------------------------
const decimalCualquiera = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, "Monto inválido");

export const presupuestoSchema = z.object({
  conceptoId: z.string().min(1),
  anio: z.coerce.number().int().min(2000).max(2100),
  montoMensual: decimalCualquiera,
  notas: stringOrNull,
});
export type PresupuestoInput = z.input<typeof presupuestoSchema>;

export const saldoAnualInicialSchema = z.object({
  anio: z.coerce.number().int().min(2000).max(2100),
  monto: decimalCualquiera,
});
export type SaldoAnualInicialInput = z.input<typeof saldoAnualInicialSchema>;

export const notaMensualSchema = z.object({
  anio: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
  seccion: z.nativeEnum(SeccionNota),
  texto: z.string().default(""),
});
export type NotaMensualInput = z.input<typeof notaMensualSchema>;
