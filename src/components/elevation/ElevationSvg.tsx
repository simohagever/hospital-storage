"use client";

import { useState } from "react";
import type { GridSection, PlacedInstance } from "@/lib/layout-engine/types";
import { DRAWER_GAP, DRAWER_HEIGHT } from "@/lib/layout-engine/dimensions";
import { DimensionLine } from "./DimensionLine";

const MARGIN_LEFT = 60;
const MARGIN_TOP = 28; // extra headroom for column annotations above top-row items
const MARGIN_RIGHT = 20;
const MARGIN_BOTTOM = 100;
const BASE_WALL_WIDTH_PX = 700;
const MIN_PX_PER_METER = 20;
const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;

const MIN_WIDTH_PX_FOR_LABELS = 40;
const MIN_HEIGHT_PX_FOR_LABELS = 28;

// Structural divider colour — slightly darker than the product fill so the
// 0.03m column and row dividers read as a distinct material.
const DIVIDER_COLOR = "#7a8f98";
const TOP_SHELF_COLOR = "#5a7a93";

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
  const annotFontSize = Math.max(7, Math.min(10, Math.round(pxPerMeter * 0.013)));
  // Only show structural dimension annotations when zoomed in enough — below 125%
  // the labels overlap and clutter the drawing.
  const showAnnotations = zoom >= 1.25;

  function toSvgY(domainY: number, height: number): number {
    return (wallHeight - (domainY + height)) * pxPerMeter;
  }

  function sectionPxHeight(s: GridSection): number {
    return s.size * pxPerMeter;
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
            <rect x={0} y={0} width={wallWidthPx} height={wallHeightPx} fill="#edeae5" stroke="#52525b" strokeWidth={1.5} />

            {placements.map((p) => {
              const x = centerOffsetPx + p.positionX * pxPerMeter;
              const y = toSvgY(p.positionY, p.actualHeight);
              const w = p.actualWidth * pxPerMeter;
              const h = p.actualHeight * pxPerMeter;
              const showLabels = w >= MIN_WIDTH_PX_FOR_LABELS && h >= MIN_HEIGHT_PX_FOR_LABELS;
              const fill = p.defaultColor ?? "#d4d4d8";
              const { grid } = p;

              return (
                <g key={p.instanceKey}>
                  {/* Base fill — replaced by product photo when available */}
                  <rect x={x} y={y} width={w} height={h} fill={fill} stroke="none" />
                  {p.imageUrl && (
                    <image
                      href={p.imageUrl}
                      x={x} y={y} width={w} height={h}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  )}

                  {grid ? (
                    <>
                      {/* Individual drawer trays rendered in each column bay × drawer block.
                          The frame color shows through the thin DRAWER_GAP between trays,
                          making the drawing look like the real stacked-drawer product. */}
                      {grid.columns
                        .filter((col) => col.kind === "column")
                        .flatMap((col) =>
                          grid.rows
                            .filter((row) => row.kind === "drawers" && row.drawerCount != null)
                            .flatMap((row) =>
                              Array.from({ length: row.drawerCount! }, (_, di) => {
                                const drawerDomainY =
                                  p.positionY + row.offset + di * (DRAWER_HEIGHT + DRAWER_GAP);
                                const drawerSvgY = toSvgY(drawerDomainY, DRAWER_HEIGHT);
                                const drawerH = DRAWER_HEIGHT * pxPerMeter;
                                const drawerX = x + col.offset * pxPerMeter;
                                const drawerW = col.size * pxPerMeter;
                                const handleH = Math.max(2, drawerH * 0.2);
                                return (
                                  <g key={`dr-${col.offset}-${di}`}>
                                    {/* Drawer tray body */}
                                    <rect
                                      x={drawerX} y={drawerSvgY}
                                      width={drawerW} height={drawerH}
                                      fill={fill} stroke="#3a5a70" strokeWidth={0.5}
                                    />
                                    {/* Pull handle strip at the bottom of each drawer */}
                                    <rect
                                      x={drawerX + drawerW * 0.12}
                                      y={drawerSvgY + drawerH - handleH}
                                      width={drawerW * 0.76}
                                      height={handleH}
                                      fill="rgba(255,255,255,0.28)"
                                      stroke="none"
                                    />
                                  </g>
                                );
                              }),
                            ),
                        )}

                      {/* Column dividers — structural frame vertical strips */}
                      {grid.columns
                        .filter((s) => s.kind === "col-divider")
                        .map((s, i) => (
                          <rect
                            key={"cd" + i}
                            x={x + s.offset * pxPerMeter}
                            y={y}
                            width={s.size * pxPerMeter}
                            height={h}
                            fill={DIVIDER_COLOR}
                          />
                        ))}

                      {/* Row dividers — structural frame horizontal strips */}
                      {grid.rows
                        .filter((s) => s.kind === "row-divider")
                        .map((s, i) => (
                          <rect
                            key={"rd" + i}
                            x={x}
                            y={toSvgY(p.positionY + s.offset, s.size)}
                            width={w}
                            height={sectionPxHeight(s)}
                            fill={DIVIDER_COLOR}
                          />
                        ))}

                      {/* Top shelf */}
                      {grid.rows
                        .filter((s) => s.kind === "top-shelf")
                        .map((s, i) => (
                          <rect
                            key={"ts" + i}
                            x={x}
                            y={toSvgY(p.positionY + s.offset, s.size)}
                            width={w}
                            height={sectionPxHeight(s)}
                            fill={TOP_SHELF_COLOR}
                          />
                        ))}

                      {/* Outer border on top of all sections */}
                      <rect x={x} y={y} width={w} height={h} fill="none" stroke="#3f3f46" strokeWidth={1} />

                      {/* Column width annotations — only visible when zoomed in */}
                      {showAnnotations && grid.columns.map((s, i) => {
                        const secX = x + s.offset * pxPerMeter;
                        const secW = s.size * pxPerMeter;
                        if (secW < annotFontSize * 2.5) return null;
                        return (
                          <text
                            key={"ca" + i}
                            x={secX + secW / 2}
                            y={y - 3}
                            textAnchor="middle"
                            dominantBaseline="alphabetic"
                            fontSize={annotFontSize}
                            fill="#374151"
                          >
                            {s.size.toFixed(2)}m
                          </text>
                        );
                      })}

                      {/* Row height annotations — only visible when zoomed in */}
                      {showAnnotations && grid.rows.map((s, i) => {
                        const secH = sectionPxHeight(s);
                        const secY = toSvgY(p.positionY + s.offset, s.size);
                        if (secH < annotFontSize * 1.2) return null;
                        const labelM =
                          s.kind === "drawers" ? (s.drawerHeight ?? s.size) : s.size;
                        return (
                          <text
                            key={"ra" + i}
                            x={x + w + 4}
                            y={secY + secH / 2 + annotFontSize * 0.35}
                            textAnchor="start"
                            fontSize={annotFontSize}
                            fill="#374151"
                          >
                            {labelM.toFixed(2)}m
                          </text>
                        );
                      })}
                    </>
                  ) : (
                    /* No grid data — plain filled box with existing stroke */
                    <rect x={x} y={y} width={w} height={h} fill="none" stroke="#3f3f46" strokeWidth={1} />
                  )}

                  {/* Product name + overall dimension label (shown regardless of grid) */}
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
