import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, COLORS } from "@/lib/reportes/pdf-styles";
import type { DataConvenio } from "./queries";

const MESES_ES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
];

function fechaLargaUTC(d: Date): string {
  return `${d.getUTCDate()} de ${MESES_ES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

const PLAN_LABEL = { GOLD: "Gold", SILVER: "Silver", BRONCE: "Bronce" } as const;

const NUM_LETRAS_DOS_MIL = [
  "", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete",
  "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés",
  "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho",
  "veintinueve", "treinta", "treinta y uno", "treinta y dos", "treinta y tres",
  "treinta y cuatro", "treinta y cinco", "treinta y seis", "treinta y siete",
  "treinta y ocho", "treinta y nueve", "cuarenta", "cuarenta y uno",
  "cuarenta y dos", "cuarenta y tres", "cuarenta y cuatro", "cuarenta y cinco",
  "cuarenta y seis", "cuarenta y siete", "cuarenta y ocho", "cuarenta y nueve",
  "cincuenta",
];

function anioEnLetras(anio: number): string {
  // E.g. 2026 → "veintiséis" (years 2000-2050 supported)
  if (anio >= 2000 && anio <= 2050) {
    return NUM_LETRAS_DOS_MIL[anio - 2000];
  }
  return String(anio);
}

function diaEnLetras(dia: number): string {
  return NUM_LETRAS_DOS_MIL[dia] ?? String(dia);
}

type Props = {
  data: DataConvenio;
  generadoPor: string;
  fechaGeneracion: Date;
};

export function ConvenioPDF({ data, generadoPor, fechaGeneracion }: Props) {
  const { convenio: c, conferenciasPorCategoria } = data;
  const empresa = c.donante;
  const detalle = empresa.empresaDetalle;
  const empresaNombre = (detalle?.razonSocial ?? empresa.nombre).toUpperCase();
  const personeria = detalle?.personeria ?? "";
  const rubro = detalle?.rubro ?? "_____________________";
  const planNombre = PLAN_LABEL[c.plan.tipo];
  const ciudadFirma = c.ciudadFirma ?? "Santa Ana";
  const repLegal = detalle?.representanteLegal ?? "";

  const firmaDate = c.fechaFirma;
  const diaTxt = diaEnLetras(firmaDate.getUTCDate());
  const mesTxt = MESES_ES[firmaDate.getUTCMonth()];
  const anioTxt = anioEnLetras(firmaDate.getUTCFullYear());

  return (
    <Document>
      {/* ── Cuerpo del convenio ─────────────────────────────────────────── */}
      <Page size="LETTER" style={styles.page}>
        <Encabezado />

        <Text style={styles.title}>
          Convenio de Cooperación entre Asociación de Fomento Cultural y Deportivo y {empresaNombre}
        </Text>

        <View style={blockTop}>
          <Text style={parrafo}>
            <Text style={bold}>NOSOTROS:</Text> ASOCIACIÓN DE FOMENTO CULTURAL Y DEPORTIVO, Y{" "}
            {personeria ? <Text>{personeria.toUpperCase()} </Text> : null}
            <Text style={bold}>{empresaNombre}</Text>.
          </Text>
        </View>

        {/* CONSIDERANDO */}
        <Text style={[bold, { marginTop: 12, marginBottom: 4 }]}>CONSIDERANDO:</Text>

        <View style={considerandoRow}>
          <Text style={considerandoNum}>I)</Text>
          <Text style={[parrafo, { flex: 1 }]}>
            Que <Text style={bold}>Club Torre</Text> y <Text style={bold}>Centro Cultural el Molino</Text> son iniciativas promovidas por la Asociación de Fomento Cultural y Deportivo, en la Ciudad de Santa Ana, organización sin fines de lucro, que, acorde a sus estatutos, se dedica a la promoción de la cultura y las virtudes humanas a través de cursos, semanas de estudio, congresos, reuniones, conferencias, etc.
          </Text>
        </View>

        <View style={considerandoRow}>
          <Text style={considerandoNum}>II)</Text>
          <Text style={[parrafo, { flex: 1 }]}>
            Que la empresa <Text style={bold}>{empresaNombre}</Text> es una empresa dedicada al rubro de <Text style={bold}>{rubro}</Text> que vela siempre por el desarrollo personal de los colaboradores que trabajan para la misma.
          </Text>
        </View>

        <View style={considerandoRow}>
          <Text style={considerandoNum}>III)</Text>
          <View style={{ flex: 1 }}>
            <Text style={parrafo}>
              Que Centro Cultural el Molino y Club Torre para potenciar sus actividades tienen un esquema de donantes empresariales de la siguiente manera:
            </Text>
            <View style={{ marginTop: 4, marginLeft: 14 }}>
              <Text style={parrafo}>• Donante <Text style={bold}>Gold</Text> ($600/mes)</Text>
              <Text style={parrafo}>• Donante <Text style={bold}>Silver</Text> ($400/mes)</Text>
              <Text style={parrafo}>• Donante <Text style={bold}>Bronce</Text> ($200/mes)</Text>
            </View>
          </View>
        </View>

        <View style={blockTop}>
          <Text style={parrafo}>
            Acordamos celebrar el siguiente <Text style={bold}>Convenio de Cooperación</Text> entre la Asociación de Fomento Cultural y Deportivo, y <Text style={bold}>{empresaNombre}</Text>, de conformidad a las cláusulas siguientes:
          </Text>
        </View>

        {/* Cláusulas I-VI */}
        <Clausula numero="I." titulo="OBJETO">
          <Text style={parrafo}>
            El objeto del presente convenio es el desarrollo del factor humano de las empresas mediante la formación integral de las personas de forma personalizada utilizando el formato de coaching y conferencias de alto valor.
          </Text>
        </Clausula>

        <Clausula numero="II." titulo="COMPROMISOS DE LAS PARTES">
          <Text style={parrafo}>
            La empresa <Text style={bold}>{empresaNombre}</Text> se compromete por el periodo de un año a suscribirse como Donante <Text style={bold}>{planNombre}</Text>, permitiendo al Club de esta manera continuar con sus actividades de apoyo al crecimiento de jóvenes y sus familias en Santa Ana promoviendo valores que transforman la comunidad. La organización cuenta con más de 30 años de experiencia en formación integral en la ciudad de Santa Ana, beneficiando a muchas generaciones que han sido destinatarias de sus procesos formativos. Por otra parte, el Centro Cultural el Molino se compromete a continuar las acciones formativas que hasta la fecha ejecutan en las instalaciones, siendo un ente de cambio para la sociedad Santaneca.
          </Text>
          <Text style={[parrafo, { marginTop: 6 }]}>
            Además, Centro Cultural el Molino, pondrá a disposición de los donantes, dependiendo del nivel elegido por cada uno, acceso de forma gratuita a su sistema de formación empresarial de la forma detallada en el <Text style={bold}>Anexo I</Text> de este convenio con el contenido incluido en el <Text style={bold}>Anexo II</Text>.
          </Text>
          <Text style={[parrafo, { marginTop: 6 }]}>
            En caso que Centro Cultural el Molino, promueva conferencias extraordinarias mediante charlistas invitados nacionales o extranjeros, los donantes tendrán acceso preferencial a los espacios disponibles y un descuento proporcional sobre el valor del derecho de acceso de las conferencias de la siguiente manera:
          </Text>
          <View style={{ marginTop: 4, marginLeft: 14 }}>
            <Text style={parrafo}>— Donante <Text style={bold}>Gold</Text>: 15%</Text>
            <Text style={parrafo}>— Donante <Text style={bold}>Silver</Text>: 10%</Text>
            <Text style={parrafo}>— Donante <Text style={bold}>Bronce</Text>: 5%</Text>
          </View>
        </Clausula>

        <Clausula numero="III." titulo="MODIFICACIONES AL ACUERDO">
          <Text style={parrafo}>
            Las modificaciones realizadas a este convenio deberán constar por escrito, por medio de una adenda firmada por ambas partes que formará parte del presente acuerdo.
          </Text>
        </Clausula>

        <Clausula numero="IV." titulo="VIGENCIA DEL ACUERDO">
          <Text style={parrafo}>
            El plazo del convenio es por <Text style={bold}>UN AÑO</Text>, contado a partir del día <Text style={bold}>{fechaLargaUTC(c.fechaInicio)}</Text> y con vencimiento el día <Text style={bold}>{fechaLargaUTC(c.fechaFin)}</Text>. El acuerdo podrá prorrogarse mediante cruce de cartas, con al menos treinta días de anticipación a la finalización del plazo establecido, en el cual las partes manifiestan su deseo de renovar o de no renovar el acuerdo.
          </Text>
        </Clausula>

        <Clausula numero="V." titulo="TERMINACIÓN DEL ACUERDO">
          <Text style={parrafo}>
            Las partes podrán dar por terminado el presente acuerdo por las siguientes causas: a) Por incumplimiento de cualquiera de las partes a las obligaciones consignadas en este instrumento; b) Por mutuo acuerdo de las partes.
          </Text>
        </Clausula>

        <Clausula numero="VI." titulo="RESOLUCIÓN DE CONFLICTOS">
          <Text style={parrafo}>
            Toda controversia que surja con motivo de la aplicación, interpretación o cumplimiento del presente acuerdo, se deberá dirimir amigablemente por trato directo entre las partes en un plazo de treinta días.
          </Text>
          <Text style={[parrafo, { marginTop: 6 }]}>
            El presente convenio de Cooperación estará vigente en el plazo establecido siempre y cuando no concurran las causales de terminación.
          </Text>
        </Clausula>

        {c.notas ? (
          <View style={blockTop}>
            <Text style={[parrafo, { fontStyle: "italic" }]}>
              <Text style={bold}>Notas:</Text> {c.notas}
            </Text>
          </View>
        ) : null}

        <View style={[blockTop, { marginTop: 14 }]}>
          <Text style={parrafo}>
            En fe de lo cual, otorgamos el presente convenio en dos ejemplares originales, en la ciudad de <Text style={bold}>{ciudadFirma}</Text> a los <Text style={bold}>{diaTxt}</Text> días del mes de <Text style={bold}>{mesTxt}</Text> del dos mil <Text style={bold}>{anioTxt}</Text>.
          </Text>
        </View>

        {/* Bloques de firma */}
        <View style={firmasGrid}>
          <BloqueFirma rol="Representante de la Asociación" nombre="" />
          <BloqueFirma rol="Representante de la Empresa" nombre={repLegal} />
        </View>

        <Footer generadoPor={generadoPor} fechaGeneracion={fechaGeneracion} />
      </Page>

      {/* ── ANEXO I — Beneficio de los donantes ──────────────────────────── */}
      <Page size="LETTER" style={styles.page}>
        <Encabezado />

        <Text style={styles.title}>Anexo I — Beneficio de los Donantes</Text>
        <Text style={styles.subtitle}>{empresaNombre} · Plan {planNombre}</Text>

        <View style={styles.subgroupHeader}>
          <Text style={styles.subgroupText}>Categorías de Donante</Text>
        </View>

        <View style={anexoBlock}>
          <Text style={parrafo}>
            <Text style={bold}>Donante Gold</Text> ($600/mes): incluye 2 horas de coaching personal mensual + 2 conferencias mensuales.
          </Text>
          <Text style={[parrafo, { marginTop: 4 }]}>
            <Text style={bold}>Donante Silver</Text> ($400/mes): incluye 2 conferencias mensuales.
          </Text>
          <Text style={[parrafo, { marginTop: 4 }]}>
            <Text style={bold}>Donante Bronce</Text> ($200/mes): incluye 1 conferencia mensual.
          </Text>
        </View>

        <View style={[styles.subgroupHeader, { marginTop: 14 }]}>
          <Text style={styles.subgroupText}>Incluye</Text>
        </View>

        <View style={anexoBlock}>
          <Text style={parrafo}>
            <Text style={bold}>Extras para donantes Silver y Gold:</Text> acceso a algunos salones y equipos de El Molino (bocinas, micrófonos, sillas, mesas), sujetos a disponibilidad y restricciones.
          </Text>
          <Text style={[parrafo, { marginTop: 6 }]}>
            <Text style={bold}>Coffee Break:</Text> servicio disponible con un monto adicional de $5 por persona.
          </Text>
          <Text style={[parrafo, { marginTop: 6 }]}>
            <Text style={bold}>Banco de contactos:</Text> posibilidad de acceso a una red de personas recomendadas de El Molino para contrataciones, según requerimientos.
          </Text>
          <Text style={[parrafo, { marginTop: 6 }]}>
            <Text style={bold}>Conferencias personalizadas:</Text> el donante puede optar por impartir una de las conferencias que le corresponden en el mes en la institución educativa de sus hijos, en su casa para un grupo de amistades, o en El Molino, para padres de compañeros de sus hijos, amigos o parientes. En el caso de varones, la conferencia puede dirigirse a ellos y sus amigos, con la variedad de temas de «The Mark». Esta opción es ideal para profesionales independientes o pequeños empresarios, y está sujeta a restricciones (debe realizarse en Santa Ana, con un límite de 20 participantes, entre otras).
          </Text>
        </View>

        <Footer generadoPor={generadoPor} fechaGeneracion={fechaGeneracion} />
      </Page>

      {/* ── ANEXO II — Algunos temas disponibles ─────────────────────────── */}
      <Page size="LETTER" style={styles.page}>
        <Encabezado />

        <Text style={styles.title}>Anexo II — Algunos Temas Disponibles</Text>
        <Text style={styles.subtitle}>Catálogo de conferencias por categoría</Text>

        {conferenciasPorCategoria.map(({ categoria, items }, i) => (
          <View key={i} wrap={false} style={{ marginBottom: 10 }}>
            <View style={styles.subgroupHeader}>
              <Text style={styles.subgroupText}>{categoria}</Text>
            </View>
            <View style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
              {items.map((conf, j) => (
                <Text key={j} style={[parrafo, { marginBottom: 1 }]}>
                  • {conf.titulo}
                </Text>
              ))}
            </View>
          </View>
        ))}

        <Footer generadoPor={generadoPor} fechaGeneracion={fechaGeneracion} />
      </Page>
    </Document>
  );
}

function Encabezado() {
  return (
    <>
      <View style={styles.brandRow}>
        <View style={styles.shield}>
          <Text style={styles.shieldText}>EM</Text>
        </View>
        <View>
          <Text style={styles.brandText}>Centro Cultural El Molino</Text>
          <Text style={styles.brandTagline}>AFCYD · Santa Ana, El Salvador</Text>
        </View>
      </View>
      <View style={styles.goldDivider} />
    </>
  );
}

function Clausula({
  numero,
  titulo,
  children,
}: {
  numero: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <View style={clausulaBlock} wrap={false}>
      <Text style={[bold, { marginBottom: 4, fontSize: 10.5 }]}>
        {numero}  {titulo}
      </Text>
      {children}
    </View>
  );
}

function BloqueFirma({ rol, nombre }: { rol: string; nombre: string }) {
  return (
    <View style={firmaCol}>
      <Text style={firmaCampo}>Nombre: <Text style={bold}>{nombre || "_______________________________"}</Text></Text>
      <Text style={firmaCampo}>Cargo: _______________________________</Text>
      <Text style={firmaCampo}>DUI: _______________________________</Text>
      <View style={firmaLineaBox}>
        <Text style={firmaLineaTexto}>Firma</Text>
      </View>
      <Text style={firmaRol}>{rol}</Text>
    </View>
  );
}

function Footer({
  generadoPor,
  fechaGeneracion,
}: {
  generadoPor: string;
  fechaGeneracion: Date;
}) {
  const fmt = new Intl.DateTimeFormat("es-SV", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <View style={styles.footer} fixed>
      <Text>Generado por {generadoPor} · {fmt.format(fechaGeneracion)}</Text>
      <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

// ── Estilos locales ──────────────────────────────────────────────────────────

const parrafo = {
  fontSize: 10,
  lineHeight: 1.45,
  color: COLORS.ink,
  textAlign: "justify" as const,
};

const bold = {
  fontFamily: "Helvetica-Bold",
  fontSize: 10,
  color: COLORS.navy,
};

const blockTop = {
  marginTop: 8,
  marginBottom: 4,
};

const clausulaBlock = {
  marginTop: 10,
  marginBottom: 4,
};

const considerandoRow = {
  flexDirection: "row" as const,
  marginTop: 6,
  paddingLeft: 4,
};

const considerandoNum = {
  width: 26,
  fontSize: 10,
  fontFamily: "Helvetica-Bold",
  color: COLORS.navy,
};

const anexoBlock = {
  marginTop: 8,
  paddingHorizontal: 4,
};

const firmasGrid = {
  flexDirection: "row" as const,
  marginTop: 30,
  gap: 24,
};

const firmaCol = {
  flex: 1,
  paddingHorizontal: 4,
};

const firmaCampo = {
  fontSize: 9,
  color: COLORS.ink,
  marginBottom: 6,
};

const firmaLineaBox = {
  borderTopWidth: 0.8,
  borderColor: COLORS.navy,
  marginTop: 28,
  paddingTop: 4,
};

const firmaLineaTexto = {
  fontSize: 8,
  color: COLORS.muted,
  textAlign: "center" as const,
  textTransform: "uppercase" as const,
  letterSpacing: 0.6,
};

const firmaRol = {
  fontSize: 9,
  color: COLORS.navy,
  fontFamily: "Helvetica-Bold",
  textAlign: "center" as const,
  marginTop: 4,
};
