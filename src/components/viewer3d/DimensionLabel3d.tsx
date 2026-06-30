"use client";

import { Billboard, Text } from "@react-three/drei";

interface DimensionLabel3dProps {
  position: [number, number, number];
  text: string;
  fontSize?: number;
}

// Renders dimension text directly into the WebGL scene using troika-three-text
// so the labels appear in canvas.toBlob() PNG snapshots.
// Billboard makes the label always face the camera regardless of orbit angle.
// Labels must be positioned slightly in front of any geometry they annotate
// (z = actualDepth + 0.02) to avoid z-fighting with the box surface.
export function DimensionLabel3d({ position, text, fontSize = 0.07 }: DimensionLabel3dProps) {
  return (
    <Billboard position={position}>
      <Text fontSize={fontSize} color="#374151" anchorX="center" anchorY="middle">
        {text}
      </Text>
    </Billboard>
  );
}
