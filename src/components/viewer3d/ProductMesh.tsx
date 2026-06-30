"use client";

import type { PlacedInstance } from "@/lib/layout-engine/types";

// 1mm visual gap between adjacent items — physically realistic (real furniture
// never sits with zero clearance) and avoids any edge-rendering artefacts at
// shared faces. Applied only at render time; stored dimensions are unchanged.
const VISUAL_GAP = 0.001;

interface ProductMeshProps {
  placement: PlacedInstance;
}

// Maps a PlacedInstance's domain coordinates to a Three.js box.
// Domain (x, y) = bottom-left corner in metres; z = 0 at the wall surface.
// Three.js BoxGeometry is centred on its position, so we offset by half-extents.
export function ProductMesh({ placement: p }: ProductMeshProps) {
  const { positionX, positionY, actualWidth, actualHeight, actualDepth, defaultColor } = p;
  const w = actualWidth - VISUAL_GAP;
  const h = actualHeight - VISUAL_GAP;

  return (
    <mesh
      position={[
        positionX + actualWidth / 2,
        positionY + actualHeight / 2,
        actualDepth / 2,
      ]}
    >
      <boxGeometry args={[w, h, actualDepth]} />
      <meshStandardMaterial color={defaultColor ?? "#b0b0b0"} />
    </mesh>
  );
}
