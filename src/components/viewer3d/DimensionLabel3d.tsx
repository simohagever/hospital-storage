"use client";

import { Html } from "@react-three/drei";

interface DimensionLabel3dProps {
  position: [number, number, number];
  text: string;
}

// Renders a dimension label anchored to a 3D position using drei's Html helper,
// which attaches a real DOM element to the scene. This is more reliable than
// troika-three-text (<Text>) since it requires no async font loading.
export function DimensionLabel3d({ position, text }: DimensionLabel3dProps) {
  return (
    <Html position={position} center distanceFactor={3}>
      <div
        style={{
          background: "white",
          border: "1px solid #d1d5db",
          borderRadius: 4,
          padding: "2px 6px",
          fontSize: 11,
          fontFamily: "sans-serif",
          color: "#374151",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {text}
      </div>
    </Html>
  );
}
