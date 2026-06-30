export class LayoutEngineError extends Error {}

export interface ResolvedDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface LayoutInputItem {
  configItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  dimensions: ResolvedDimensions;
  imageUrl?: string;
  defaultColor?: string;
  sortOrder: number;
}

// Internal structural breakdown for a placed parametric item.
// Columns run left-to-right; rows run bottom-to-top.
// 'drawers' sections represent the full drawer block as ONE section —
// individual drawer cells and their 0.01m gaps are not subdivided.
export type GridSectionKind = "col-divider" | "column" | "row-divider" | "drawers" | "top-shelf";

export interface GridSection {
  offset: number; // metres from the item's left edge (columns) or bottom edge (rows)
  size: number;   // metres
  kind: GridSectionKind;
  drawerHeight?: number; // present only on 'drawers' sections: height of ONE drawer
}

export interface InternalGrid {
  columns: GridSection[];
  rows: GridSection[];
}

export interface PlacedInstance {
  instanceKey: string;
  configItemId: string;
  productId: string;
  productName: string;
  rowIndex: number;
  sortOrder: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  actualWidth: number;
  actualHeight: number;
  actualDepth: number;
  imageUrl?: string;
  defaultColor?: string;
  grid?: InternalGrid; // populated by the results page for parametric items
}

export interface PlacedRow {
  rowIndex: number;
  y: number;
  rowHeight: number;
  usedWidth: number;
}

export type LayoutWarningCode =
  | "ITEM_EXCEEDS_WALL_WIDTH"
  | "ITEM_EXCEEDS_WALL_HEIGHT"
  | "WALL_OVERFLOW_HEIGHT";

export interface LayoutWarning {
  code: LayoutWarningCode;
  message: string;
  configItemId?: string;
}

export interface LayoutResult {
  fits: boolean;
  rows: PlacedRow[];
  placements: PlacedInstance[];
  usedWidth: number;
  usedHeight: number;
  unplaced: LayoutInputItem[];
  warnings: LayoutWarning[];
}
