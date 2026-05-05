import { describe, it, expect } from "vitest";
import {
  donanteSchema,
  movimientoSchema,
  cuentaSchema,
} from "@/lib/zod-schemas";

describe("donanteSchema", () => {
  it("acepta cooperador con datos mínimos", () => {
    const r = donanteSchema.safeParse({
      tipo: "COOPERADOR",
      nombre: "Juan Pérez",
      entregaReciboFiscal: "true",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza DUI mal formado", () => {
    const r = donanteSchema.safeParse({
      tipo: "COOPERADOR",
      nombre: "Juan Pérez",
      dui: "abc",
    });
    expect(r.success).toBe(false);
  });

  it("acepta DUI bien formado", () => {
    const r = donanteSchema.safeParse({
      tipo: "COOPERADOR",
      nombre: "Juan Pérez",
      dui: "12345678-9",
    });
    expect(r.success).toBe(true);
  });

  it("acepta NIT homologado (igual al DUI)", () => {
    const r = donanteSchema.safeParse({
      tipo: "COOPERADOR",
      nombre: "Juan Pérez",
      nit: "12345678-9",
    });
    expect(r.success).toBe(true);
  });

  it("acepta NIT tradicional XXXX-XXXXXX-XXX-X", () => {
    const r = donanteSchema.safeParse({
      tipo: "COOPERADOR",
      nombre: "Juan Pérez",
      nit: "0614-010120-101-1",
    });
    expect(r.success).toBe(true);
  });

  it("acepta campos DUI/NIT vacíos sin error", () => {
    const r = donanteSchema.safeParse({
      tipo: "COOPERADOR",
      nombre: "Juan Pérez",
      dui: "",
      nit: "",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza NIT con formato distinto", () => {
    const r = donanteSchema.safeParse({
      tipo: "COOPERADOR",
      nombre: "Juan Pérez",
      nit: "12-34-56",
    });
    expect(r.success).toBe(false);
  });

  it("requiere planFE para empresa", () => {
    const r = donanteSchema.safeParse({
      tipo: "EMPRESA_FE",
      nombre: "Acme S.A.",
      razonSocial: "Acme S.A. de C.V.",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("planFE"))).toBe(true);
    }
  });

  it("acepta empresa con plan", () => {
    const r = donanteSchema.safeParse({
      tipo: "EMPRESA_FE",
      nombre: "Acme S.A.",
      razonSocial: "Acme S.A. de C.V.",
      planFE: "GOLD",
    });
    expect(r.success).toBe(true);
  });
});

describe("movimientoSchema", () => {
  it("rechaza monto negativo", () => {
    const r = movimientoSchema.safeParse({
      fecha: "2026-05-03",
      tipo: "INGRESO",
      conceptoId: "c1",
      cuentaId: "cu1",
      monto: "-50.00",
      descripcion: "Donación",
      medioPago: "EFECTIVO",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza monto cero", () => {
    const r = movimientoSchema.safeParse({
      fecha: "2026-05-03",
      tipo: "INGRESO",
      conceptoId: "c1",
      cuentaId: "cu1",
      monto: "0",
      descripcion: "x",
    });
    expect(r.success).toBe(false);
  });

  it("acepta movimiento válido", () => {
    const r = movimientoSchema.safeParse({
      fecha: "2026-05-03",
      tipo: "INGRESO",
      conceptoId: "c1",
      cuentaId: "cu1",
      monto: "100.50",
      descripcion: "Donación de Juan Pérez",
      medioPago: "EFECTIVO",
    });
    expect(r.success).toBe(true);
  });
});

describe("cuentaSchema", () => {
  it("default saldo 0", () => {
    const r = cuentaSchema.safeParse({
      nombre: "Caja chica",
      tipo: "CAJA_CHICA",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.saldoInicial).toBe("0");
  });
});
