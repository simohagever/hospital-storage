import type { ParametricConfig } from "@/lib/validation/schemas";
import { COLUMN_DIVIDER, COLUMN_WIDTH, DRAWER_GAP, DRAWER_HEIGHT, ROW_DIVIDER, readCount, readNumber } from "./dimensions";
import type { GridSection, InternalGrid } from "./types";

// Builds the structural section breakdown for one placed parametric item.
// Drawer cells and their 0.01m gaps are NOT individually subdivided —
// the entire drawer area for a row block is one 'drawers' section,
// with drawerHeight carrying the height of a single drawer for annotation.
export function computeInternalGrid(
  config: ParametricConfig,
  params: Record<string, number> | null,
): InternalGrid {
  const nColumns = readCount(params, config.columns);
  const drawersPerCol = readCount(params, config.drawersPerColumn);
  const nRows = readCount(params, config.rows);
  const rawHasTop = params?.[config.topOption.paramName];
  // == null catches both null and undefined (rawHasTop is undefined when the param
  // is absent from the params map), falling back to the config default.
  const hasTop = rawHasTop == null ? config.topOption.defaultEnabled : rawHasTop !== 0;
  const topHeight = hasTop
    ? readNumber(params, config.topOption.heightParamName, config.topOption.defaultHeight)
    : 0;

  // Column sections — left to right: divider, column, divider, column, ..., divider
  const columns: GridSection[] = [];
  let x = 0;
  for (let c = 0; c <= nColumns; c++) {
    columns.push({ offset: x, size: COLUMN_DIVIDER, kind: "col-divider" });
    x += COLUMN_DIVIDER;
    if (c < nColumns) {
      columns.push({ offset: x, size: COLUMN_WIDTH, kind: "column" });
      x += COLUMN_WIDTH;
    }
  }

  // Row sections — bottom to top.
  // Pattern: row-divider, drawers, row-divider, drawers, ..., row-divider, [top-shelf]
  // One divider per boundary (n rows → n+1 dividers), matching dimensions.ts's formula:
  //   rowsHeight = rows * oneRowHeight + (rows + 1) * ROW_DIVIDER
  // Each drawer slot includes the trailing 0.01m gap (same formula as dimensions.ts).
  const drawerBlockHeight = drawersPerCol * (DRAWER_HEIGHT + DRAWER_GAP);
  const rows: GridSection[] = [];
  let y = 0;
  for (let r = 0; r < nRows; r++) {
    rows.push({ offset: y, size: ROW_DIVIDER, kind: "row-divider" });
    y += ROW_DIVIDER;
    rows.push({ offset: y, size: drawerBlockHeight, kind: "drawers", drawerHeight: DRAWER_HEIGHT, drawerCount: drawersPerCol });
    y += drawerBlockHeight;
  }
  rows.push({ offset: y, size: ROW_DIVIDER, kind: "row-divider" });
  y += ROW_DIVIDER;

  if (hasTop) {
    rows.push({ offset: y, size: topHeight, kind: "top-shelf" });
  }

  return { columns, rows };
}
