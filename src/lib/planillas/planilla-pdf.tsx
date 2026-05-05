import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONT_SERIF_BOLD, FONT_SANS, FONT_SANS_BOLD, FONT_SERIF } from "@/lib/reportes/pdf-styles";
import { TipoPartida } from "@prisma/client";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type PartidaRow = {
  tipo: TipoPartida;
  monto: number;
};

type EmpleadoRow = {
  nombre: string;
  dui: string | null;
  cargo: string | null;
  partidas: PartidaRow[];
};

export type PlanillaReporte = {
  anio: number;
  mes: number;
  quincena: number;
  fechaPago: Date;
  medioPago: string;
  empleados: EmpleadoRow[];
  generadoPor: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES = [
  "","Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const fmt = (n: number) =>
  n === 0 ? "—" : `$ ${n.toFixed(2)}`;

const fmtTotal = (n: number) => `$ ${n.toFixed(2)}`;

function partSum(partidas: PartidaRow[], tipos: TipoPartida[]): number {
  return partidas.filter((p) => tipos.includes(p.tipo)).reduce((s, p) => s + p.monto, 0);
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

// Anchos de columna (deben sumar 100)
const W = {
  num:    3,
  dui:    10,
  nombre: 22,
  sueldo: 9,
  extras: 8,
  total:  9,
  isss:   7,
  afp:    7,
  isr:    7,
  otros:  7,
  neto:   11,
};

const s = StyleSheet.create({
  page: {
    fontFamily: FONT_SANS,
    fontSize: 7.5,
    color: COLORS.ink,
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 28,
  },

  // Encabezado
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  shield: {
    width: 30,
    height: 36,
    backgroundColor: COLORS.navy,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    borderRadius: 3,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  shieldText: {
    color: COLORS.gold,
    fontSize: 8,
    fontFamily: FONT_SERIF_BOLD,
  },
  brandName: {
    fontFamily: FONT_SERIF_BOLD,
    fontSize: 10,
    color: COLORS.navy,
  },
  brandSub: {
    fontFamily: FONT_SANS,
    fontSize: 6.5,
    color: COLORS.muted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 1,
  },

  goldDivider: {
    height: 1.5,
    backgroundColor: COLORS.gold,
    marginBottom: 8,
  },
  thinDivider: {
    height: 0.5,
    backgroundColor: COLORS.border,
    marginBottom: 6,
  },

  // Título
  titleBlock: {
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontFamily: FONT_SERIF_BOLD,
    fontSize: 13,
    color: COLORS.navy,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: FONT_SERIF,
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 4,
  },
  metaItem: {
    fontFamily: FONT_SANS,
    fontSize: 7,
    color: COLORS.muted,
  },
  metaBold: {
    fontFamily: FONT_SANS_BOLD,
    fontSize: 7,
    color: COLORS.ink,
  },

  // Tabla
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: COLORS.navy,
    paddingVertical: 5,
    paddingHorizontal: 3,
    marginTop: 2,
  },
  tableSubHeaderRow: {
    flexDirection: "row",
    backgroundColor: COLORS.navyLight,
    paddingVertical: 3,
    paddingHorizontal: 3,
    borderBottomWidth: 0.5,
    borderColor: COLORS.border,
  },
  th: {
    fontFamily: FONT_SANS_BOLD,
    fontSize: 6.5,
    color: COLORS.cream,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  thSub: {
    fontFamily: FONT_SANS,
    fontSize: 6,
    color: COLORS.navy,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderColor: COLORS.border,
    paddingVertical: 4,
    paddingHorizontal: 3,
  },
  tableRowAlt: {
    backgroundColor: "#F7F9FC",
  },
  td: {
    fontFamily: FONT_SANS,
    fontSize: 7.5,
    color: COLORS.ink,
  },
  tdRight: {
    fontFamily: FONT_SANS,
    fontSize: 7.5,
    color: COLORS.ink,
    textAlign: "right",
  },
  tdBold: {
    fontFamily: FONT_SANS_BOLD,
    fontSize: 7.5,
    color: COLORS.ink,
    textAlign: "right",
  },
  tdDeduct: {
    fontFamily: FONT_SANS,
    fontSize: 7.5,
    color: COLORS.expense,
    textAlign: "right",
  },
  tdNeto: {
    fontFamily: FONT_SANS_BOLD,
    fontSize: 7.5,
    color: COLORS.navy,
    textAlign: "right",
  },

  // Fila de totales
  totalsRow: {
    flexDirection: "row",
    backgroundColor: COLORS.navy,
    paddingVertical: 5,
    paddingHorizontal: 3,
    marginTop: 2,
  },
  totalLabel: {
    fontFamily: FONT_SANS_BOLD,
    fontSize: 7.5,
    color: COLORS.cream,
  },
  totalValue: {
    fontFamily: FONT_SANS_BOLD,
    fontSize: 7.5,
    color: COLORS.gold,
    textAlign: "right",
  },
  totalValueLight: {
    fontFamily: FONT_SANS_BOLD,
    fontSize: 7.5,
    color: "#F8C96A",
    textAlign: "right",
  },

  // Firmas
  firmasBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 28,
    paddingHorizontal: 20,
  },
  firmaCol: {
    alignItems: "center",
    width: "30%",
  },
  firmaLine: {
    borderTopWidth: 0.8,
    borderColor: COLORS.navy,
    width: "100%",
    paddingTop: 4,
  },
  firmaLabel: {
    fontFamily: FONT_SANS,
    fontSize: 6.5,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    textAlign: "center",
  },

  footer: {
    position: "absolute",
    bottom: 14,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6,
    color: COLORS.muted,
    fontStyle: "italic",
  },
});

// ─── Componente ───────────────────────────────────────────────────────────────

function cell(widthPct: number) {
  return { width: `${widthPct}%` as const };
}

function fmtFecha(d: Date) {
  return new Intl.DateTimeFormat("es-SV", { dateStyle: "long", timeZone: "UTC" }).format(d);
}

function generadoTs() {
  return new Intl.DateTimeFormat("es-SV", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

export function PlanillaPDF({ data }: { data: PlanillaReporte }) {
  const { anio, mes, quincena, fechaPago, medioPago, empleados, generadoPor } = data;

  const titulo = `${quincena === 1 ? "1ª" : "2ª"} Quincena — ${MESES[mes]} ${anio}`;

  // Totales globales
  let gtSueldo = 0, gtExtras = 0, gtTotal = 0;
  let gtIsss = 0, gtAfp = 0, gtIsr = 0, gtOtros = 0, gtNeto = 0;

  const filas = empleados.map((emp, idx) => {
    const sueldo = partSum(emp.partidas, [TipoPartida.SUELDO]);
    const extras  = partSum(emp.partidas, [TipoPartida.BONO, TipoPartida.HORA_EXTRA]);
    const total   = sueldo + extras;
    const isss    = partSum(emp.partidas, [TipoPartida.DESCUENTO_ISSS]);
    const afp     = partSum(emp.partidas, [TipoPartida.DESCUENTO_AFP]);
    const isr     = partSum(emp.partidas, [TipoPartida.DESCUENTO_ISR]);
    const otros   = partSum(emp.partidas, [TipoPartida.DESCUENTO_OTRO]);
    const neto    = total - isss - afp - isr - otros;

    gtSueldo += sueldo; gtExtras += extras; gtTotal += total;
    gtIsss   += isss;   gtAfp   += afp;   gtIsr  += isr;
    gtOtros  += otros;  gtNeto  += neto;

    return { idx, emp, sueldo, extras, total, isss, afp, isr, otros, neto };
  });

  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={s.page}>

        {/* ── Encabezado institucional ── */}
        <View style={s.headerRow}>
          <View style={s.shield}>
            <Text style={s.shieldText}>EM</Text>
          </View>
          <View>
            <Text style={s.brandName}>Centro Cultural El Molino</Text>
            <Text style={s.brandSub}>Patronato · Santa Ana, El Salvador</Text>
          </View>
        </View>
        <View style={s.goldDivider} />

        {/* ── Título ── */}
        <View style={s.titleBlock}>
          <Text style={s.title}>Planilla de Sueldos</Text>
          <Text style={s.subtitle}>{titulo}</Text>
          <View style={s.metaRow}>
            <Text style={s.metaItem}>
              Fecha de pago:{" "}
              <Text style={s.metaBold}>{fmtFecha(fechaPago)}</Text>
            </Text>
            <Text style={s.metaItem}>
              Medio de pago:{" "}
              <Text style={s.metaBold}>
                {medioPago === "EFECTIVO" ? "Efectivo" : "Transferencia bancaria"}
              </Text>
            </Text>
          </View>
        </View>

        {/* ── Tabla ── */}

        {/* Cabecera principal (fondo marino) */}
        <View style={s.tableHeaderRow}>
          <Text style={[s.th, cell(W.num)]}>#</Text>
          <Text style={[s.th, cell(W.dui)]}>DUI</Text>
          <Text style={[s.th, cell(W.nombre)]}>Nombre</Text>
          <Text style={[s.th, cell(W.sueldo)]}>Sueldo</Text>
          <Text style={[s.th, cell(W.extras)]}>Extras</Text>
          <Text style={[s.th, cell(W.total)]}>Total dev.</Text>
          <Text style={[s.th, cell(W.isss)]}>(-) ISSS</Text>
          <Text style={[s.th, cell(W.afp)]}>(-) AFP</Text>
          <Text style={[s.th, cell(W.isr)]}>(-) ISR</Text>
          <Text style={[s.th, cell(W.otros)]}>(-) Otros</Text>
          <Text style={[s.th, cell(W.neto)]}>Líquido</Text>
        </View>

        {/* Filas de empleados */}
        {filas.map(({ idx, emp, sueldo, extras, total, isss, afp, isr, otros, neto }) => (
          <View
            key={emp.nombre}
            style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}
          >
            <Text style={[s.td, cell(W.num)]}>{idx + 1}</Text>
            <Text style={[s.td, cell(W.dui)]}>{emp.dui ?? "—"}</Text>
            <View style={[{ flexDirection: "column" }, cell(W.nombre)]}>
              <Text style={s.td}>{emp.nombre}</Text>
              {emp.cargo ? (
                <Text style={{ fontFamily: FONT_SANS, fontSize: 6, color: COLORS.muted }}>
                  {emp.cargo}
                </Text>
              ) : null}
            </View>
            <Text style={[s.tdRight, cell(W.sueldo)]}>{fmt(sueldo)}</Text>
            <Text style={[s.tdRight, cell(W.extras)]}>{fmt(extras)}</Text>
            <Text style={[s.tdBold, cell(W.total)]}>{fmtTotal(total)}</Text>
            <Text style={[s.tdDeduct, cell(W.isss)]}>{fmt(isss)}</Text>
            <Text style={[s.tdDeduct, cell(W.afp)]}>{fmt(afp)}</Text>
            <Text style={[s.tdDeduct, cell(W.isr)]}>{fmt(isr)}</Text>
            <Text style={[s.tdDeduct, cell(W.otros)]}>{fmt(otros)}</Text>
            <Text style={[s.tdNeto, cell(W.neto)]}>{fmtTotal(neto)}</Text>
          </View>
        ))}

        {/* Fila de totales */}
        <View style={s.totalsRow}>
          <Text style={[s.totalLabel, cell(W.num + W.dui + W.nombre)]}>
            TOTALES
          </Text>
          <Text style={[s.totalValue, cell(W.sueldo)]}>{fmtTotal(gtSueldo)}</Text>
          <Text style={[s.totalValue, cell(W.extras)]}>{fmtTotal(gtExtras)}</Text>
          <Text style={[s.totalValue, cell(W.total)]}>{fmtTotal(gtTotal)}</Text>
          <Text style={[s.totalValueLight, cell(W.isss)]}>{fmtTotal(gtIsss)}</Text>
          <Text style={[s.totalValueLight, cell(W.afp)]}>{fmtTotal(gtAfp)}</Text>
          <Text style={[s.totalValueLight, cell(W.isr)]}>{fmtTotal(gtIsr)}</Text>
          <Text style={[s.totalValueLight, cell(W.otros)]}>{fmtTotal(gtOtros)}</Text>
          <Text style={[s.totalValue, cell(W.neto)]}>{fmtTotal(gtNeto)}</Text>
        </View>

        {/* ── Firmas ── */}
        <View style={s.firmasBlock}>
          {["Elaborado por", "Revisado por", "Autorizado por"].map((label) => (
            <View key={label} style={s.firmaCol}>
              <View style={{ height: 24 }} />
              <View style={s.firmaLine}>
                <Text style={s.firmaLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text>Generado por {generadoPor}</Text>
          <Text>{generadoTs()}</Text>
        </View>
      </Page>
    </Document>
  );
}
