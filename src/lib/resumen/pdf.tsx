import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, COLORS, FONT_SANS, FONT_SANS_BOLD } from "@/lib/reportes/pdf-styles";
import type { SerResumenData, SerConceptoFila, SerTotalFila } from "./serialize";
import { NOMBRES_MESES } from "./queries";

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const fmt = (v: string | number) => {
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "—";
  return `$ ${n.toFixed(2)}`;
};

const pctText = (p: number | null) => (p == null ? "—" : `${(p * 100).toFixed(1)}%`);

const colNumWidth = 7; // %
const conceptWidth = 18;

const cellStyle = {
  fontFamily: FONT_SANS,
  fontSize: 6.5,
  color: COLORS.ink,
};
const cellRight = { ...cellStyle, textAlign: "right" as const };
const cellBold = { ...cellStyle, fontFamily: FONT_SANS_BOLD };
const headerStyle = {
  fontFamily: FONT_SANS_BOLD,
  fontSize: 6,
  color: COLORS.navy,
  textAlign: "right" as const,
};

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

function FilaCompleta({
  fila,
  numero,
  esIngreso,
  mesActivo,
}: {
  fila: SerConceptoFila;
  numero: number;
  esIngreso: boolean;
  mesActivo: number;
}) {
  return (
    <View style={[styles.tableRow, numero % 2 === 1 ? styles.tableRowAlt : {}]}>
      <Text style={[cellStyle, { width: "3%", textAlign: "center" }]}>{numero}</Text>
      <Text style={[cellStyle, { width: `${conceptWidth}%` }]}>{fila.nombre}</Text>
      <Text style={[cellRight, { width: `${colNumWidth}%`, color: esIngreso ? COLORS.income : COLORS.expense }]}>
        {fmt(fila.realMensual)}
      </Text>
      <Text style={[cellRight, { width: `${colNumWidth}%` }]}>{fmt(fila.presupuestoMensual)}</Text>
      <Text style={[cellRight, { width: "5%" }]}>{pctText(fila.pctMes)}</Text>
      <Text style={[cellRight, { width: `${colNumWidth}%`, color: esIngreso ? COLORS.income : COLORS.expense }]}>
        {fmt(fila.realAcumulado)}
      </Text>
      <Text style={[cellRight, { width: `${colNumWidth}%` }]}>{fmt(fila.presupuestoAcumulado)}</Text>
      <Text style={[cellRight, { width: "5%" }]}>{pctText(fila.pctAcum)}</Text>
      {fila.mensual.map((m, i) => (
        <Text
          key={i}
          style={[
            cellRight,
            {
              width: `${(100 - 3 - conceptWidth - colNumWidth * 4 - 10) / 12}%`,
              backgroundColor: i === mesActivo - 1 ? COLORS.goldSoft : "transparent",
              fontSize: 6,
            },
          ]}
        >
          {Number(m) === 0 ? "—" : Number(m).toFixed(0)}
        </Text>
      ))}
    </View>
  );
}

function FilaTotalCompleta({
  total,
  label,
  esIngreso,
}: {
  total: SerTotalFila;
  label: string;
  esIngreso: boolean;
}) {
  return (
    <View style={[styles.subgroupTotal]}>
      <Text style={[cellBold, { width: "3%" }]}></Text>
      <Text style={[cellBold, { width: `${conceptWidth}%` }]}>{label}</Text>
      <Text style={[cellBold, { width: `${colNumWidth}%`, textAlign: "right", color: esIngreso ? COLORS.income : COLORS.expense }]}>
        {fmt(total.realMensual)}
      </Text>
      <Text style={[cellBold, { width: `${colNumWidth}%`, textAlign: "right" }]}>{fmt(total.presupuestoMensual)}</Text>
      <Text style={[cellBold, { width: "5%", textAlign: "right" }]}>{pctText(total.pctMes)}</Text>
      <Text style={[cellBold, { width: `${colNumWidth}%`, textAlign: "right", color: esIngreso ? COLORS.income : COLORS.expense }]}>
        {fmt(total.realAcumulado)}
      </Text>
      <Text style={[cellBold, { width: `${colNumWidth}%`, textAlign: "right" }]}>{fmt(total.presupuestoAcumulado)}</Text>
      <Text style={[cellBold, { width: "5%", textAlign: "right" }]}>{pctText(total.pctAcum)}</Text>
      {total.mensual.map((m, i) => (
        <Text
          key={i}
          style={[
            cellBold,
            {
              width: `${(100 - 3 - conceptWidth - colNumWidth * 4 - 10) / 12}%`,
              fontSize: 6,
              textAlign: "right",
            },
          ]}
        >
          {Number(m) === 0 ? "—" : Number(m).toFixed(0)}
        </Text>
      ))}
    </View>
  );
}

function HeaderTabla({ mesActivo }: { mesActivo: number }) {
  return (
    <View style={styles.tableHeader}>
      <Text style={[headerStyle, { width: "3%", textAlign: "center" }]}>#</Text>
      <Text style={[headerStyle, { width: `${conceptWidth}%`, textAlign: "left" }]}>Concepto</Text>
      <Text style={[headerStyle, { width: `${colNumWidth}%` }]}>Real</Text>
      <Text style={[headerStyle, { width: `${colNumWidth}%` }]}>Presup.</Text>
      <Text style={[headerStyle, { width: "5%" }]}>%</Text>
      <Text style={[headerStyle, { width: `${colNumWidth}%` }]}>Real ac.</Text>
      <Text style={[headerStyle, { width: `${colNumWidth}%` }]}>Pre. ac.</Text>
      <Text style={[headerStyle, { width: "5%" }]}>%</Text>
      {MESES_CORTOS.map((m, i) => (
        <Text
          key={m}
          style={[
            headerStyle,
            {
              width: `${(100 - 3 - conceptWidth - colNumWidth * 4 - 10) / 12}%`,
              fontSize: 6,
              backgroundColor: i === mesActivo - 1 ? COLORS.goldSoft : "transparent",
            },
          ]}
        >
          {m}
        </Text>
      ))}
    </View>
  );
}

export function ResumenPDF({
  data,
  generadoPor,
  fechaGeneracion,
}: {
  data: SerResumenData;
  generadoPor: string;
  fechaGeneracion: Date;
}) {
  const mesNombre = NOMBRES_MESES[data.mesActivo - 1];

  return (
    <Document>
      {/* Página 1 — Ingresos */}
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <Encabezado />
        <Text style={styles.title}>
          Resumen — {mesNombre} {data.anio}
        </Text>
        <Text style={styles.subtitle}>Ingresos por concepto</Text>

        <View style={[styles.subgroupHeader, { marginTop: 4 }]}>
          <Text style={styles.subgroupText}>I — Ingresos</Text>
        </View>
        <HeaderTabla mesActivo={data.mesActivo} />
        {data.ingresos.map((f, i) => (
          <FilaCompleta
            key={f.conceptoId}
            fila={f}
            numero={i + 1}
            esIngreso={true}
            mesActivo={data.mesActivo}
          />
        ))}
        <FilaTotalCompleta total={data.totales.ingresos} label="TOTAL INGRESOS" esIngreso={true} />

        <View style={styles.footer}>
          <Text>Generado por {generadoPor}</Text>
          <Text>{fechaGeneracion.toLocaleString("es-SV")}</Text>
        </View>
      </Page>

      {/* Página 2 — Egresos */}
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <Encabezado />
        <Text style={styles.title}>
          Resumen — {mesNombre} {data.anio}
        </Text>
        <Text style={styles.subtitle}>Egresos por concepto</Text>

        <View style={[styles.subgroupHeader, { marginTop: 4 }]}>
          <Text style={styles.subgroupText}>II — Egresos</Text>
        </View>
        <HeaderTabla mesActivo={data.mesActivo} />
        {data.egresos.map((f, i) => (
          <FilaCompleta
            key={f.conceptoId}
            fila={f}
            numero={i + 1}
            esIngreso={false}
            mesActivo={data.mesActivo}
          />
        ))}
        <FilaTotalCompleta total={data.totales.egresos} label="TOTAL EGRESOS" esIngreso={false} />

        <View style={styles.footer}>
          <Text>Generado por {generadoPor}</Text>
          <Text>{fechaGeneracion.toLocaleString("es-SV")}</Text>
        </View>
      </Page>

      {/* Página 3 — Saldos + Observaciones */}
      <Page size="LETTER" style={styles.page}>
        <Encabezado />
        <Text style={styles.title}>
          Saldos y observaciones — {mesNombre} {data.anio}
        </Text>

        <View style={[styles.subgroupHeader, { marginTop: 12 }]}>
          <Text style={styles.subgroupText}>III — Saldos</Text>
        </View>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "30%" }]}>Concepto</Text>
          <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>Mes</Text>
          <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>Acumulado</Text>
          <Text style={[styles.th, { width: "30%", textAlign: "right" }]}>
            Saldo año anterior
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tdBold, { width: "30%" }]}>Saldo</Text>
          <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>
            {fmt(data.saldos.saldoMensual)}
          </Text>
          <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>
            {fmt(data.saldos.saldoAcumulado)}
          </Text>
          <Text style={[styles.td, { width: "30%", textAlign: "right" }]}></Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tdBold, { width: "30%" }]}>Saldo anterior</Text>
          <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>—</Text>
          <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>—</Text>
          <Text style={[styles.td, { width: "30%", textAlign: "right" }]}>
            {fmt(data.saldoAnualInicial)}
          </Text>
        </View>
        <View style={[styles.subgroupTotal]}>
          <Text style={[styles.tdBold, { width: "30%" }]}>SALDO MES PRÓXIMO</Text>
          <Text style={[styles.tdBold, { width: "20%", textAlign: "right" }]}>
            {fmt(data.saldos.saldoMesProximo[data.mesActivo - 1])}
          </Text>
          <Text style={[styles.td, { width: "50%" }]}></Text>
        </View>

        {(data.notas.ingresos || data.notas.egresos) && (
          <>
            <View style={[styles.subgroupHeader, { marginTop: 18 }]}>
              <Text style={styles.subgroupText}>IV — Observaciones</Text>
            </View>
            {data.notas.ingresos && (
              <View style={{ marginTop: 8 }}>
                <Text style={[cellBold, { fontSize: 9, color: COLORS.income }]}>Ingresos:</Text>
                <Text style={[styles.td, { marginTop: 4 }]}>{data.notas.ingresos}</Text>
              </View>
            )}
            {data.notas.egresos && (
              <View style={{ marginTop: 12 }}>
                <Text style={[cellBold, { fontSize: 9, color: COLORS.expense }]}>Egresos:</Text>
                <Text style={[styles.td, { marginTop: 4 }]}>{data.notas.egresos}</Text>
              </View>
            )}
          </>
        )}

        <View style={styles.footer}>
          <Text>Generado por {generadoPor}</Text>
          <Text>{fechaGeneracion.toLocaleString("es-SV")}</Text>
        </View>
      </Page>
    </Document>
  );
}
