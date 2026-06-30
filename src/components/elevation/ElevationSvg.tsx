import type { PlacedInstance } from "@/lib/layout-engine/types";
import { DimensionLine } from "./DimensionLine";

const MARGIN_LEFT = 60;
const MARGIN_TOP = 20;
const MARGIN_RIGHT = 20;
const MARGIN_BOTTOM = 70;
const TARGET_WALL_WIDTH_PX = 800;
const MIN_PX_PER_METER = 20;
const MAX_PX_PER_METER = 200;
// Below these rendered dimensions, a name + dimension label can no longer fit
// without overlapping each other — better to omit them than show an unreadable
// jumble. Both width AND height are checked: a wide-but-short item can fail on
// height alone even when there's plenty of horizontal room.
const MIN_WIDTH_PX_FOR_LABELS = 40;
const MIN_HEIGHT_PX_FOR_LABELS = 28;

interface ElevationSvgProps {
  placements: PlacedInstance[];
  wallWidth: number;
  wallHeight: number;
  usedWidth: number;
}

// Pure presentational SVG elevation (front view) of a wall and its placed items.
// Domain coordinates have y growing upward from the wall's floor; SVG's y grows
// downward from the top, so each item's SVG y is computed individually
// (wallHeight - (y + height)) rather than via a single flipped <g transform> — this
// keeps dimension-line text upright instead of mirrored.
export function ElevationSvg({ placements, wallWidth, wallHeight, usedWidth }: ElevationSvgProps) {
  const pxPerMeter = Math.min(Math.max(TARGET_WALL_WIDTH_PX / wallWidth, MIN_PX_PER_METER), MAX_PX_PER_METER);
  const wallWidthPx = wallWidth * pxPerMeter;
  const wallHeightPx = wallHeight * pxPerMeter;
  const svgWidth = wallWidthPx + MARGIN_LEFT + MARGIN_RIGHT;
  const svgHeight = wallHeightPx + MARGIN_TOP + MARGIN_BOTTOM;

  // Shift the entire layout so it appears centered on the wall rather than
  // left-aligned. The packing algorithm always starts at x=0, but physically
  // shelves look more natural when centred in the available space.
  const centerOffsetPx = ((wallWidth - usedWidth) / 2) * pxPerMeter;

  function toSvgY(domainY: number, height: number): number {
    return (wallHeight - (domainY + height)) * pxPerMeter;
  }

  return (
    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" style={{ maxWidth: svgWidth, height: "auto" }}>
      <g transform={`translate(${MARGIN_LEFT}, ${MARGIN_TOP})`}>
        <rect x={0} y={0} width={wallWidthPx} height={wallHeightPx} fill="#fafafa" stroke="#52525b" strokeWidth={1.5} />

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
                    fontSize={Math.min(11, w / 6)}
                    fill="#27272a"
                  >
                    {p.productName}
                  </text>
                  <text x={x + w / 2} y={y + h - 4} textAnchor="middle" fontSize={9} fill="#52525b">
                    {p.actualWidth.toFixed(2)}×{p.actualHeight.toFixed(2)}m
                  </text>
                </>
              )}
            </g>
          );
        })}

        <DimensionLine
          x1={centerOffsetPx}
          y1={wallHeightPx + 20}
          x2={centerOffsetPx + usedWidth * pxPerMeter}
          y2={wallHeightPx + 20}
          label={`${usedWidth.toFixed(2)}m used`}
          dashed
          color="#16a34a"
        />
        <DimensionLine
          x1={0}
          y1={wallHeightPx + 45}
          x2={wallWidthPx}
          y2={wallHeightPx + 45}
          label={`${wallWidth.toFixed(2)}m wall`}
        />
        <DimensionLine x1={-30} y1={0} x2={-30} y2={wallHeightPx} label={`${wallHeight.toFixed(2)}m`} />
      </g>
    </svg>
  );
}
