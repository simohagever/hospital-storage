"use client";

import { MAX_WALL_DIMENSION_METERS } from "@/lib/validation/schemas";

interface WallDimensionsFormProps {
  name: string;
  wallWidth: number;
  wallHeight: number;
  onNameChange: (name: string) => void;
  onWallWidthChange: (width: number) => void;
  onWallHeightChange: (height: number) => void;
}

export function WallDimensionsForm({
  name,
  wallWidth,
  wallHeight,
  onNameChange,
  onWallWidthChange,
  onWallHeightChange,
}: WallDimensionsFormProps) {
  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 p-4">
      <h2 className="text-lg font-semibold">Wall</h2>
      <label className="block">
        <span className="block text-sm font-medium text-zinc-700">Configuration name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Ward 4B Storage Wall"
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
        />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-zinc-700">Width (m)</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={MAX_WALL_DIMENSION_METERS}
            value={Number.isFinite(wallWidth) ? wallWidth : ""}
            onChange={(e) => onWallWidthChange(e.target.valueAsNumber)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-zinc-700">Height (m)</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={MAX_WALL_DIMENSION_METERS}
            value={Number.isFinite(wallHeight) ? wallHeight : ""}
            onChange={(e) => onWallHeightChange(e.target.valueAsNumber)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>
    </div>
  );
}
