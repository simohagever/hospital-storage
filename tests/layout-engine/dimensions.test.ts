import { describe, expect, it } from "vitest";
import { resolveDimensions } from "@/lib/layout-engine/dimensions";
import { LayoutEngineError } from "@/lib/layout-engine/types";
import type { ParametricConfig } from "@/lib/validation/schemas";

// Mirrors the real seeded "Cell Boxes" product (prisma/seed.ts) so these tests stay
// honest about the shape actually stored in the database, not just an idealized one.
const cellBoxesConfig: ParametricConfig = {
  columns: { paramName: "columns", label: "Columns", min: 1, max: 8, defaultValue: 3 },
  drawersPerColumn: { paramName: "drawersPerColumn", label: "Drawers per column", min: 1, max: 20, defaultValue: 5 },
  rows: { paramName: "rows", label: "Rows", min: 1, max: 6, defaultValue: 1 },
  topOption: {
    paramName: "hasTop",
    label: "Top shelf",
    defaultEnabled: true,
    heightParamName: "topHeight",
    heightLabel: "Top shelf height",
    minHeight: 0.05,
    maxHeight: 0.5,
    defaultHeight: 0.1,
  },
};

const parametricProduct = {
  dimensionType: "PARAMETRIC" as const,
  width: null,
  height: null,
  depth: 0.455,
  parametricConfig: cellBoxesConfig,
};

describe("resolveDimensions / FIXED", () => {
  const fixedProduct = {
    dimensionType: "FIXED" as const,
    width: 0.455,
    height: 2.55,
    depth: 0.8,
    parametricConfig: null,
  };

  it("returns the product's own width/height/depth unchanged", () => {
    expect(resolveDimensions(fixedProduct, null)).toEqual({ width: 0.455, height: 2.55, depth: 0.8 });
  });

  it("throws if width, height, or depth is missing", () => {
    expect(() => resolveDimensions({ ...fixedProduct, width: null }, null)).toThrow(LayoutEngineError);
    expect(() => resolveDimensions({ ...fixedProduct, height: null }, null)).toThrow(LayoutEngineError);
    expect(() => resolveDimensions({ ...fixedProduct, depth: null }, null)).toThrow(LayoutEngineError);
  });
});

describe("resolveDimensions / PARAMETRIC", () => {
  it("throws if parametricConfig is missing", () => {
    expect(() => resolveDimensions({ ...parametricProduct, parametricConfig: null }, null)).toThrow(
      LayoutEngineError,
    );
  });

  it("throws if depth is missing", () => {
    expect(() => resolveDimensions({ ...parametricProduct, depth: null }, null)).toThrow(LayoutEngineError);
  });

  it("computes the default Cell Boxes size (3 columns, 5 drawers, 1 row, top on)", () => {
    const result = resolveDimensions(parametricProduct, null);
    // width: 3 * 0.332 + 4 * 0.03 = 1.116
    // oneRowHeight: 5 * (0.1 + 0.01) = 0.55; rowsHeight: 1 * 0.55 + 2 * 0.03 = 0.61
    // height: rowsHeight + default topHeight (0.1) = 0.71
    expect(result.width).toBeCloseTo(1.116, 10);
    expect(result.height).toBeCloseTo(0.71, 10);
    expect(result.depth).toBe(0.455);
  });

  it("matches the legacy two-column locker width (0.754m) at columns=2", () => {
    const result = resolveDimensions(parametricProduct, { columns: 2 });
    expect(result.width).toBeCloseTo(0.754, 10);
  });

  it("matches the legacy three-column locker width (1.116m) at columns=3", () => {
    const result = resolveDimensions(parametricProduct, { columns: 3 });
    expect(result.width).toBeCloseTo(1.116, 10);
  });

  it("stacks rows with one shared divider between them, not two full sets", () => {
    // rows=2, top off: rowsHeight = 2 * 0.55 + 3 * 0.03 = 1.19 (3 dividers, not 4)
    const result = resolveDimensions(parametricProduct, { rows: 2, hasTop: 0 });
    expect(result.height).toBeCloseTo(1.19, 10);
  });

  it("excludes the top shelf height when hasTop=0", () => {
    const result = resolveDimensions(parametricProduct, { hasTop: 0 });
    expect(result.height).toBeCloseTo(0.61, 10);
  });

  it("throws on a non-finite columns value instead of silently miscomputing", () => {
    expect(() => resolveDimensions(parametricProduct, { columns: NaN })).toThrow(LayoutEngineError);
  });

  it("throws on a non-finite top-shelf toggle value", () => {
    expect(() => resolveDimensions(parametricProduct, { hasTop: NaN })).toThrow(LayoutEngineError);
  });

  it("throws when columns is below the configured minimum", () => {
    expect(() => resolveDimensions(parametricProduct, { columns: 0 })).toThrow(LayoutEngineError);
  });

  it("throws when columns is above the configured maximum", () => {
    expect(() => resolveDimensions(parametricProduct, { columns: 9 })).toThrow(LayoutEngineError);
  });

  it("throws when the top shelf height is outside its configured range", () => {
    expect(() => resolveDimensions(parametricProduct, { hasTop: 1, topHeight: 0.6 })).toThrow(LayoutEngineError);
  });
});
