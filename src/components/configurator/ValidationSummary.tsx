"use client";

import type { LayoutResult } from "@/lib/layout-engine/types";
import { MAX_WALL_DIMENSION_METERS } from "@/lib/validation/schemas";

interface ValidationSummaryProps {
  result: LayoutResult | null;
  error: string | null;
  itemCount: number;
  wallWidth: number;
  wallHeight: number;
}

export function ValidationSummary({ result, error, itemCount, wallWidth, wallHeight }: ValidationSummaryProps) {
  if (!Number.isFinite(wallWidth) || wallWidth <= 0 || !Number.isFinite(wallHeight) || wallHeight <= 0) {
    return (
      <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
        Enter a positive wall width and height to see whether your items fit.
      </div>
    );
  }

  if (wallWidth > MAX_WALL_DIMENSION_METERS || wallHeight > MAX_WALL_DIMENSION_METERS) {
    return (
      <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
        Wall width and height can&apos;t exceed {MAX_WALL_DIMENSION_METERS}m.
      </div>
    );
  }

  if (error) {
    return <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  }

  if (itemCount === 0 || !result) {
    return (
      <div className="rounded border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500">
        Add products to see whether they fit.
      </div>
    );
  }

  const rowWord = result.rows.length === 1 ? "row" : "rows";

  return (
    <div
      className={`rounded border p-3 text-sm ${
        result.fits ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"
      }`}
    >
      <p className="font-medium">
        {result.fits ? "Fits" : "Doesn't fit"} — using {result.usedWidth.toFixed(2)}m of {wallWidth.toFixed(2)}m
        width and {result.usedHeight.toFixed(2)}m of {wallHeight.toFixed(2)}m height across {result.rows.length}{" "}
        {rowWord}
      </p>
      {result.warnings.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {result.warnings.map((warning, index) => (
            <li key={index}>{warning.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
