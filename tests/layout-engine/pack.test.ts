import { describe, expect, it } from "vitest";
import { packWall } from "@/lib/layout-engine/pack";
import type { LayoutInputItem } from "@/lib/layout-engine/types";

function item(overrides: Partial<LayoutInputItem> & Pick<LayoutInputItem, "configItemId" | "dimensions">): LayoutInputItem {
  return {
    productId: "prod",
    productName: "Product",
    quantity: 1,
    sortOrder: 0,
    ...overrides,
  };
}

describe("packWall", () => {
  it("fits multiple items in one row when their combined width is within the wall", () => {
    // 0.455 + 0.754 + 1.116 = 2.325, fits a 2.5m wall
    const result = packWall(2.5, 2.6, [
      item({ configItemId: "a", dimensions: { width: 0.455, height: 2.55, depth: 0.8 }, sortOrder: 0 }),
      item({ configItemId: "b", dimensions: { width: 0.754, height: 2.55, depth: 0.8 }, sortOrder: 1 }),
      item({ configItemId: "c", dimensions: { width: 1.116, height: 2.55, depth: 0.8 }, sortOrder: 2 }),
    ]);

    expect(result.fits).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.unplaced).toHaveLength(0);
  });

  it("wraps to a second row when width runs out", () => {
    // Same three items, now on a wall too narrow (2.0m) for all three in one row
    const result = packWall(2.0, 5.2, [
      item({ configItemId: "a", dimensions: { width: 0.455, height: 2.55, depth: 0.8 }, sortOrder: 0 }),
      item({ configItemId: "b", dimensions: { width: 0.754, height: 2.55, depth: 0.8 }, sortOrder: 1 }),
      item({ configItemId: "c", dimensions: { width: 1.116, height: 2.55, depth: 0.8 }, sortOrder: 2 }),
    ]);

    expect(result.fits).toBe(true);
    expect(result.rows).toHaveLength(2);
    const c = result.placements.find((p) => p.configItemId === "c");
    expect(c?.rowIndex).toBe(1);
    expect(c?.positionY).toBeCloseTo(2.55, 10);
  });

  it("expands quantity into one placement per unit with sequential x offsets", () => {
    const result = packWall(5, 3, [
      item({ configItemId: "d", quantity: 4, dimensions: { width: 1, height: 1, depth: 0.5 } }),
    ]);

    expect(result.placements).toHaveLength(4);
    expect(result.placements.map((p) => p.positionX)).toEqual([0, 1, 2, 3]);
    expect(result.placements.map((p) => p.instanceKey)).toEqual(["d#0", "d#1", "d#2", "d#3"]);
  });

  it("rejects an item wider than the wall outright, without attempting any units", () => {
    const result = packWall(1, 3, [item({ configItemId: "e", dimensions: { width: 2, height: 1, depth: 0.5 } })]);

    expect(result.fits).toBe(false);
    expect(result.placements).toHaveLength(0);
    expect(result.unplaced).toEqual([expect.objectContaining({ configItemId: "e", quantity: 1 })]);
    expect(result.warnings[0]?.code).toBe("ITEM_EXCEEDS_WALL_WIDTH");
  });

  it("rejects an item taller than the wall outright", () => {
    const result = packWall(3, 1, [item({ configItemId: "f", dimensions: { width: 1, height: 2, depth: 0.5 } })]);

    expect(result.fits).toBe(false);
    expect(result.placements).toHaveLength(0);
    expect(result.warnings[0]?.code).toBe("ITEM_EXCEEDS_WALL_HEIGHT");
  });

  it("splits a partially-fitting quantity: placed units stay placed, the rest are reported unplaced", () => {
    // wall height 1.2m fits exactly one 1m-tall row; a 2nd unit has no room above it
    const result = packWall(1, 1.2, [item({ configItemId: "g", quantity: 2, dimensions: { width: 1, height: 1, depth: 0.5 } })]);

    expect(result.placements).toHaveLength(1);
    expect(result.unplaced).toEqual([expect.objectContaining({ configItemId: "g", quantity: 1 })]);
    expect(result.warnings[0]?.code).toBe("WALL_OVERFLOW_HEIGHT");
  });

  it("lets a later, shorter item fit in the remaining vertical room a taller item couldn't use", () => {
    const result = packWall(1, 1.2, [
      item({ configItemId: "tall", quantity: 2, dimensions: { width: 1, height: 1, depth: 0.5 }, sortOrder: 0 }),
      item({ configItemId: "short", quantity: 1, dimensions: { width: 1, height: 0.1, depth: 0.5 }, sortOrder: 1 }),
    ]);

    const tallUnplaced = result.unplaced.find((u) => u.configItemId === "tall");
    const shortPlaced = result.placements.find((p) => p.configItemId === "short");
    expect(tallUnplaced?.quantity).toBe(1);
    expect(shortPlaced).toBeDefined();
    expect(shortPlaced?.positionY).toBeCloseTo(1, 10);
  });

  it("does not false-overflow on floating-point noise at the row-width boundary", () => {
    const result = packWall(0.754, 3, [
      item({ configItemId: "x", dimensions: { width: 0.332, height: 1, depth: 0.5 }, sortOrder: 0 }),
      // Arithmetically 0.332, but computed via addition/subtraction so it may differ
      // by a few ULPs from the literal 0.332 above.
      item({ configItemId: "y", dimensions: { width: 0.332 + 0.03 + 0.03 - 0.06, height: 1, depth: 0.5 }, sortOrder: 1 }),
    ]);

    expect(result.rows).toHaveLength(1);
    expect(result.fits).toBe(true);
  });

  it("bottom-aligns mixed-height items within the same row", () => {
    const result = packWall(2, 3, [
      item({ configItemId: "short", dimensions: { width: 1, height: 0.5, depth: 0.5 }, sortOrder: 0 }),
      item({ configItemId: "tall", dimensions: { width: 1, height: 1.5, depth: 0.5 }, sortOrder: 1 }),
    ]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.rowHeight).toBeCloseTo(1.5, 10);
    const short = result.placements.find((p) => p.configItemId === "short");
    const tall = result.placements.find((p) => p.configItemId === "tall");
    expect(short?.positionY).toBe(tall?.positionY);
  });

  it("respects sortOrder rather than input array order when placing items", () => {
    const result = packWall(2, 3, [
      item({ configItemId: "second", dimensions: { width: 1, height: 1, depth: 0.5 }, sortOrder: 1 }),
      item({ configItemId: "first", dimensions: { width: 1, height: 1, depth: 0.5 }, sortOrder: 0 }),
    ]);

    expect(result.placements.map((p) => p.configItemId)).toEqual(["first", "second"]);
  });

  it("returns an empty, fitting result for no items", () => {
    const result = packWall(3, 3, []);
    expect(result).toEqual({ fits: true, rows: [], placements: [], usedWidth: 0, usedHeight: 0, unplaced: [], warnings: [] });
  });
});
