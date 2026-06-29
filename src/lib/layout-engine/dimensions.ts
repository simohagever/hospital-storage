import type { CountSetting, ParametricConfig } from "@/lib/validation/schemas";
import { LayoutEngineError, type ResolvedDimensions } from "./types";

interface ProductDimensionInput {
  dimensionType: "FIXED" | "PARAMETRIC";
  width: number | null;
  height: number | null;
  depth: number | null;
  parametricConfig: ParametricConfig | null;
}

// Physical material constants for the Cell Boxes product (meters). Column/row
// dividers are real strips that end-cap the stack (n units -> n+1 strips); drawer
// gaps are empty clearance between drawers only (n units -> n-1 gaps, no end caps).
const COLUMN_WIDTH = 0.332;
const COLUMN_DIVIDER = 0.03;
const DRAWER_HEIGHT = 0.1;
const DRAWER_GAP = 0.01;
const ROW_DIVIDER = 0.03;

// params comes from WallConfigurationItem.params, an unvalidated Json? column — so a
// stray NaN or non-numeric value can reach here. Comparisons against NaN are always
// false, which would otherwise let bad data slip silently past the min/max checks
// below instead of failing loudly.
function readNumber(params: Record<string, number> | null, paramName: string, fallback: number): number {
  const raw = params?.[paramName];
  if (raw == null) return fallback;
  if (!Number.isFinite(raw)) {
    throw new LayoutEngineError(`Param "${paramName}" must be a finite number (got ${raw})`);
  }
  return raw;
}

function readCount(params: Record<string, number> | null, setting: CountSetting): number {
  const raw = readNumber(params, setting.paramName, setting.defaultValue);
  const n = Math.round(raw);
  if (n < setting.min || n > setting.max) {
    throw new LayoutEngineError(
      `Param "${setting.paramName}" must be between ${setting.min} and ${setting.max} (got ${raw})`,
    );
  }
  return n;
}

export function resolveDimensions(
  product: ProductDimensionInput,
  params: Record<string, number> | null,
): ResolvedDimensions {
  if (product.dimensionType === "FIXED") {
    if (product.width == null || product.height == null || product.depth == null) {
      throw new LayoutEngineError("FIXED product is missing width, height, or depth");
    }
    return { width: product.width, height: product.height, depth: product.depth };
  }

  if (!product.parametricConfig) {
    throw new LayoutEngineError("PARAMETRIC product is missing parametricConfig");
  }
  if (product.depth == null) {
    throw new LayoutEngineError("PARAMETRIC product is missing depth");
  }

  const { columns: columnsSetting, drawersPerColumn: drawersSetting, rows: rowsSetting, topOption } =
    product.parametricConfig;

  const columns = readCount(params, columnsSetting);
  const width = columns * COLUMN_WIDTH + (columns + 1) * COLUMN_DIVIDER;

  const drawersPerColumn = readCount(params, drawersSetting);
  const oneRowHeight = drawersPerColumn * DRAWER_HEIGHT + (drawersPerColumn - 1) * DRAWER_GAP;

  const rows = readCount(params, rowsSetting);
  const rowsHeight = rows * oneRowHeight + (rows + 1) * ROW_DIVIDER;

  const rawHasTop = params?.[topOption.paramName];
  let hasTop: boolean;
  if (rawHasTop == null) {
    hasTop = topOption.defaultEnabled;
  } else if (!Number.isFinite(rawHasTop)) {
    throw new LayoutEngineError(`Param "${topOption.paramName}" must be a finite number (got ${rawHasTop})`);
  } else {
    hasTop = rawHasTop !== 0;
  }

  let topHeight = 0;
  if (hasTop) {
    const raw = readNumber(params, topOption.heightParamName, topOption.defaultHeight);
    if (raw < topOption.minHeight || raw > topOption.maxHeight) {
      throw new LayoutEngineError(
        `Param "${topOption.heightParamName}" must be between ${topOption.minHeight} and ${topOption.maxHeight} (got ${raw})`,
      );
    }
    topHeight = raw;
  }

  return { width, height: rowsHeight + topHeight, depth: product.depth };
}
