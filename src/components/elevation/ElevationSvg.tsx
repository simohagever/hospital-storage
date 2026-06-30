"use client";

import { useState } from "react";
import type { PlacedInstance } from "@/lib/layout-engine/types";
import { DimensionLine } from "./DimensionLine";

const MARGIN_LEFT = 60;
const MARGIN_TOP = 20;
const MARGIN_RIGHT = 20;
const MARGIN_BOTTOM = 100;
// Base target: wall renders at roughly 700px wide at zoom 1×, which fits
// comfortably alongside other page content. + / − buttons multiply this.
const BASE_WALL_WIDTH_PX = 700;
const MIN_PX_PER_METER = 20;
const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;

// Below these rendered dimensions, a name + dimension label can no longer fit
// without overlapping — better to omit them than show an unreadable jumble.
const MIN_WIDTH_PX_FOR_LABELS = 40;
const MIN_HEIGHT_PX_FOR_LABELS = 28;

interface ElevationSvgProps {
  placements: PlacedInstance[];
  wallWidth: number;
  wallHeight: number;
  usedWidth: number;
}

export function ElevationSvg({ placements, wallWidth, wallHeight, usedWidth }: ElevationSvgProps) {
  const [zoom, setZoom] = useState(1);

  const basePxPerMeter = Math.max(BASE_WALL_WIDTH_PX / wallWidth, MIN_PX_PER_METER);
  const pxPerMeter = basePxPerMeter * zoom;
  const wallWidthPx = wallWidth * pxPerMeter;
  const wallHeightPx = wallHeight * pxPerMeter;
  const svgWidth = wallWidthPx + MARGIN_LEFT + MARGIN_RIGHT;
  const svgHeight = wallHeightPx + MARGIN_TOP + MARGIN_BOTTOM;

  const centerOffsetPx = ((wallWidth - usedWidth) / 2) * pxPerMeter;
  const labelFontSize = Math.min(28, Math.max(10, Math.round(pxPerMeter * 0.04)));
  const dimFontSize = Math.min(18, Math.max(8, Math.round(pxPerMeter * 0.026)));
  const dimLineFontSize = Math.min(16, Math.max(11, Math.round(pxPerMeter * 0.022)));

  function toSvgY(domainY: number, height: number): number {
    return (wallHeight - (domainY + height)) * pxPerMeter;
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
          disabled={zoom <= ZOOM_MIN}
          className="flex h-8 w-8 items-center justify-center rounded border border-zinc-300 text-lg font-medium leading-none text-zinc-700 hover:bg-zinc-100 disabled:opacity-30"
        >
          −
        </button>
        <span className="w-12 text-center text-sm text-zinc-600">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
          disabled={zoom >= ZOOM_MAX}
          className="flex h-8 w-8 items-center justify-center rounded border border-zinc-300 text-lg font-medium leading-none text-zinc-700 hover:bg-zinc-100 disabled:opacity-30"
        >
          +
        </button>
      </div>

      <div className="overflow-x-auto overflow-y-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width={svgWidth} height={svgHeight} style={{ display: "block" }}>
          <g transform={`translate(${MARGIN_LEFT}, ${MARGIN_TOP})`}>
            <rect x={0} y={0} width={wallWidthPx} height={wallHeightPx} fill="white" stroke="#52525b" strokeWidth={1.5} />

            {placements.map((p) => {
              const x = centerOffsetPx + p.positionX * pxPerMeter;
              const y = toSvgY(p.positionY, p.actualHeight);
              const w = p.actualWidth * pxPerMeter;
              const h = p.actualHeight * pxPerMeter;
              const showLabels = w >= MIN_WIDTH_PX_FOR_LABELS && h >= MIN_HEIGHT_PX_FOR_LABELS;
              return (
                <g key={p.instanceKey}>
                  <rect x={x} y={y} width={w} height={h} fill={p.defaultColor ?? "#d4d4d8"} stroke="#3f3f46" strokeWidth={1} />
                  {showLabels && (
                    <>
                      <text
                        x={x + w / 2}
                        y={y + h / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={Math.min(labelFontSize, w / 6)}
                        fill="#27272a"
                      >
                        {p.productName}
                      </text>
                      <text
                        x={x + w / 2}
                        y={y + h - dimFontSize * 0.4}
                        textAnchor="middle"
                        fontSize={dimFontSize}
                        fill="#52525b"
                      >
                        {p.actualWidth.toFixed(2)}×{p.actualHeight.toFixed(2)}m
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            <DimensionLine
              x1={centerOffsetPx}
              y1={wallHeightPx + 25}
              x2={centerOffsetPx + usedWidth * pxPerMeter}
              y2={wallHeightPx + 25}
              label={`${usedWidth.toFixed(2)}m used`}
              dashed
              color="#16a34a"
              fontSize={dimLineFontSize}
            />
            <DimensionLine
              x1={0}
              y1={wallHeightPx + 62}
              x2={wallWidthPx}
              y2={wallHeightPx + 62}
              label={`${wallWidth.toFixed(2)}m wall`}
              fontSize={dimLineFontSize}
            />
            <DimensionLine
              x1={-30}
              y1={0}
              x2={-30}
              y2={wallHeightPx}
              label={`${wallHeight.toFixed(2)}m`}
              fontSize={dimLineFontSize}
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
