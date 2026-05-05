import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, COLORS, FONT_SANS_BOLD } from "./pdf-styles";
import type { DataFeMensual } from "./queries";
import { nombreMes } from "./queries";

function fmtMoney(n: number) {
  return `$ ${n.toFixed(2)}`;
}

const fmtFecha = new Intl.DateTimeFormat("es-SV", {
  day: "2-digit", month: "2-digit", year: "2-digit",
});

const ESTADO_COLOR: Record<string, string> = {
  AL_DIA: "#1E5C2E",
  PARCIAL: "#B14040",
  VENCIDO: "#B14040",
  PENDIENTE: "#6B7E92",
};

const ESTADO_LABEL: Record<string, string> = {
  AL_DIA: "Al día",
  PARCIAL: "Parcial",
  VENCIDO: "Vencido",
  PENDIENTE: "Pendiente",
};

type Props = { data: DataFeMensual; generadoPor: string; fechaGeneracion: Date };

export function FeMensualPDF({ data, generadoPor, fechaGeneracion }: Props) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Encabezado */}
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

        <Text style={styles.title}>Reporte Formación Empresarial</Text>
        <Text style={styles.subtitle}>
          {nombreMes(data.mes).toUpperCase()} {data.anio} · {data.conveniosActivos} convenio(s) activo(s)
        </Text>

        {/* ── Cobranza ── */}
        <View style={[styles.subgroupHeader, { marginTop: 0 }]}>
          <Text style={styles.subgroupText}>Cobranza del mes</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "38%" }]}>Empresa</Text>
          <Text style={[styles.th, { width: "10%" }]}>Plan</Text>
          <Text style={[styles.th, { width: "13%", textAlign: "right" }]}>Esperado</Text>
          <Text style={[styles.th, { width: "13%", textAlign: "right" }]}>Recibido</Text>
          <Text style={[styles.th, { width: "13%", textAlign: "right" }]}>Diferencia</Text>
          <Text style={[styles.th, { width: "13%", textAlign: "center" }]}>Estado</Text>
        </View>

        {data.cobranza.length === 0 ? (
          <View style={[styles.tableRow, { justifyContent: "center", paddingVertical: 12 }]}>
            <Text style={[styles.td, { color: COLORS.muted, fontStyle: "italic" }]}>
              Sin convenios activos en este período.
            </Text>
          </View>
        ) : (
          data.cobranza.map((f, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tdBold, { width: "38%" }]}>{f.empresa}</Text>
              <Text style={[styles.td, { width: "10%" }]}>{f.plan}</Text>
              <Text style={[styles.td, { width: "13%", textAlign: "right" }]}>{fmtMoney(f.esperado)}</Text>
              <Text style={[styles.td, { width: "13%", textAlign: "right", color: COLORS.income }]}>{fmtMoney(f.recibido)}</Text>
              <Text style={[styles.td, { width: "13%", textAlign: "right", color: f.diferencia < 0 ? COLORS.expense : COLORS.income }]}>
                {fmtMoney(f.diferencia)}
              </Text>
              <Text style={[styles.td, { width: "13%", textAlign: "center", color: ESTADO_COLOR[f.estado] ?? COLORS.muted, fontFamily: FONT_SANS_BOLD }]}>
                {ESTADO_LABEL[f.estado] ?? f.estado}
              </Text>
            </View>
          ))
        )}

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={[styles.totalRow, { backgroundColor: COLORS.cream, paddingVertical: 6 }]}>
            <Text style={styles.totalLabel}>TOTAL ESPERADO</Text>
            <Text style={[styles.totalValue, { color: COLORS.navy }]}>{fmtMoney(data.totalEsperado)}</Text>
          </View>
          <View style={[styles.totalRow, { paddingVertical: 4 }]}>
            <Text style={styles.totalLabel}>TOTAL RECIBIDO</Text>
            <Text style={[styles.totalValue, { color: COLORS.income }]}>{fmtMoney(data.totalRecibido)}</Text>
          </View>
          <View style={[styles.totalRow, { paddingVertical: 4 }]}>
            <Text style={styles.totalLabel}>PENDIENTE</Text>
            <Text style={[styles.totalValue, { color: data.totalEsperado - data.totalRecibido > 0 ? COLORS.expense : COLORS.income }]}>
              {fmtMoney(data.totalEsperado - data.totalRecibido)}
            </Text>
          </View>
        </View>

        {/* ── Sesiones ── */}
        <View style={[styles.subgroupHeader, { marginTop: 16 }]}>
          <Text style={styles.subgroupText}>Sesiones del mes ({data.sesiones.length})</Text>
        </View>

        {data.sesiones.length === 0 ? (
          <View style={[styles.tableRow, { justifyContent: "center", paddingVertical: 12 }]}>
            <Text style={[styles.td, { color: COLORS.muted, fontStyle: "italic" }]}>
              Sin sesiones registradas en este período.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: "10%" }]}>Fecha</Text>
              <Text style={[styles.th, { width: "28%" }]}>Empresa</Text>
              <Text style={[styles.th, { width: "32%" }]}>Conferencia</Text>
              <Text style={[styles.th, { width: "12%" }]}>Modalidad</Text>
              <Text style={[styles.th, { width: "18%" }]}>Ponente</Text>
            </View>
            {data.sesiones.map((s, i) => (
              <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.td, { width: "10%" }]}>{fmtFecha.format(s.fecha)}</Text>
                <Text style={[styles.tdBold, { width: "28%" }]}>{s.empresa}</Text>
                <Text style={[styles.td, { width: "32%" }]}>{s.conferencia}</Text>
                <Text style={[styles.td, { width: "12%" }]}>{s.modalidad}</Text>
                <Text style={[styles.td, { width: "18%", color: COLORS.muted }]}>{s.ponente ?? "—"}</Text>
              </View>
            ))}
          </>
        )}

        {/* Firmas */}
        <View style={[styles.firmas, { marginTop: 32 }]}>
          <View style={styles.firmaCol}>
            <View style={styles.firmaLine}>
              <Text style={styles.firmaText}>Elaborado por</Text>
            </View>
          </View>
          <View style={styles.firmaCol}>
            <View style={styles.firmaLine}>
              <Text style={styles.firmaText}>Director / AFCYD</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Generado por {generadoPor} · {new Intl.DateTimeFormat("es-SV", { dateStyle: "long", timeStyle: "short" }).format(fechaGeneracion)}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
