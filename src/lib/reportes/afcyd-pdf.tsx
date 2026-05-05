import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, COLORS } from "./pdf-styles";
import type { DataAfcyd } from "./queries";
import { nombreMes } from "./queries";

const fmtFecha = new Intl.DateTimeFormat("es-SV", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

function fmtMoney(n: number): string {
  return `$ ${n.toFixed(2)}`;
}

const COLS = { fecha: 8, medio: 9, dui: 13, nombre: 22, monto: 9, notas: 14, correo: 25 };

type Props = {
  data: DataAfcyd;
  generadoPor: string;
  fechaGeneracion: Date;
};

export function AfcydPDF({ data, generadoPor, fechaGeneracion }: Props) {
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <Encabezado />

        <Text style={styles.title}>Informe de Donantes</Text>
        <Text style={styles.subtitle}>
          {nombreMes(data.mes).toUpperCase()} DE {data.anio} · CENTRO CULTURAL EL MOLINO
        </Text>

        {/* Tabla */}
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: `${COLS.fecha}%` }]}>Fecha</Text>
          <Text style={[styles.th, { width: `${COLS.medio}%` }]}>Medio</Text>
          <Text style={[styles.th, { width: `${COLS.dui}%` }]}>DUI</Text>
          <Text style={[styles.th, { width: `${COLS.nombre}%` }]}>Nombre</Text>
          <Text style={[styles.th, { width: `${COLS.monto}%`, textAlign: "right" }]}>Monto</Text>
          <Text style={[styles.th, { width: `${COLS.notas}%` }]}>Notas</Text>
          <Text style={[styles.th, { width: `${COLS.correo}%` }]}>Correo</Text>
        </View>

        {data.filas.length === 0 ? (
          <View style={[styles.tableRow, { justifyContent: "center", paddingVertical: 16 }]}>
            <Text style={[styles.td, { color: COLORS.muted, fontStyle: "italic" }]}>
              Sin ingresos AFCYD en este período.
            </Text>
          </View>
        ) : (
          data.filas.map((f, i) => {
            const esEfectivo = f.medio === "Efectivo";
            return (
              <View
                key={i}
                style={[styles.tableRow, esEfectivo ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.td, { width: `${COLS.fecha}%` }]}>{fmtFecha.format(f.fecha)}</Text>
                <Text style={[styles.td, { width: `${COLS.medio}%`, color: esEfectivo ? COLORS.gold : COLORS.navy, fontFamily: "Helvetica-Bold" }]}>
                  {f.medio}
                </Text>
                <Text style={[styles.td, { width: `${COLS.dui}%` }]}>{f.dui ?? "—"}</Text>
                <Text style={[styles.tdBold, { width: `${COLS.nombre}%` }]}>{f.nombre}</Text>
                <Text style={[styles.tdBold, { width: `${COLS.monto}%`, textAlign: "right" }]}>
                  {fmtMoney(f.monto)}
                </Text>
                <Text style={[styles.td, { width: `${COLS.notas}%`, fontStyle: "italic", color: COLORS.muted }]}>
                  {f.notas ?? ""}
                </Text>
                <Text style={[styles.td, { width: `${COLS.correo}%`, color: COLORS.muted }]}>
                  {f.correo ?? ""}
                </Text>
              </View>
            );
          })
        )}

        {/* Total */}
        <View style={styles.totalsBlock}>
          <View style={[styles.totalRow, { backgroundColor: COLORS.cream, paddingVertical: 8 }]}>
            <Text style={[styles.totalLabel, { fontSize: 11 }]}>TOTAL DEL MES</Text>
            <Text style={[styles.totalValue, { fontSize: 14, color: COLORS.navy }]}>
              {fmtMoney(data.total)}
            </Text>
          </View>
          <View style={[styles.totalRow, { paddingVertical: 2 }]}>
            <Text style={[styles.td, { color: COLORS.muted, fontFamily: "Helvetica" }]}>
              {data.filas.length} ingresos · {data.totalDonantes} donantes únicos · {data.totalBanco} vía Banco · {data.totalEfectivo} en Efectivo
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
          <Text style={styles.firmaText}>Revisado por · AFCYD</Text>
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
