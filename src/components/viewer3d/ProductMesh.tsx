"use client";

import { Component, Suspense, type ReactNode } from "react";
import { useTexture } from "@react-three/drei";
import { DRAWER_GAP, DRAWER_HEIGHT } from "@/lib/layout-engine/dimensions";
import type { InternalGrid, PlacedInstance } from "@/lib/layout-engine/types";
import { DimensionLabel3d } from "./DimensionLabel3d";

const VISUAL_GAP = 0.001;

// Colours matching the real Cell Boxes product photo:
// warm light-gray powder-coated steel frame, with drawer trays in the product colour.
const FRAME_COLOR = "#c8c4be";
const HANDLE_OPACITY = 0.35; // semi-transparent lighter strip for the pull handle

interface ProductMeshProps {
  placement: PlacedInstance;
  centerOffsetX: number;
  showDimensions: boolean;
}

// ─── Error boundary so a texture load failure falls back to FlatBox ──────────
interface EBState { error: boolean }
class TextureErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, EBState> {
  state: EBState = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? this.props.fallback : this.props.children; }
}

// ─── Fallback: single solid box ───────────────────────────────────────────────
function FlatBox({ w, h, d, color }: { w: number; h: number; d: number; color: string }) {
  return (
    <mesh>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// ─── Photo texture on front face ──────────────────────────────────────────────
function TexturedBox({ w, h, d, color, imageUrl }: { w: number; h: number; d: number; color: string; imageUrl: string }) {
  const texture = useTexture(imageUrl);
  return (
    <mesh>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial attach="material-0" color={color} />
      <meshStandardMaterial attach="material-1" color={color} />
      <meshStandardMaterial attach="material-2" color={color} />
      <meshStandardMaterial attach="material-3" color={color} />
      <meshStandardMaterial attach="material-4" map={texture} />
      <meshStandardMaterial attach="material-5" color={color} />
    </mesh>
  );
}

// ─── Detailed box using grid data ─────────────────────────────────────────────
// Renders a gray frame cabinet with individual blue drawer-front panels,
// matching the real product photo. The grid provides exact column and row positions.
function DetailedBox({
  w, h, d, grid, drawerColor,
}: {
  w: number; h: number; d: number; grid: InternalGrid; drawerColor: string;
}) {
  // Convert domain coordinates (0…width, 0…height) to Three.js local space
  // where the group origin is at the box centre.
  function toLocalX(domainX: number) { return domainX - w / 2; }
  function toLocalY(domainY: number) { return domainY - h / 2; }

  const drawerPanels: React.ReactElement[] = [];

  grid.columns
    .filter((col) => col.kind === "column")
    .forEach((col) => {
      grid.rows
        .filter((row) => row.kind === "drawers" && row.drawerCount != null)
        .forEach((row) => {
          for (let di = 0; di < row.drawerCount!; di++) {
            const drawerDomainY = row.offset + di * (DRAWER_HEIGHT + DRAWER_GAP);
            const localX = toLocalX(col.offset + col.size / 2);
            const localY = toLocalY(drawerDomainY + DRAWER_HEIGHT / 2);
            const panelW = col.size - 0.003;
            const panelH = DRAWER_HEIGHT - 0.002;
            const handleH = DRAWER_HEIGHT * 0.18;
            const key = `drawer-${col.offset.toFixed(3)}-${row.offset.toFixed(3)}-${di}`;

            drawerPanels.push(
              <group key={key} position={[localX, localY, d / 2 + 0.003]}>
                {/* Drawer tray front panel */}
                <mesh>
                  <boxGeometry args={[panelW, panelH, 0.006]} />
                  <meshStandardMaterial color={drawerColor} />
                </mesh>
                {/* Pull-handle strip at the bottom of the drawer */}
                <mesh position={[0, -panelH / 2 + handleH / 2, 0.004]}>
                  <boxGeometry args={[panelW * 0.76, handleH, 0.003]} />
                  <meshStandardMaterial
                    color={drawerColor}
                    opacity={1 - HANDLE_OPACITY}
                    transparent
                    emissive="white"
                    emissiveIntensity={0.18}
                  />
                </mesh>
              </group>,
            );
          }
        });
    });

  // Top section: solid cover panel at the very top, then open shelf bays below it.
  grid.rows
    .filter((s) => s.kind === "top-shelf")
    .forEach((s, i) => {
      const bayBot = s.offset;
      const coverH = 0.017; // 17mm melamine top cover panel
      const boardH = 0.016; // shelf board thickness
      const nShelves = s.shelvesCount ?? 3;
      const interiorH = s.size - coverH;

      // White back panel for visible interior depth
      drawerPanels.push(
        <mesh key={`top-back-${i}`} position={[0, toLocalY(bayBot + s.size / 2), -d / 2 + 0.01]}>
          <boxGeometry args={[w - 0.004, s.size - 0.004, 0.005]} />
          <meshBasicMaterial color="#f0e6d8" />
        </mesh>,
      );

      // Solid cover panel at the very top of the section
      const coverLocalY = toLocalY(bayBot + s.size - coverH / 2);
      drawerPanels.push(
        <mesh key={`top-cover-${i}`} position={[0, coverLocalY, 0]}>
          <boxGeometry args={[w - 0.002, coverH, d - 0.002]} />
          <meshStandardMaterial color={FRAME_COLOR} />
        </mesh>,
      );

      // Horizontal shelf boards dividing the interior into nShelves equal bays
      for (let bi = 0; bi < nShelves - 1; bi++) {
        const frac = (bi + 1) / nShelves;
        const shelfDomainY = bayBot + interiorH * frac;
        drawerPanels.push(
          <mesh key={`top-shelf-${i}-${bi}`} position={[0, toLocalY(shelfDomainY + boardH / 2), 0]}>
            <boxGeometry args={[w - 0.002, boardH, d - 0.002]} />
            <meshStandardMaterial color="#f0e6d8" />
          </mesh>,
        );
      }
    });

  // Open structural frame — column divider posts + row divider rails only,
  // no solid faces, so interior bays are visible (matching the real product frame).
  return (
    <group>
      {/* Column dividers — vertical strips full height */}
      {grid.columns.filter((col) => col.kind === "col-divider").map((col, i) => (
        <mesh key={`cdiv-${i}`} position={[toLocalX(col.offset + col.size / 2), 0, 0]}>
          <boxGeometry args={[col.size, h, d]} />
          <meshStandardMaterial color={FRAME_COLOR} />
        </mesh>
      ))}
      {/* Row dividers — horizontal strips full width */}
      {grid.rows.filter((row) => row.kind === "row-divider").map((row, i) => (
        <mesh key={`rdiv-${i}`} position={[0, toLocalY(row.offset + row.size / 2), 0]}>
          <boxGeometry args={[w, row.size, d]} />
          <meshStandardMaterial color={FRAME_COLOR} />
        </mesh>
      ))}
      {/* Drawer fronts and top-shelf elements */}
      {drawerPanels}
    </group>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function ProductMesh({ placement: p, centerOffsetX, showDimensions }: ProductMeshProps) {
  const { positionX, positionY, actualWidth, actualHeight, actualDepth, defaultColor, imageUrl, grid } = p;
  const w = actualWidth - VISUAL_GAP;
  const h = actualHeight - VISUAL_GAP;
  const cx = centerOffsetX + positionX + actualWidth / 2;
  const cy = positionY + actualHeight / 2;
  const color = defaultColor ?? "#6b8fa8";
  const dimensionText = `${actualWidth.toFixed(2)} × ${actualHeight.toFixed(2)} × ${actualDepth.toFixed(2)}m`;
  const flatFallback = <FlatBox w={w} h={h} d={actualDepth} color={color} />;

  function renderBox() {
    // Priority: photo texture > structural grid breakdown > flat solid box
    if (imageUrl) {
      return (
        <TextureErrorBoundary fallback={flatFallback}>
          <Suspense fallback={flatFallback}>
            <TexturedBox w={w} h={h} d={actualDepth} color={color} imageUrl={imageUrl} />
          </Suspense>
        </TextureErrorBoundary>
      );
    }
    if (grid) {
      return <DetailedBox w={w} h={h} d={actualDepth} grid={grid} drawerColor={color} />;
    }
    return flatFallback;
  }

  return (
    <group position={[cx, cy, actualDepth / 2]}>
      {renderBox()}
      {showDimensions && (
        <DimensionLabel3d
          position={[0, 0, actualDepth / 2 + 0.02]}
          text={dimensionText}
        />
      )}
    </group>
  );
}
