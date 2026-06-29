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
