import type { LayoutInputItem, LayoutResult, LayoutWarning, PlacedInstance, PlacedRow } from "./types";

// Sub-micron tolerance for fit comparisons. Widths/heights come from repeated decimal
// arithmetic (e.g. dimensions.ts) and can land a few ULPs off an exact value (0.6 + 0.1
// = 0.7000000000000001) — this absorbs that noise without ever masking a real-world
// overflow, which would be off by millimeters or more.
const EPSILON = 1e-6;

interface RowTracker {
  rowIndex: number;
  y: number;
  usedWidth: number;
  rowHeight: number;
}

// Row-based shelf packing: items are placed left-to-right in the order given
// (item.sortOrder), wrapping to a new row stacked upward when a row runs out of
// width. This is intentionally order-preserving, not an optimizer that reorders items
// to minimize wasted space — placement order is part of the user's input, not
// something the engine should second-guess.
export function packWall(wallWidth: number, wallHeight: number, items: LayoutInputItem[]): LayoutResult {
  if (!(wallWidth > 0) || !(wallHeight > 0)) {
    return { fits: false, rows: [], placements: [], usedWidth: 0, usedHeight: 0, unplaced: [...items], warnings: [] };
  }

  const sortedItems = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  const placements: PlacedInstance[] = [];
  const rows: PlacedRow[] = [];
  const unplaced: LayoutInputItem[] = [];
  const warnings: LayoutWarning[] = [];

  let row: RowTracker | null = null;
  let cursorY = 0;

  const finalizeRow = () => {
    if (row && row.usedWidth > 0) {
      rows.push({ rowIndex: row.rowIndex, y: row.y, rowHeight: row.rowHeight, usedWidth: row.usedWidth });
      cursorY += row.rowHeight;
    }
    row = null;
  };

  for (const item of sortedItems) {
    const { width, height, depth } = item.dimensions;

    // Item exceeds the wall's full width/height outright — no row at any cursorY
    // could ever fit it, so reject it immediately without attempting any units.
    if (width > wallWidth + EPSILON) {
      unplaced.push(item);
      warnings.push({
        code: "ITEM_EXCEEDS_WALL_WIDTH",
        message: `${item.productName} (${width}m wide) is wider than the wall (${wallWidth}m)`,
        configItemId: item.configItemId,
      });
      continue;
    }

    if (height > wallHeight + EPSILON) {
      unplaced.push(item);
      warnings.push({
        code: "ITEM_EXCEEDS_WALL_HEIGHT",
        message: `${item.productName} (${height}m tall) is taller than the wall (${wallHeight}m)`,
        configItemId: item.configItemId,
      });
      continue;
    }

    let placedCount = 0;

    for (let unitIndex = 0; unitIndex < item.quantity; unitIndex++) {
      if (row !== null && row.usedWidth + width > wallWidth + EPSILON) {
        finalizeRow();
      }

      if (row === null) {
        // A fresh row would start at the current cursorY — if even an empty row
        // can't fit this item's height there, no further units of *this* item will
        // fit either, so stop trying for it. This only breaks the inner per-item
        // loop: a later, shorter item may still fit at this same cursorY, so it gets
        // its own independent attempt rather than being blocked by this one.
        if (cursorY + height > wallHeight + EPSILON) {
          break;
        }
        row = { rowIndex: rows.length, y: cursorY, usedWidth: 0, rowHeight: 0 };
      }

      placements.push({
        instanceKey: `${item.configItemId}#${unitIndex}`,
        configItemId: item.configItemId,
        productId: item.productId,
        productName: item.productName,
        rowIndex: row.rowIndex,
        sortOrder: unitIndex,
        positionX: row.usedWidth,
        positionY: row.y,
        positionZ: 0,
        actualWidth: width,
        actualHeight: height,
        actualDepth: depth,
        imageUrl: item.imageUrl,
        defaultColor: item.defaultColor,
      });

      row.usedWidth += width;
      row.rowHeight = Math.max(row.rowHeight, height);
      placedCount++;
    }

    if (placedCount < item.quantity) {
      const remaining = item.quantity - placedCount;
      unplaced.push({ ...item, quantity: remaining });
      warnings.push({
        code: "WALL_OVERFLOW_HEIGHT",
        message: `${remaining} of ${item.quantity}x ${item.productName} did not fit: wall ran out of height`,
        configItemId: item.configItemId,
      });
    }
  }

  finalizeRow();

  const usedWidth = rows.reduce((max, r) => Math.max(max, r.usedWidth), 0);
  const usedHeight = cursorY;
  const fits = unplaced.length === 0;

  return { fits, rows, placements, usedWidth, usedHeight, unplaced, warnings };
}
