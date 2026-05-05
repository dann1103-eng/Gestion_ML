import { describe, it, expect } from "vitest";
import { formatMoney, montoEnLetras } from "@/lib/money";

describe("formatMoney", () => {
  it("formatea con dos decimales", () => {
    expect(formatMoney(100)).toMatch(/100\.00/);
    expect(formatMoney("1234.5")).toMatch(/1,234\.50/);
  });
});

describe("montoEnLetras", () => {
  it("convierte enteros básicos", () => {
    expect(montoEnLetras(0)).toBe("cero 00/100 dólares");
    expect(montoEnLetras(1)).toBe("uno 00/100 dólares");
    expect(montoEnLetras(15)).toBe("quince 00/100 dólares");
    expect(montoEnLetras(21)).toBe("veintiuno 00/100 dólares");
    expect(montoEnLetras(100)).toBe("cien 00/100 dólares");
    expect(montoEnLetras(125)).toBe("ciento veinticinco 00/100 dólares");
  });

  it("convierte miles", () => {
    expect(montoEnLetras(1000)).toBe("mil 00/100 dólares");
    expect(montoEnLetras(2500)).toBe("dos mil quinientos 00/100 dólares");
  });

  it("conserva centavos", () => {
    expect(montoEnLetras(125.5)).toBe("ciento veinticinco 50/100 dólares");
    expect(montoEnLetras(0.99)).toBe("cero 99/100 dólares");
  });
});
