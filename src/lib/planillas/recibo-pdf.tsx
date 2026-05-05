import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { MedioPago } from "@prisma/client";
import { montoEnLetras } from "@/lib/money";
import { Prisma } from "@prisma/client";

const MESES_ES = [
  "","ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
  "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE",
];

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 12,
    color: "#0B1C2B",
    paddingVertical: 80,
    paddingHorizontal: 70,
  },
  por: {
    fontSize: 11,
    textAlign: "right",
    marginBottom: 32,
  },
  porMonto: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
  },
  line: {
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 1.5,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  lugar: {
    marginTop: 28,
    marginBottom: 40,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  firma: {
    textAlign: "right",
    fontSize: 12,
  },
  firmaLine: {
    textAlign: "right",
    borderTopWidth: 0.8,
    borderColor: "#0B1C2B",
    paddingTop: 4,
    marginTop: 2,
    fontSize: 11,
  },
  pago: {
    marginTop: 24,
    fontSize: 12,
  },
});

function formatMontoLetras(monto: Prisma.Decimal): string {
  // montoEnLetras returns e.g. "ciento veinticinco 00/100 dólares"
  // We split into bold part ("CIENTO VEINTICINCO CON 00/100") and plain "DÓLARES"
  const raw = montoEnLetras(monto);
  const withCon = raw.replace(/(\d{2}\/100)/, "CON $1");
  return withCon.toUpperCase();
}

function splitMontoLetras(monto: Prisma.Decimal): { bold: string; plain: string } {
  const full = formatMontoLetras(monto);
  // Strip trailing " DÓLARES" so we can render it as plain text after the bold portion
  const m = full.match(/^(.+?)\s+(DÓLARES?|D[OÓ]LARES?)\s*$/i);
  if (m) return { bold: m[1].trim(), plain: m[2].trim() };
  return { bold: full, plain: "" };
}

function concepto(mes: number, anio: number, quincena: number): string {
  if (quincena === 1) {
    return `ANTICIPO DE SUELDO DE ${MESES_ES[mes]} DEL ${anio}`;
  }
  return `SUELDO SEGUNDA QUINCENA DE ${MESES_ES[mes]} DEL ${anio}`;
}

function fechaLarga(d: Date): string {
  const utc = new Date(d);
  const dia = utc.getUTCDate();
  const mes = MESES_ES[utc.getUTCMonth() + 1];
  const anio = utc.getUTCFullYear();
  return `SANTA ANA, ${dia} DE ${mes} DE ${anio}`;
}

function medioPagoLabel(mp: MedioPago): string {
  return mp === MedioPago.EFECTIVO ? "PAGO EN EFECTIVO." : "PAGO BANCO.";
}

type ReciboData = {
  montoNeto: Prisma.Decimal;
  medioPago: MedioPago;
  fechaFirma: Date;
  empleadoNombre: string;
  mes: number;
  anio: number;
  quincena: number;
};

export function ReciboPDF({ data }: { data: ReciboData }) {
  const { montoNeto, medioPago, fechaFirma, empleadoNombre, mes, anio, quincena } = data;
  const letras = splitMontoLetras(montoNeto);

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.por}>
          <Text>
            POR{"  "}
            <Text style={s.porMonto}>${Number(montoNeto).toFixed(2)}</Text>
          </Text>
        </View>

        <Text style={s.line}>RECIBÍ DE PATRONATO DE CENTRO CULTURAL EL MOLINO</Text>

        <Text style={s.line}>
          LA CANTIDAD DE{" "}
          <Text style={s.bold}>{letras.bold}</Text>
          {letras.plain ? ` ${letras.plain}` : ""}
        </Text>

        <Text style={s.line}>
          EN CONCEPTO DE{" "}
          <Text style={s.bold}>{concepto(mes, anio, quincena)}</Text>
        </Text>

        <Text style={s.lugar}>{fechaLarga(fechaFirma)}</Text>

        <View style={s.firma}>
          <Text>F. ___________________</Text>
          <Text style={{ ...s.firmaLine, marginTop: 8 }}>{empleadoNombre}</Text>
        </View>

        <Text style={s.pago}>{medioPagoLabel(medioPago)}</Text>
      </Page>
    </Document>
  );
}
