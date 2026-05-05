import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, COLORS, FONT_SERIF_BOLD, FONT_SANS_BOLD } from "./pdf-styles";
import type { DataAnual } from "./queries";

function fmtMoney(n: number) {
  return `$ ${n.toFixed(2)}`;
}

type Props = { data: DataAnual; generadoPor: string; fechaGeneracion: Date };

export function AnualPDF({ data, generadoPor, fechaGeneracion }: Props) {
  const ingresos = data.filas.filter((f) => f.tipo === "INGRESO");
  const egresos  = data.filas.filter((f) => f.tipo === "EGRESO");
  const balancePositive = data.balance >= 0;

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

        <Text style={styles.title}>Resumen Anual {data.anio}</Text>
        <Text style={styles.subtitle}>
          Estado de Resultados · {data.countMovimientos} movimientos registrados
        </Text>

        {/* ── INGRESOS ── */}
        <View style={[styles.subgroupHeader, { marginTop: 4 }]}>
          <Text style={styles.subgroupText}>Ingresos</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "70%" }]}>Concepto</Text>
          <Text style={[styles.th, { width: "15%", textAlign: "right" }]}>Movimientos</Text>
          <Text style={[styles.th, { width: "15%", textAlign: "right" }]}>Total</Text>
        </View>

        {ingresos.map((f, i) => (
          <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
            <Text style={[styles.td, { width: "70%" }]}>{f.concepto}</Text>
            <Text style={[styles.td, { width: "15%", textAlign: "right", color: COLORS.muted }]}>{f.count}</Text>
            <Text style={[styles.tdBold, { width: "15%", textAlign: "right", color: COLORS.income }]}>
              {fmtMoney(f.total)}
            </Text>
          </View>
        ))}

        {/* Subtotal ingresos */}
        <View style={[styles.subgroupTotal]}>
          <Text style={[styles.tdBold, { flex: 1 }]}>TOTAL INGRESOS</Text>
          <Text style={[styles.tdBold, { color: COLORS.income }]}>{fmtMoney(data.ingresosTotal)}</Text>
        </View>

        {/* ── EGRESOS ── */}
        <View style={[styles.subgroupHeader, { marginTop: 12 }]}>
          <Text style={styles.subgroupText}>Egresos</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "70%" }]}>Concepto</Text>
          <Text style={[styles.th, { width: "15%", textAlign: "right" }]}>Movimientos</Text>
          <Text style={[styles.th, { width: "15%", textAlign: "right" }]}>Total</Text>
        </View>

        {egresos.map((f, i) => (
          <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
            <Text style={[styles.td, { width: "70%" }]}>{f.concepto}</Text>
            <Text style={[styles.td, { width: "15%", textAlign: "right", color: COLORS.muted }]}>{f.count}</Text>
            <Text style={[styles.tdBold, { width: "15%", textAlign: "right", color: COLORS.expense }]}>
              {fmtMoney(f.total)}
            </Text>
          </View>
        ))}

        {/* Subtotal egresos */}
        <View style={[styles.subgroupTotal]}>
          <Text style={[styles.tdBold, { flex: 1 }]}>TOTAL EGRESOS</Text>
          <Text style={[styles.tdBold, { color: COLORS.expense }]}>{fmtMoney(data.egresosTotal)}</Text>
        </View>

        {/* ── BALANCE ── */}
        <View style={[styles.totalsBlock, { marginTop: 16 }]}>
          <View style={[styles.totalRow, { backgroundColor: COLORS.cream, paddingVertical: 10 }]}>
            <Text style={[styles.totalLabel, { fontSize: 12 }]}>BALANCE NETO {data.anio}</Text>
            <Text style={[styles.totalValue, { fontSize: 18, color: balancePositive ? COLORS.income : COLORS.expense }]}>
              {balancePositive ? "+" : ""}{fmtMoney(data.balance)}
            </Text>
          </View>
        </View>

        {/* Firmas */}
        <View style={[styles.firmas, { marginTop: 36 }]}>
          <View style={styles.firmaCol}>
            <View style={styles.firmaLine}>
              <Text style={styles.firmaText}>Elaborado por</Text>
            </View>
          </View>
          <View style={styles.firmaCol}>
            <View style={styles.firmaLine}>
              <Text style={styles.firmaText}>Revisado por · AFCYD</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            Generado por {generadoPor} ·{" "}
            {new Intl.DateTimeFormat("es-SV", { dateStyle: "long", timeStyle: "short" }).format(fechaGeneracion)}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
