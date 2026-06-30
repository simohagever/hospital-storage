"use client";

import type { PlacedInstance } from "@/lib/layout-engine/types";
import { DimensionLabel3d } from "./DimensionLabel3d";

const VISUAL_GAP = 0.001;

interface ProductMeshProps {
  placement: PlacedInstance;
  centerOffsetX: number;
  showDimensions: boolean;
}

export function ProductMesh({ placement: p, centerOffsetX, showDimensions }: ProductMeshProps) {
  const { positionX, positionY, actualWidth, actualHeight, actualDepth, defaultColor } = p;
  const w = actualWidth - VISUAL_GAP;
  const h = actualHeight - VISUAL_GAP;
  const cx = centerOffsetX + positionX + actualWidth / 2;
  const cy = positionY + actualHeight / 2;

  // Font size scales with item height; clamped to always be readable.
  const fontSize = Math.max(0.05, Math.min(0.15, actualHeight * 0.1));

  // Label just in front of the box's front face — avoids z-fighting with the surface.
  // A single combined label (W × H × D) is used instead of separate width/height
  // labels to avoid collisions between stacked or adjacent items.
  const labelZ = actualDepth + 0.02;
  const dimensionText = `${actualWidth.toFixed(2)} × ${actualHeight.toFixed(2)} × ${actualDepth.toFixed(2)}m`;

  return (
    <group>
      <mesh position={[cx, cy, actualDepth / 2]}>
        <boxGeometry args={[w, h, actualDepth]} />
        <meshStandardMaterial color={defaultColor ?? "#b0b0b0"} />
      </mesh>

      {showDimensions && (
        <DimensionLabel3d
          position={[cx, cy, labelZ]}
          text={dimensionText}
          fontSize={fontSize}
        />
      )}
    </group>
  );
}
