"use client";

import { Text } from "@react-three/drei";

interface DimensionLabel3dProps {
  position: [number, number, number];
  text: string;
}

// Uses drei <Text> (troika-three-text) which renders glyph geometry directly into
// the WebGL scene, so labels appear in canvas.toDataURL() PNG snapshots.
// <Html> was the previous implementation but it attaches a real DOM overlay that
// the WebGL renderer never sees when the canvas is captured.
export function DimensionLabel3d({ position, text }: DimensionLabel3dProps) {
  return (
    <Text
      position={position}
      fontSize={0.06}
      color="#374151"
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.008}
      outlineColor="white"
    >
      {text}
    </Text>
  );
}
