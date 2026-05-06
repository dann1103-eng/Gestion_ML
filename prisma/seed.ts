/**
 * Seed inicial con datos extraídos del Excel ML CAJA gestión 2024.xlsx
 * y del Convenio FE (Anexo II).
 *
 * Idempotente: usa upsert por nombre/código.
 */
import { PrismaClient, TipoMovimiento, TipoCuenta, TipoPlan } from "@prisma/client";

const prisma = new PrismaClient();

// ----------------------------------------
// Conceptos detectados en el Excel 2024
// ----------------------------------------
const CONCEPTOS_INGRESO: { nombre: string; generaAfcyd: boolean }[] = [
  { nombre: "Pensiones n", generaAfcyd: false },
  { nombre: "Pensiones rs externos", generaAfcyd: false },
  { nombre: "Subvención cr", generaAfcyd: false },
  { nombre: "Patronato de gestión", generaAfcyd: false },
  { nombre: "Donaciones de cooperadores", generaAfcyd: true },
  { nombre: "Donaciones de supernumerarios", generaAfcyd: true },
  { nombre: "Donaciones de empresas FE", generaAfcyd: true },
  { nombre: "Actividades Club", generaAfcyd: false },
  { nombre: "Actividades sg", generaAfcyd: false },
  { nombre: "Actividades Universitarios", generaAfcyd: false },
  { nombre: "Otros ingresos", generaAfcyd: false },
];

const CONCEPTOS_EGRESO: string[] = [
  "Administración",
  "Sueldos residencia",
  "Aporte patronal AFCYD",
  "Electricidad",
  "Agua",
  "Teléfono",
  "Alcaldía municipal",
  "Arreglos y mantenimiento",
  "Mantenimiento extraordinario",
  "Seguro del edificio",
  "Alquiler AFCYD",
  "Vigilancia",
  "Actividades Club",
  "Actividades sg",
  "Actividades Universitarios",
  "Préstamos",
  "Pensión a FESAL",
  "Otros egresos",
];

const CLASIFICACIONES: string[] = [
  "Plan de viernes",
  "Actividades universitarios",
  "Actividades club",
  "Mantenimiento",
  "Servicios básicos",
  "Personal",
  "Formación empresarial",
  "Otros",
];

// ----------------------------------------
// Cuentas iniciales
// ----------------------------------------
const CUENTAS = [
  { nombre: "Caja Chica", tipo: TipoCuenta.CAJA_CHICA, orden: 0 },
  {
    nombre: "Davivienda Cuenta Corriente",
    tipo: TipoCuenta.BANCO,
    banco: "Davivienda",
    orden: 1,
  },
  {
    nombre: "Davivienda Pro",
    tipo: TipoCuenta.BANCO,
    banco: "Davivienda",
    orden: 2,
  },
];

// ----------------------------------------
// Planes Formación Empresarial (Anexo I del Convenio)
// ----------------------------------------
const PLANES = [
  {
    tipo: TipoPlan.GOLD,
    nombre: "Donante Gold",
    precio: 600,
    cantidadConferencias: 2,
    horasCoaching: 2,
    descuentoExtras: 15,
  },
  {
    tipo: TipoPlan.SILVER,
    nombre: "Donante Silver",
    precio: 400,
    cantidadConferencias: 2,
    horasCoaching: 0,
    descuentoExtras: 10,
  },
  {
    tipo: TipoPlan.BRONCE,
    nombre: "Donante Bronce",
    precio: 200,
    cantidadConferencias: 1,
    horasCoaching: 0,
    descuentoExtras: 5,
  },
];

// ----------------------------------------
// Conferencias (Anexo II del Convenio)
// 7 categorías × ~40 conferencias
// ----------------------------------------
const CONFERENCIAS: { categoria: string; titulo: string }[] = [
  // Cultura Organizacional
  { categoria: "Cultura Organizacional", titulo: "Empatía en el trabajo" },
  { categoria: "Cultura Organizacional", titulo: "Trabajo en equipo" },
  { categoria: "Cultura Organizacional", titulo: "Amistad y compañerismo" },
  { categoria: "Cultura Organizacional", titulo: "Esfuerzo para alcanzar objetivos" },
  { categoria: "Cultura Organizacional", titulo: "El poder del servicio" },
  { categoria: "Cultura Organizacional", titulo: "El valor del compromiso" },
  { categoria: "Cultura Organizacional", titulo: "Comunicación efectiva" },
  { categoria: "Cultura Organizacional", titulo: "Solidaridad en el trabajo" },

  // Trabajo Óptimo
  { categoria: "Trabajo Óptimo", titulo: "Técnicas para optimizar el tiempo" },
  { categoria: "Trabajo Óptimo", titulo: "Ideales en el trabajo" },
  { categoria: "Trabajo Óptimo", titulo: "Paciencia para formar hábitos" },
  { categoria: "Trabajo Óptimo", titulo: "Reframing y atención plena" },
  { categoria: "Trabajo Óptimo", titulo: "Concentración en el trabajo" },
  { categoria: "Trabajo Óptimo", titulo: "Preparación de un plan para forjar virtudes" },

  // Mejora Personal
  { categoria: "Mejora Personal", titulo: "Establecer metas para el futuro" },
  { categoria: "Mejora Personal", titulo: "¿Cómo hacer un plan de lecturas y formación?" },
  { categoria: "Mejora Personal", titulo: "Urbanidad y elegancia" },
  { categoria: "Mejora Personal", titulo: "Autoconocimiento: ¿cómo me influye la opinión de los demás?" },
  { categoria: "Mejora Personal", titulo: "Talento: descubrir y desarrollar lo que sé hacer" },
  { categoria: "Mejora Personal", titulo: "Los hábitos de la gente altamente efectiva" },
  { categoria: "Mejora Personal", titulo: "Taller de etiqueta en la mesa" },
  { categoria: "Mejora Personal", titulo: "Taller de small talk" },

  // Dieta Digital
  { categoria: "Dieta Digital", titulo: "Autocontrol con las pantallas" },
  { categoria: "Dieta Digital", titulo: "Plan de detox digital" },
  { categoria: "Dieta Digital", titulo: "Hijos y videojuegos" },
  { categoria: "Dieta Digital", titulo: "Los riesgos de la pornografía" },

  // Pensamiento Crítico
  { categoria: "Pensamiento Crítico", titulo: "Libertad y responsabilidad" },
  { categoria: "Pensamiento Crítico", titulo: "Fomentar el pensamiento crítico" },
  { categoria: "Pensamiento Crítico", titulo: "Dignidad y respeto" },
  { categoria: "Pensamiento Crítico", titulo: "Un sentido trascendente del trabajo" },
  { categoria: "Pensamiento Crítico", titulo: "Hombres y mujeres: dos modos de enriquecer el entorno laboral" },

  // Ética y Responsabilidad Social
  { categoria: "Ética y Responsabilidad Social", titulo: "El bien común en la empresa" },
  { categoria: "Ética y Responsabilidad Social", titulo: "Integridad: independencia frente al grupo" },
  { categoria: "Ética y Responsabilidad Social", titulo: "Responsabilidad social externa" },
  { categoria: "Ética y Responsabilidad Social", titulo: "Ayudar sin sustituir" },
  { categoria: "Ética y Responsabilidad Social", titulo: "Una sociedad solidaria" },

  // Hogar y Familia
  { categoria: "Hogar y Familia", titulo: "Equilibrio entre trabajo y familia" },
  { categoria: "Hogar y Familia", titulo: "Hijos adolescentes y salidas nocturnas" },
  { categoria: "Hogar y Familia", titulo: "Tener una relación sana con los bienes materiales" },
  { categoria: "Hogar y Familia", titulo: "Cada hijo es diferente" },
  { categoria: "Hogar y Familia", titulo: "Finanzas familiares 1: ¿Cómo hacer un presupuesto?" },
  { categoria: "Hogar y Familia", titulo: "Finanzas familiares 2: La metodología de los sobres" },
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);

async function main() {
  console.log("⏳ Seed iniciando...");

  // Conceptos
  let i = 0;
  for (const c of CONCEPTOS_INGRESO) {
    await prisma.concepto.upsert({
      where: { nombre: c.nombre },
      create: {
        nombre: c.nombre,
        tipo: TipoMovimiento.INGRESO,
        generaAfcyd: c.generaAfcyd,
        orden: i++,
      },
      update: { generaAfcyd: c.generaAfcyd },
    });
  }
  i = 0;
  for (const nombre of CONCEPTOS_EGRESO) {
    await prisma.concepto.upsert({
      where: { nombre },
      create: { nombre, tipo: TipoMovimiento.EGRESO, orden: i++ },
      update: {},
    });
  }
  console.log(`✓ Conceptos: ${CONCEPTOS_INGRESO.length + CONCEPTOS_EGRESO.length}`);

  // Clasificaciones
  i = 0;
  for (const nombre of CLASIFICACIONES) {
    await prisma.clasificacion.upsert({
      where: { nombre },
      create: { nombre, orden: i++ },
      update: {},
    });
  }
  console.log(`✓ Clasificaciones: ${CLASIFICACIONES.length}`);

  // Cuentas
  for (const c of CUENTAS) {
    await prisma.cuenta.upsert({
      where: { id: `seed-${slug(c.nombre)}` },
      create: { id: `seed-${slug(c.nombre)}`, ...c },
      update: {},
    });
  }
  console.log(`✓ Cuentas: ${CUENTAS.length}`);

  // Planes FE
  for (const p of PLANES) {
    await prisma.plan.upsert({
      where: { tipo: p.tipo },
      create: p,
      update: { precio: p.precio, cantidadConferencias: p.cantidadConferencias, horasCoaching: p.horasCoaching, descuentoExtras: p.descuentoExtras },
    });
  }
  console.log(`✓ Planes FE: ${PLANES.length}`);

  // Conferencias
  for (const conf of CONFERENCIAS) {
    const codigo = slug(`${conf.categoria.slice(0, 3)}-${conf.titulo}`);
    await prisma.conferenciaCatalogo.upsert({
      where: { codigo },
      create: {
        codigo,
        titulo: conf.titulo,
        categoria: conf.categoria,
      },
      update: {},
    });
  }
  console.log(`✓ Conferencias: ${CONFERENCIAS.length}`);

  console.log("✅ Seed completo");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
