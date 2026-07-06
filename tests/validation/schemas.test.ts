import { describe, expect, it } from "vitest";
import {
  ConfigItemInputSchema,
  CountSettingSchema,
  CreateConfigurationInputSchema,
  ParametricConfigSchema,
  TopOptionSchema,
} from "@/lib/validation/schemas";

describe("CountSettingSchema", () => {
  const base = { paramName: "columns", label: "Columns", min: 1, max: 8, defaultValue: 3 };

  it("accepts a normal range", () => {
    expect(CountSettingSchema.safeParse(base).success).toBe(true);
  });

  it("accepts the degenerate boundary where min === max === defaultValue", () => {
    expect(CountSettingSchema.safeParse({ ...base, min: 5, max: 5, defaultValue: 5 }).success).toBe(true);
  });

  it("rejects min > max", () => {
    expect(CountSettingSchema.safeParse({ ...base, min: 8, max: 1 }).success).toBe(false);
  });

  it("rejects defaultValue outside [min, max]", () => {
    expect(CountSettingSchema.safeParse({ ...base, defaultValue: 0 }).success).toBe(false);
    expect(CountSettingSchema.safeParse({ ...base, defaultValue: 9 }).success).toBe(false);
  });

  it("rejects zero (not positive)", () => {
    expect(CountSettingSchema.safeParse({ ...base, min: 0 }).success).toBe(false);
  });

  it("rejects values above the 1000 sanity ceiling", () => {
    expect(CountSettingSchema.safeParse({ ...base, max: 1001 }).success).toBe(false);
  });
});

describe("TopOptionSchema", () => {
  const base = {
    paramName: "hasTop",
    label: "Top shelf",
    defaultEnabled: true,
    heightParamName: "topHeight",
    heightLabel: "Top shelf height (m)",
    minHeight: 0.1,
    maxHeight: 1.5,
    defaultHeight: 0.9,
    shelvesCount: { paramName: "topShelves", label: "Top shelves", min: 1, max: 3, defaultValue: 3 },
  };

  it("accepts a valid config regardless of defaultEnabled", () => {
    expect(TopOptionSchema.safeParse(base).success).toBe(true);
    expect(TopOptionSchema.safeParse({ ...base, defaultEnabled: false }).success).toBe(true);
  });

  it("rejects minHeight > maxHeight", () => {
    expect(TopOptionSchema.safeParse({ ...base, minHeight: 1.5, maxHeight: 0.1 }).success).toBe(false);
  });

  it("rejects defaultHeight outside [minHeight, maxHeight]", () => {
    expect(TopOptionSchema.safeParse({ ...base, defaultHeight: 0.01 }).success).toBe(false);
    expect(TopOptionSchema.safeParse({ ...base, defaultHeight: 2.0 }).success).toBe(false);
  });

  it("rejects invalid shelvesCount (min > max)", () => {
    const bad = { ...base, shelvesCount: { ...base.shelvesCount, min: 3, max: 1 } };
    expect(TopOptionSchema.safeParse(bad).success).toBe(false);
  });
});

describe("ParametricConfigSchema", () => {
  // Mirrors the real seeded "Cell Boxes" product (prisma/seed.ts).
  const validConfig = {
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

  it("accepts the real Cell Boxes config", () => {
    expect(ParametricConfigSchema.safeParse(validConfig).success).toBe(true);
  });

  it("rejects two settings sharing the same paramName", () => {
    const collision = { ...validConfig, rows: { ...validConfig.rows, paramName: "columns" } };
    const result = ParametricConfigSchema.safeParse(collision);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["rows", "paramName"]);
    }
  });

  it("rejects topOption.heightParamName colliding with another setting's paramName", () => {
    const collision = { ...validConfig, topOption: { ...validConfig.topOption, heightParamName: "columns" } };
    const result = ParametricConfigSchema.safeParse(collision);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["topOption", "heightParamName"]);
    }
  });

  it("rejects topOption.shelvesCount.paramName colliding with another setting's paramName", () => {
    const collision = {
      ...validConfig,
      topOption: { ...validConfig.topOption, shelvesCount: { ...validConfig.topOption.shelvesCount, paramName: "columns" } },
    };
    const result = ParametricConfigSchema.safeParse(collision);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["topOption", "shelvesCount", "paramName"]);
    }
  });
});

describe("ConfigItemInputSchema", () => {
  const base = { productId: "prod-1", quantity: 1, sortOrder: 0 };

  it("accepts a full item", () => {
    expect(ConfigItemInputSchema.safeParse({ ...base, params: { columns: 3 } }).success).toBe(true);
  });

  it("accepts a missing sortOrder", () => {
    const withoutSortOrder = { productId: base.productId, quantity: base.quantity };
    expect(ConfigItemInputSchema.safeParse(withoutSortOrder).success).toBe(true);
  });

  it("accepts params as either null or omitted", () => {
    expect(ConfigItemInputSchema.safeParse({ ...base, params: null }).success).toBe(true);
    expect(ConfigItemInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a quantity of zero", () => {
    expect(ConfigItemInputSchema.safeParse({ ...base, quantity: 0 }).success).toBe(false);
  });

  it("rejects a quantity above the 1000 sanity ceiling", () => {
    expect(ConfigItemInputSchema.safeParse({ ...base, quantity: 1001 }).success).toBe(false);
  });

  it("rejects an empty productId", () => {
    expect(ConfigItemInputSchema.safeParse({ ...base, productId: "" }).success).toBe(false);
  });
});

describe("CreateConfigurationInputSchema", () => {
  const validItem = { productId: "prod-1", quantity: 1, sortOrder: 0 };
  const base = { name: "Ward 4B", wallWidth: 4, wallHeight: 2.6, items: [validItem] };

  it("accepts a minimal valid configuration", () => {
    expect(CreateConfigurationInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an empty items array", () => {
    expect(CreateConfigurationInputSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });

  it("rejects more than 200 items", () => {
    const items = Array.from({ length: 201 }, (_, i) => ({ ...validItem, sortOrder: i }));
    expect(CreateConfigurationInputSchema.safeParse({ ...base, items }).success).toBe(false);
  });

  it("accepts exactly 200 items", () => {
    const items = Array.from({ length: 200 }, (_, i) => ({ ...validItem, sortOrder: i }));
    expect(CreateConfigurationInputSchema.safeParse({ ...base, items }).success).toBe(true);
  });

  it("rejects a total quantity above 2000 even when items.length is within its own limit", () => {
    const items = [
      { productId: "prod-1", quantity: 1000, sortOrder: 0 },
      { productId: "prod-2", quantity: 1000, sortOrder: 1 },
      { productId: "prod-3", quantity: 1, sortOrder: 2 },
    ];
    expect(CreateConfigurationInputSchema.safeParse({ ...base, items }).success).toBe(false);
  });

  it("accepts a total quantity of exactly 2000", () => {
    const items = [
      { productId: "prod-1", quantity: 1000, sortOrder: 0 },
      { productId: "prod-2", quantity: 1000, sortOrder: 1 },
    ];
    expect(CreateConfigurationInputSchema.safeParse({ ...base, items }).success).toBe(true);
  });

  it("rejects a non-positive wall dimension", () => {
    expect(CreateConfigurationInputSchema.safeParse({ ...base, wallWidth: 0 }).success).toBe(false);
  });

  it("rejects a wall dimension above the 30m sanity ceiling", () => {
    expect(CreateConfigurationInputSchema.safeParse({ ...base, wallWidth: 31 }).success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(CreateConfigurationInputSchema.safeParse({ ...base, name: "" }).success).toBe(false);
  });
});
