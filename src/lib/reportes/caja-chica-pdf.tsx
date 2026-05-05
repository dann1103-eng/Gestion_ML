import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, COLORS } from "./pdf-styles";
import type { DataCajaChica, FilaCajaChica } from "./queries";
import { nombreMes } from "./queries";

const fmtFecha = new Intl.DateTimeFormat("es-SV", {
  day: "2-digit",
  month: "2-digit",
});

function fmtMoney(n: number): string {
  return `$ ${n.toFixed(2)}`;
}

// Anchos de columna (suma 100%)
const COLS = { fecha: 8, vale: 16, concepto: 18, descripcion: 22, cuenta: 12, ingreso: 12, egreso: 12 };

type Props = {
  data: DataCajaChica;
  generadoPor: string;
  fechaGeneracion: Date;
};

export function CajaChicaPDF({ data, generadoPor, fechaGeneracion }: Props) {
  // Agrupar filas por concepto preservando orden de aparición
  const grupos = new Map<string, FilaCajaChica[]>();
  for (const f of data.filas) {
    const arr = grupos.get(f.conceptoNombre) ?? [];
    arr.push(f);
    grupos.set(f.conceptoNombre, arr);
  }

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Encabezado />

        <Text style={styles.title}>Caja Chica Mensual</Text>
        <Text style={styles.subtitle}>
          {nombreMes(data.mes)} {data.anio}
          {data.cuentaNombre ? ` · ${data.cuentaNombre}` : ""}
        </Text>

        {/* Tabla */}
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: `${COLS.fecha}%` }]}>Fecha</Text>
          <Text style={[styles.th, { width: `${COLS.vale}%` }]}>Vale</Text>
          <Text style={[styles.th, { width: `${COLS.concepto}%` }]}>Concepto</Text>
          <Text style={[styles.th, { width: `${COLS.descripcion}%` }]}>Descripción</Text>
          <Text style={[styles.th, { width: `${COLS.cuenta}%` }]}>Cuenta</Text>
          <Text style={[styles.th, { width: `${COLS.ingreso}%`, textAlign: "right" }]}>Ingreso</Text>
          <Text style={[styles.th, { width: `${COLS.egreso}%`, textAlign: "right" }]}>Egreso</Text>
        </View>

        {data.filas.length === 0 ? (
          <View style={[styles.tableRow, { justifyContent: "center", paddingVertical: 16 }]}>
            <Text style={[styles.td, { color: COLORS.muted, fontStyle: "italic" }]}>
              Sin movimientos en este período.
            </Text>
          </View>
        ) : (
          Array.from(grupos.entries()).map(([concepto, filas]) => {
            const subIngresos = filas.reduce((s, f) => s + f.ingreso, 0);
            const subEgresos = filas.reduce((s, f) => s + f.egreso, 0);
            return (
              <View key={concepto}>
                <View style={styles.subgroupHeader}>
                  <Text style={styles.subgroupText}>{concepto}</Text>
                </View>
                {filas.map((f, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.td, { width: `${COLS.fecha}%` }]}>{fmtFecha.format(f.fecha)}</Text>
                    <Text style={[styles.td, { width: `${COLS.vale}%` }]}>{f.vale}</Text>
                    <Text style={[styles.td, { width: `${COLS.concepto}%` }]}>
                      {f.donanteNombre ?? "—"}
                    </Text>
                    <Text style={[styles.td, { width: `${COLS.descripcion}%` }]}>{f.descripcion}</Text>
                    <Text style={[styles.td, { width: `${COLS.cuenta}%` }]}>{f.cuentaNombre}</Text>
                    <Text style={[styles.td, { width: `${COLS.ingreso}%`, textAlign: "right", color: COLORS.income }]}>
                      {f.ingreso > 0 ? fmtMoney(f.ingreso) : "—"}
                    </Text>
                    <Text style={[styles.td, { width: `${COLS.egreso}%`, textAlign: "right", color: COLORS.expense }]}>
                      {f.egreso > 0 ? fmtMoney(f.egreso) : "—"}
                    </Text>
                  </View>
                ))}
                <View style={styles.subgroupTotal}>
                  <Text style={[styles.tdBold, { width: `${COLS.fecha + COLS.vale + COLS.concepto + COLS.descripcion + COLS.cuenta}%`, color: COLORS.muted }]}>
                    Subtotal {concepto}
                  </Text>
                  <Text style={[styles.tdBold, { width: `${COLS.ingreso}%`, textAlign: "right", color: COLORS.income }]}>
                    {subIngresos > 0 ? fmtMoney(subIngresos) : "—"}
                  </Text>
                  <Text style={[styles.tdBold, { width: `${COLS.egreso}%`, textAlign: "right", color: COLORS.expense }]}>
                    {subEgresos > 0 ? fmtMoney(subEgresos) : "—"}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {/* Totales */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL INGRESOS</Text>
            <Text style={[styles.totalValue, { color: COLORS.income }]}>+ {fmtMoney(data.totalIngresos)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL EGRESOS</Text>
            <Text style={[styles.totalValue, { color: COLORS.expense }]}>− {fmtMoney(data.totalEgresos)}</Text>
          </View>
          <View style={[styles.totalRow, { backgroundColor: COLORS.cream, marginTop: 4, paddingVertical: 8 }]}>
            <Text style={[styles.totalLabel, { fontSize: 11 }]}>DIFERENCIA FINAL</Text>
            <Text style={[styles.totalValue, { fontSize: 14, color: COLORS.navy }]}>
              {fmtMoney(data.totalIngresos - data.totalEgresos)}
            </Text>
          </View>
        </View>

        {/* Firmas */}
        <Firmas />

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

function Firmas() {
  return (
    <View style={styles.firmas}>
      <View style={styles.firmaCol}>
        <View style={styles.firmaLine}>
          <Text style={styles.firmaText}>Elaborado por</Text>
        </View>
      </View>
      <View style={styles.firmaCol}>
        <View style={styles.firmaLine}>
          <Text style={styles.firmaText}>Revisado por</Text>
        </View>
      </View>
    </View>
  );
}

function Footer({ generadoPor, fechaGeneracion }: { generadoPor: string; fechaGeneracion: Date }) {
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
