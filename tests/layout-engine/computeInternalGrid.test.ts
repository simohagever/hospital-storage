import { describe, expect, it } from "vitest";
import { computeInternalGrid } from "@/lib/layout-engine/computeInternalGrid";
import {
  COLUMN_DIVIDER,
  COLUMN_WIDTH,
  DRAWER_GAP,
  DRAWER_HEIGHT,
  ROW_DIVIDER,
} from "@/lib/layout-engine/dimensions";
import type { ParametricConfig } from "@/lib/validation/schemas";

const config: ParametricConfig = {
  columns: { paramName: "columns", label: "Columns", min: 1, max: 8, defaultValue: 3 },
  drawersPerColumn: { paramName: "drawersPerColumn", label: "Drawers per column", min: 1, max: 20, defaultValue: 5 },
  rows: { paramName: "rows", label: "Rows", min: 1, max: 6, defaultValue: 1 },
  topOption: {
    paramName: "hasTop",
    label: "Top shelf",
    defaultEnabled: true,
    heightParamName: "topHeight",
    heightLabel: "Top shelf height (m)",
    minHeight: 0.1,
    maxHeight: 1.5,
    defaultHeight: 0.9,
    shelvesCount: { paramName: "topShelves", label: "Top shelves", min: 1, max: 3, defaultValue: 3 },
  },
};

describe("computeInternalGrid — columns", () => {
  it("produces n+1 col-dividers and n column bays for n columns", () => {
    const { columns } = computeInternalGrid(config, { columns: 3 });
    expect(columns.filter((s) => s.kind === "col-divider")).toHaveLength(4);
    expect(columns.filter((s) => s.kind === "column")).toHaveLength(3);
  });

  it("total column width = n*COLUMN_WIDTH + (n+1)*COLUMN_DIVIDER", () => {
    const n = 3;
    const { columns } = computeInternalGrid(config, { columns: n });
    const total = columns.reduce((s, c) => s + c.size, 0);
    expect(total).toBeCloseTo(n * COLUMN_WIDTH + (n + 1) * COLUMN_DIVIDER, 10);
  });

  it("all dividers are exactly COLUMN_DIVIDER wide", () => {
    const { columns } = computeInternalGrid(config, { columns: 2 });
    columns.filter((s) => s.kind === "col-divider").forEach((d) => {
      expect(d.size).toBeCloseTo(COLUMN_DIVIDER, 10);
    });
  });

  it("all column bays are exactly COLUMN_WIDTH wide", () => {
    const { columns } = computeInternalGrid(config, { columns: 2 });
    columns.filter((s) => s.kind === "column").forEach((c) => {
      expect(c.size).toBeCloseTo(COLUMN_WIDTH, 10);
    });
  });
});

describe("computeInternalGrid — rows", () => {
  it("1 row without top produces: row-divider, drawers, row-divider", () => {
    const { rows } = computeInternalGrid(config, { rows: 1, hasTop: 0 });
    expect(rows.map((r) => r.kind)).toEqual(["row-divider", "drawers", "row-divider"]);
  });

  it("2 rows have exactly 3 dividers — no double-divider between row blocks", () => {
    const { rows } = computeInternalGrid(config, { rows: 2, hasTop: 0 });
    expect(rows.filter((r) => r.kind === "row-divider")).toHaveLength(3);
  });

  it("drawer block height = n*(DRAWER_HEIGHT+DRAWER_GAP) — trailing gap after last drawer", () => {
    const n = 5;
    const { rows } = computeInternalGrid(config, { drawersPerColumn: n, hasTop: 0 });
    const block = rows.find((r) => r.kind === "drawers")!;
    expect(block.size).toBeCloseTo(n * (DRAWER_HEIGHT + DRAWER_GAP), 10);
  });

  it("drawer block carries drawerHeight = DRAWER_HEIGHT for annotation", () => {
    const { rows } = computeInternalGrid(config, { hasTop: 0 });
    const block = rows.find((r) => r.kind === "drawers")!;
    expect(block.drawerHeight).toBeCloseTo(DRAWER_HEIGHT, 10);
  });

  it("top shelf appears when hasTop=1, carries the given height and shelvesCount", () => {
    const { rows } = computeInternalGrid(config, { hasTop: 1, topHeight: 0.6, topShelves: 2 });
    const top = rows.find((r) => r.kind === "top-shelf")!;
    expect(top).toBeDefined();
    expect(top.size).toBeCloseTo(0.6, 10);
    expect(top.shelvesCount).toBe(2);
  });

  it("no top shelf when hasTop=0", () => {
    const { rows } = computeInternalGrid(config, { hasTop: 0 });
    expect(rows.find((r) => r.kind === "top-shelf")).toBeUndefined();
  });

  it("total row height matches formula: rows*(drawerBlock + 2*ROW_DIVIDER) minus extra", () => {
    const n = 1;
    const drawers = 5;
    const { rows } = computeInternalGrid(config, { rows: n, drawersPerColumn: drawers, hasTop: 0 });
    const drawerBlock = drawers * (DRAWER_HEIGHT + DRAWER_GAP);
    const expected = n * drawerBlock + (n + 1) * ROW_DIVIDER;
    const actual = rows.reduce((s, r) => s + r.size, 0);
    expect(actual).toBeCloseTo(expected, 10);
  });

  it("section offsets are monotonically increasing with no gaps", () => {
    const { rows } = computeInternalGrid(config, { rows: 2, hasTop: 1 });
    let cursor = 0;
    for (const section of rows) {
      expect(section.offset).toBeCloseTo(cursor, 10);
      cursor += section.size;
    }
  });
});
