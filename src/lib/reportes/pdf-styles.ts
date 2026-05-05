import { StyleSheet } from "@react-pdf/renderer";

// Para v1 usamos las fuentes built-in de PDF (Helvetica para body, Times-Roman para serif).
// Mantienen el feel institucional sin requerir bundling de TTFs externos.
// Mapeo: Lora → Times-Roman | Nunito → Helvetica
export const FONT_SERIF = "Times-Roman";
export const FONT_SERIF_BOLD = "Times-Bold";
export const FONT_SANS = "Helvetica";
export const FONT_SANS_BOLD = "Helvetica-Bold";

// Paleta El Molino
export const COLORS = {
  navy: "#1A3550",
  navyLight: "#E3EAF2",
  gold: "#F0AA1C",
  goldSoft: "#FFF8E8",
  cream: "#FAF4EA",
  ink: "#0B1C2B",
  muted: "#6B7E92",
  border: "#D2DCE8",
  income: "#1E5C2E",
  expense: "#B14040",
  white: "#FFFFFF",
};

export const styles = StyleSheet.create({
  page: {
    fontFamily: FONT_SANS,
    fontSize: 9,
    color: COLORS.ink,
    paddingTop: 36,
    paddingBottom: 50,
    paddingHorizontal: 36,
  },

  // Encabezado del Centro
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  shield: {
    width: 36,
    height: 42,
    backgroundColor: COLORS.navy,
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderRadius: 3,
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  shieldText: {
    color: COLORS.gold,
    fontSize: 9,
    fontFamily: FONT_SERIF_BOLD,
  },
  brandText: {
    fontFamily: FONT_SERIF_BOLD,
    fontSize: 11,
    color: COLORS.navy,
    letterSpacing: 0.3,
  },
  brandTagline: {
    fontFamily: FONT_SANS,
    fontSize: 7,
    color: COLORS.muted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 2,
  },

  goldDivider: {
    height: 2,
    backgroundColor: COLORS.gold,
    marginBottom: 20,
  },

  title: {
    fontFamily: FONT_SERIF_BOLD,
    fontSize: 16,
    color: COLORS.navy,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: FONT_SERIF,
    fontSize: 11,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 18,
  },

  // Tabla
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.navyLight,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.navy,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  th: {
    fontFamily: FONT_SANS_BOLD,
    fontSize: 7.5,
    color: COLORS.navy,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: COLORS.border,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRowAlt: {
    backgroundColor: COLORS.goldSoft,
  },
  td: {
    fontFamily: FONT_SANS,
    fontSize: 8,
    color: COLORS.ink,
  },
  tdBold: {
    fontFamily: FONT_SANS_BOLD,
    fontSize: 8,
    color: COLORS.ink,
  },

  // Subgrupo (caja chica)
  subgroupHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.navy,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 6,
  },
  subgroupText: {
    fontFamily: FONT_SERIF_BOLD,
    fontSize: 8.5,
    color: COLORS.cream,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  subgroupTotal: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    backgroundColor: COLORS.cream,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  // Totales
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 2,
  },
  totalLabel: {
    fontFamily: FONT_SANS_BOLD,
    fontSize: 9,
    color: COLORS.ink,
    letterSpacing: 0.3,
  },
  totalValue: {
    fontFamily: FONT_SANS_BOLD,
    fontSize: 11,
  },
  totalsBlock: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderColor: COLORS.navy,
  },

  // Firmas
  firmas: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 36,
  },
  firmaCol: {
    flex: 1,
    marginHorizontal: 16,
  },
  firmaLine: {
    borderTopWidth: 0.8,
    borderColor: COLORS.navy,
    paddingTop: 4,
  },
  firmaText: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    textAlign: "center",
  },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: COLORS.muted,
    fontStyle: "italic",
  },
});
