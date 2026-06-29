import { z } from "zod";

// Mirrors Product.parametricConfig's JSON shape (see prisma/schema.prisma comment).
// This is the single source of truth for that shape — every write path (seed, admin
// API, layout engine) validates against this instead of trusting the raw JSON.
//
// There is only one parametric product ("Cell Boxes"), and its settings are
// genuinely interdependent (rows repeats an already-computed row block; the top
// shelf's width is derived from columns, not independent) — so this is a bespoke,
// named-field shape rather than a generic list of interchangeable axes.

export const CountSettingSchema = z
  .object({
    paramName: z.string().min(1),
    label: z.string().min(1),
    // 1000 is a sanity ceiling, not a real business limit — it exists only to catch
    // typos (e.g. an extra zero) that would otherwise produce absurd dimensions.
    min: z.number().int().positive().max(1000),
    max: z.number().int().positive().max(1000),
    defaultValue: z.number().int().positive().max(1000),
  })
  .refine((s) => s.min <= s.max, {
    message: "min must be less than or equal to max",
    path: ["max"],
  })
  .refine((s) => s.defaultValue >= s.min && s.defaultValue <= s.max, {
    message: "defaultValue must be within [min, max]",
    path: ["defaultValue"],
  });

export const TopOptionSchema = z
  .object({
    paramName: z.string().min(1), // boolean toggle, carried as 1/0 in params
    label: z.string().min(1),
    defaultEnabled: z.boolean(),
    heightParamName: z.string().min(1),
    heightLabel: z.string().min(1),
    // 10 (meters) is a sanity ceiling for a height field, not a real business limit —
    // .max(1000) would be meaningless here since these are meters, not unit counts.
    minHeight: z.number().positive().max(10),
    maxHeight: z.number().positive().max(10),
    defaultHeight: z.number().positive().max(10),
  })
  .refine((s) => s.minHeight <= s.maxHeight, {
    message: "minHeight must be less than or equal to maxHeight",
    path: ["maxHeight"],
  })
  .refine((s) => s.defaultHeight >= s.minHeight && s.defaultHeight <= s.maxHeight, {
    message: "defaultHeight must be within [minHeight, maxHeight]",
    path: ["defaultHeight"],
  });

export const ParametricConfigSchema = z
  .object({
    columns: CountSettingSchema,
    drawersPerColumn: CountSettingSchema,
    rows: CountSettingSchema,
    topOption: TopOptionSchema,
  })
  .superRefine((config, ctx) => {
    const firstPathByName = new Map<string, string>();
    const entries: [string, [string, ...string[]]][] = [
      [config.columns.paramName, ["columns", "paramName"]],
      [config.drawersPerColumn.paramName, ["drawersPerColumn", "paramName"]],
      [config.rows.paramName, ["rows", "paramName"]],
      [config.topOption.paramName, ["topOption", "paramName"]],
      [config.topOption.heightParamName, ["topOption", "heightParamName"]],
    ];

    for (const [name, path] of entries) {
      const takenBy = firstPathByName.get(name);
      if (takenBy !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: `paramName "${name}" is already used by ${takenBy}`,
          path,
        });
      } else {
        firstPathByName.set(name, path.join("."));
      }
    }
  });

export type CountSetting = z.infer<typeof CountSettingSchema>;
export type TopOption = z.infer<typeof TopOptionSchema>;
export type ParametricConfig = z.infer<typeof ParametricConfigSchema>;

// Mirrors LayoutWarning (lib/layout-engine/types.ts). Used to safely re-validate
// WallConfiguration.warnings when reading it back from the database, rather than
// blindly casting — it's written by our own code today, but this guards against
// silent drift if that shape ever changes without updating every read site.
export const LayoutWarningSchema = z.object({
  code: z.enum(["ITEM_EXCEEDS_WALL_WIDTH", "ITEM_EXCEEDS_WALL_HEIGHT", "WALL_OVERFLOW_HEIGHT"]),
  message: z.string(),
  configItemId: z.string().optional(),
});

// 30m is a sanity ceiling (catches a misplaced decimal/unit mixup), not a real
// architectural limit. Exported so the client form/validation can enforce the exact
// same bound instead of duplicating the number and risking drift.
export const MAX_WALL_DIMENSION_METERS = 30;

// Input shape for POST /api/configurations. Values themselves (e.g. a parametric
// param out of its product's configured range) are validated by the layout engine at
// request time, since that depends on which product is referenced.
export const ConfigItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(1000),
  // null and undefined are both valid "no params" — a FIXED product's client payload
  // may naturally send either, depending on how the client serializes its state.
  params: z.record(z.string(), z.number()).nullable().optional(),
  // Optional: falls back to array index server-side if omitted (see POST /api/configurations).
  sortOrder: z.number().int().nonnegative().optional(),
});

export const CreateConfigurationInputSchema = z
  .object({
    name: z.string().min(1).max(200),
    wallWidth: z.number().positive().max(MAX_WALL_DIMENSION_METERS),
    wallHeight: z.number().positive().max(MAX_WALL_DIMENSION_METERS),
    // 200 distinct product lines is far beyond any real wall — bounded only so a
    // degenerate payload, combined with quantity's own max, can't force the packer
    // through an enormous number of iterations.
    items: z.array(ConfigItemInputSchema).min(1, "At least one item is required").max(200),
  })
  // A second, independent bound on top of items.length and each item's own quantity
  // cap: those two alone still allow a worst case of 200 * 1000 = 200,000 physical
  // units to pack in one request. This caps the actual total work, without
  // restricting any single realistic line item's quantity.
  .refine((input) => input.items.reduce((sum, item) => sum + item.quantity, 0) <= 2000, {
    message: "Total quantity across all items cannot exceed 2000",
    path: ["items"],
  });

export type ConfigItemInput = z.infer<typeof ConfigItemInputSchema>;
export type CreateConfigurationInput = z.infer<typeof CreateConfigurationInputSchema>;
