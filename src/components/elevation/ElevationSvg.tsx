"use client";

import { useState } from "react";
import type { GridSection, PlacedInstance } from "@/lib/layout-engine/types";
import { DRAWER_GAP, DRAWER_HEIGHT } from "@/lib/layout-engine/dimensions";
import { DimensionLine } from "./DimensionLine";

const MARGIN_LEFT = 140; // extra space on the left for strip-dimension breakdown panel
const MARGIN_TOP = 28;
const MARGIN_RIGHT = 20;
const MARGIN_BOTTOM = 100;
const BASE_WALL_WIDTH_PX = 700;
const MIN_PX_PER_METER = 20;
const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;

const MIN_WIDTH_PX_FOR_LABELS = 40;
const MIN_HEIGHT_PX_FOR_LABELS = 28;

const DIVIDER_COLOR = "#7a8f98";
const TOP_SHELF_COLOR = "#5a7a93";

// Professional drawing mode line weights
const PROF_STROKE_MAIN = 1.5;   // outer wall border
const PROF_STROKE_PROFILE = 1;  // structural profiles
const PROF_STROKE_DRAWER = 0.7; // drawer outlines
const PROF_PROFILE_WALL = 3;    // hollow-section inner offset (px) for double-line profiles

interface ElevationSvgProps {
  placements: PlacedInstance[];
  wallWidth: number;
  wallHeight: number;
  usedWidth: number;
}

export function ElevationSvg({ placements, wallWidth, wallHeight, usedWidth }: ElevationSvgProps) {
  const [zoom, setZoom] = useState(1);
  const [profMode, setProfMode] = useState(false);

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
  // Annotations visible at ≥125% in colour mode; always visible in professional mode
  const showAnnotations = profMode || zoom >= 1.25;

  function toSvgY(domainY: number, height: number): number {
    return (wallHeight - (domainY + height)) * pxPerMeter;
  }

  function sectionPxHeight(s: GridSection): number {
    return s.size * pxPerMeter;
  }

  // ── Professional-mode rendering helpers ──────────────────────────────────
  // Draws a structural hollow-section profile rectangle (like the aluminium
  // extrusions shown in the PDF drawings) — outer rect + inner lighter rect.
  function ProfProfile({
    x, y, w, h, id,
  }: { x: number; y: number; w: number; h: number; id: string }) {
    const inner = PROF_PROFILE_WALL;
    return (
      <g key={id}>
        <rect x={x} y={y} width={w} height={h} fill="#d8d5d0" stroke="#111" strokeWidth={PROF_STROKE_PROFILE} />
        {w > inner * 3 && h > inner * 3 && (
          <rect x={x + inner} y={y + inner} width={w - inner * 2} height={h - inner * 2} fill="white" stroke="#555" strokeWidth={0.4} />
        )}
      </g>
    );
  }

  function renderProfessionalItem(p: PlacedInstance) {
    const x = centerOffsetPx + p.positionX * pxPerMeter;
    const y = toSvgY(p.positionY, p.actualHeight);
    const w = p.actualWidth * pxPerMeter;
    const h = p.actualHeight * pxPerMeter;
    const { grid } = p;

    if (!grid) {
      // FIXED product — simple outlined box
      return (
        <g key={p.instanceKey}>
          <rect x={x} y={y} width={w} height={h} fill="white" stroke="#111" strokeWidth={PROF_STROKE_MAIN} />
          <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={annotFontSize} fill="#333">{p.productName}</text>
        </g>
      );
    }

    const drawers: React.ReactElement[] = [];

    // Draw individual drawer cells in each column bay
    grid.columns.filter((col) => col.kind === "column").forEach((col) => {
      grid.rows.filter((row) => row.kind === "drawers" && row.drawerCount != null).forEach((row) => {
        for (let di = 0; di < row.drawerCount!; di++) {
          const drawerDomainY = p.positionY + row.offset + di * (DRAWER_HEIGHT + DRAWER_GAP);
          // Last drawer fills exactly to the block end to eliminate floating-point gap
          const isLast = di === row.drawerCount! - 1;
          const drawerActualH = isLast
            ? row.size - di * (DRAWER_HEIGHT + DRAWER_GAP)
            : DRAWER_HEIGHT;
          const drawerSvgY = toSvgY(drawerDomainY, drawerActualH);
          const drawerH = drawerActualH * pxPerMeter;
          const drawerX = x + col.offset * pxPerMeter;
          const drawerW = col.size * pxPerMeter;
          const handleH = Math.max(1.5, drawerH * 0.15);
          drawers.push(
            <g key={`pd-${col.offset.toFixed(3)}-${row.offset.toFixed(3)}-${di}`}>
              <rect x={drawerX} y={drawerSvgY} width={drawerW} height={drawerH} fill="white" stroke="#333" strokeWidth={PROF_STROKE_DRAWER} />
              {/* Handle line */}
              <line
                x1={drawerX + drawerW * 0.15} y1={drawerSvgY + drawerH - handleH}
                x2={drawerX + drawerW * 0.85} y2={drawerSvgY + drawerH - handleH}
                stroke="#555" strokeWidth={0.8}
              />
            </g>,
          );
        }
      });
    });

    // Column divider profiles
    const colProfiles = grid.columns.filter((s) => s.kind === "col-divider").map((s, i) =>
      <ProfProfile key={`cp${i}`} id={`cp${i}`} x={x + s.offset * pxPerMeter} y={y} w={s.size * pxPerMeter} h={h} />,
    );

    // Row divider profiles
    const rowProfiles = grid.rows.filter((s) => s.kind === "row-divider").map((s, i) =>
      <ProfProfile key={`rp${i}`} id={`rp${i}`} x={x} y={toSvgY(p.positionY + s.offset, s.size)} w={w} h={sectionPxHeight(s)} />,
    );

    // Top shelf
    const topShelves = grid.rows.filter((s) => s.kind === "top-shelf").map((s, i) => (
      <g key={`ts${i}`}>
        <rect x={x} y={toSvgY(p.positionY + s.offset, s.size)} width={w} height={sectionPxHeight(s)} fill="#f0ede8" stroke="#333" strokeWidth={PROF_STROKE_PROFILE} />
      </g>
    ));

    return (
      <g key={p.instanceKey}>
        {/* White base fill */}
        <rect x={x} y={y} width={w} height={h} fill="white" stroke="none" />
        {drawers}
        {colProfiles}
        {rowProfiles}
        {topShelves}
        {/* Outer border */}
        <rect x={x} y={y} width={w} height={h} fill="none" stroke="#111" strokeWidth={PROF_STROKE_MAIN} />
        {/* Column annotations */}
        {grid.columns.map((s, i) => {
          const secX = x + s.offset * pxPerMeter;
          const secW = s.size * pxPerMeter;
          if (secW < annotFontSize * 2.5) return null;
          return (
            <text key={`pca${i}`} x={secX + secW / 2} y={y - 3} textAnchor="middle" dominantBaseline="alphabetic" fontSize={annotFontSize} fill="#111">
              {s.size.toFixed(2)}m
            </text>
          );
        })}
        {/* Row annotations */}
        {grid.rows.map((s, i) => {
          const secH = sectionPxHeight(s);
          if (secH < annotFontSize * 1.2) return null;
          const secY = toSvgY(p.positionY + s.offset, s.size);
          const labelM = s.kind === "drawers" ? (s.drawerHeight ?? s.size) : s.size;
          return (
            <text key={`pra${i}`} x={x + w + 4} y={secY + secH / 2 + annotFontSize * 0.35} textAnchor="start" fontSize={annotFontSize} fill="#111">
              {labelM.toFixed(2)}m
            </text>
          );
        })}
      </g>
    );
  }

  // ── Controls ─────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))} disabled={zoom <= ZOOM_MIN}
            className="flex h-8 w-8 items-center justify-center rounded border border-stone-300 text-lg font-medium leading-none text-stone-700 hover:bg-stone-100 disabled:opacity-30">−</button>
          <span className="w-12 text-center text-sm text-stone-600">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))} disabled={zoom >= ZOOM_MAX}
            className="flex h-8 w-8 items-center justify-center rounded border border-stone-300 text-lg font-medium leading-none text-stone-700 hover:bg-stone-100 disabled:opacity-30">+</button>
        </div>

        {/* Professional drawing toggle */}
        <button
          type="button"
          onClick={() => setProfMode((v) => !v)}
          className={`rounded border px-3 py-1.5 text-sm transition-colors ${
            profMode
              ? "border-stone-800 bg-stone-800 text-white"
              : "border-stone-300 text-stone-700 hover:bg-stone-50"
          }`}
        >
          {profMode ? "Colour view" : "Technical drawing"}
        </button>
      </div>

      <div className="overflow-x-auto overflow-y-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width={svgWidth} height={svgHeight} style={{ display: "block" }}
          fontFamily="'Courier New', monospace">
          <g transform={`translate(${MARGIN_LEFT}, ${MARGIN_TOP})`}>

            {/* Wall background */}
            <rect x={0} y={0} width={wallWidthPx} height={wallHeightPx}
              fill={profMode ? "white" : "#edeae5"}
              stroke={profMode ? "#111" : "#52525b"}
              strokeWidth={profMode ? PROF_STROKE_MAIN : 1.5}
            />

            {/* ── PROFESSIONAL MODE ── */}
            {profMode ? (
              <>
                {placements.map((p) => renderProfessionalItem(p))}

                {/* ── LEFT-SIDE: 0.03 strip heights + total product height ── */}
                {(() => {
                  const first = placements.find((p) => p.grid);
                  if (!first?.grid) return null;
                  const { grid } = first;
                  const fs = Math.max(7, Math.min(9, Math.round(pxPerMeter * 0.011)));
                  const TICK = 6;
                  const itemX = centerOffsetPx + first.positionX * pxPerMeter;
                  const bracketX = itemX - 50;
                  const totalX  = itemX - 118;
                  return (
                    <g>
                      {grid.rows.map((s, i) => {
                        const sy = toSvgY(first.positionY + s.offset, s.size);
                        const sh = s.size * pxPerMeter;
                        return (
                          <g key={`lsa${i}`}>
                            <line x1={bracketX} y1={sy} x2={bracketX} y2={sy + sh} stroke="#333" strokeWidth={0.8}/>
                            <line x1={bracketX-TICK} y1={sy}    x2={bracketX+TICK} y2={sy}    stroke="#333" strokeWidth={0.8}/>
                            <line x1={bracketX-TICK} y1={sy+sh} x2={bracketX+TICK} y2={sy+sh} stroke="#333" strokeWidth={0.8}/>
                            {/* Always show label — for narrow strips offset it outside the bracket */}
                            <text x={bracketX-TICK-2} y={sh >= fs * 1.5 ? sy+sh/2+fs*0.35 : sy - 2}
                              textAnchor="end" fontSize={fs} fill="#111">
                              {s.size.toFixed(3)}m
                            </text>
                          </g>
                        );
                      })}
                      {(() => {
                        // topY = SVG y of the top edge of the product; botY = bottom edge
                        const topY = toSvgY(first.positionY, first.actualHeight);
                        const botY = toSvgY(first.positionY, 0);
                        return (
                          <g>
                            <line x1={totalX} y1={topY} x2={totalX} y2={botY} stroke="#111" strokeWidth={1.2}/>
                            <line x1={totalX-TICK} y1={topY} x2={totalX+TICK} y2={topY} stroke="#111" strokeWidth={1.2}/>
                            <line x1={totalX-TICK} y1={botY} x2={totalX+TICK} y2={botY} stroke="#111" strokeWidth={1.2}/>
                            <text x={totalX-TICK-2} y={(topY+botY)/2+(fs+1)*0.35}
                              textAnchor="end" fontSize={fs+1} fill="#111" fontWeight="bold">
                              {first.actualHeight.toFixed(3)}m
                            </text>
                          </g>
                        );
                      })()}
                    </g>
                  );
                })()}

                {/* Dimension lines — always shown in professional mode */}
                <DimensionLine x1={centerOffsetPx} y1={wallHeightPx + 25} x2={centerOffsetPx + usedWidth * pxPerMeter} y2={wallHeightPx + 25}
                  label={`${usedWidth.toFixed(3)}m`} dashed color="#333" fontSize={dimLineFontSize} />
                <DimensionLine x1={0} y1={wallHeightPx + 62} x2={wallWidthPx} y2={wallHeightPx + 62}
                  label={`${wallWidth.toFixed(3)}m`} color="#111" fontSize={dimLineFontSize} />
                <DimensionLine x1={-30} y1={0} x2={-30} y2={wallHeightPx}
                  label={`${wallHeight.toFixed(3)}m`} color="#111" fontSize={dimLineFontSize} />

                {/* Title block — bottom right corner like engineering drawings */}
                <g transform={`translate(${wallWidthPx - 160}, ${wallHeightPx + 10})`}>
                  <rect x={0} y={0} width={160} height={48} fill="white" stroke="#333" strokeWidth={0.8} />
                  <line x1={0} y1={16} x2={160} y2={16} stroke="#333" strokeWidth={0.5} />
                  <line x1={0} y1={32} x2={160} y2={32} stroke="#333" strokeWidth={0.5} />
                  <text x={4} y={11} fontSize={7} fill="#111" fontWeight="bold">ELEVATION VIEW</text>
                  <text x={4} y={27} fontSize={7} fill="#555">Scale 1:{[1,2,5,10,20,25,50,100,200].reduce((b,s)=>Math.abs(s-Math.round(1/(pxPerMeter/1000)))<Math.abs(b-Math.round(1/(pxPerMeter/1000)))?s:b)}</text>
                  <text x={4} y={43} fontSize={7} fill="#555">Hospital Storage Configurator</text>
                </g>
              </>
            ) : (
              /* ── COLOUR MODE ── */
              <>
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
                      <rect x={x} y={y} width={w} height={h} fill={fill} stroke="none" />
                      {p.imageUrl && (
                        <image href={p.imageUrl} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" />
                      )}

                      {grid ? (
                        <>
                          {grid.columns.filter((col) => col.kind === "column").flatMap((col) =>
                            grid.rows.filter((row) => row.kind === "drawers" && row.drawerCount != null).flatMap((row) =>
                              Array.from({ length: row.drawerCount! }, (_, di) => {
                                const drawerDomainY = p.positionY + row.offset + di * (DRAWER_HEIGHT + DRAWER_GAP);
                                const drawerSvgY = toSvgY(drawerDomainY, DRAWER_HEIGHT);
                                const drawerH = DRAWER_HEIGHT * pxPerMeter;
                                const drawerX = x + col.offset * pxPerMeter;
                                const drawerW = col.size * pxPerMeter;
                                const handleH = Math.max(2, drawerH * 0.2);
                                return (
                                  <g key={`dr-${col.offset.toFixed(3)}-${row.offset.toFixed(3)}-${di}`}>
                                    <rect x={drawerX} y={drawerSvgY} width={drawerW} height={drawerH} fill={fill} stroke="#3a5a70" strokeWidth={0.5} />
                                    <rect x={drawerX + drawerW * 0.12} y={drawerSvgY + drawerH - handleH}
                                      width={drawerW * 0.76} height={handleH} fill="rgba(255,255,255,0.28)" stroke="none" />
                                  </g>
                                );
                              }),
                            ),
                          )}

                          {grid.columns.filter((s) => s.kind === "col-divider").map((s, i) => (
                            <rect key={"cd" + i} x={x + s.offset * pxPerMeter} y={y} width={s.size * pxPerMeter} height={h} fill={DIVIDER_COLOR} />
                          ))}
                          {grid.rows.filter((s) => s.kind === "row-divider").map((s, i) => (
                            <rect key={"rd" + i} x={x} y={toSvgY(p.positionY + s.offset, s.size)} width={w} height={sectionPxHeight(s)} fill={DIVIDER_COLOR} />
                          ))}
                          {grid.rows.filter((s) => s.kind === "top-shelf").map((s, i) => (
                            <rect key={"ts" + i} x={x} y={toSvgY(p.positionY + s.offset, s.size)} width={w} height={sectionPxHeight(s)} fill={TOP_SHELF_COLOR} />
                          ))}

                          <rect x={x} y={y} width={w} height={h} fill="none" stroke="#3f3f46" strokeWidth={1} />

                          {showAnnotations && grid.columns.map((s, i) => {
                            const secX = x + s.offset * pxPerMeter;
                            const secW = s.size * pxPerMeter;
                            if (secW < annotFontSize * 2.5) return null;
                            return (
                              <text key={"ca" + i} x={secX + secW / 2} y={y - 3} textAnchor="middle" dominantBaseline="alphabetic" fontSize={annotFontSize} fill="#374151">
                                {s.size.toFixed(2)}m
                              </text>
                            );
                          })}

                          {showAnnotations && grid.rows.map((s, i) => {
                            const secH = sectionPxHeight(s);
                            const secY = toSvgY(p.positionY + s.offset, s.size);
                            if (secH < annotFontSize * 1.2) return null;
                            const labelM = s.kind === "drawers" ? (s.drawerHeight ?? s.size) : s.size;
                            return (
                              <text key={"ra" + i} x={x + w + 4} y={secY + secH / 2 + annotFontSize * 0.35} textAnchor="start" fontSize={annotFontSize} fill="#374151">
                                {labelM.toFixed(2)}m
                              </text>
                            );
                          })}
                        </>
                      ) : (
                        <rect x={x} y={y} width={w} height={h} fill="none" stroke="#3f3f46" strokeWidth={1} />
                      )}

                      {showLabels && (
                        <>
                          <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle"
                            fontSize={Math.min(labelFontSize, w / 6)} fill="#27272a">{p.productName}</text>
                          <text x={x + w / 2} y={y + h - dimFontSize * 0.4} textAnchor="middle" fontSize={dimFontSize} fill="#52525b">
                            {p.actualWidth.toFixed(2)}×{p.actualHeight.toFixed(2)}m
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}

                <DimensionLine x1={centerOffsetPx} y1={wallHeightPx + 25} x2={centerOffsetPx + usedWidth * pxPerMeter} y2={wallHeightPx + 25}
                  label={`${usedWidth.toFixed(2)}m used`} dashed color="#16a34a" fontSize={dimLineFontSize} />
                <DimensionLine x1={0} y1={wallHeightPx + 62} x2={wallWidthPx} y2={wallHeightPx + 62}
                  label={`${wallWidth.toFixed(2)}m wall`} fontSize={dimLineFontSize} />
                <DimensionLine x1={-30} y1={0} x2={-30} y2={wallHeightPx}
                  label={`${wallHeight.toFixed(2)}m`} fontSize={dimLineFontSize} />
              </>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}
