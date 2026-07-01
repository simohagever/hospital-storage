"use client";

import { DoubleSide } from "three";

interface WallPlaneProps {
  wallWidth: number;
  wallHeight: number;
}

// Flat backdrop representing the wall. Two notes:
// - z = -0.005 so it sits behind the shelf boxes whose back faces are at z = 0,
//   preventing z-fighting / flickering between coincident surfaces.
// - DoubleSide so the wall stays visible if the user orbits behind it.
// - meshBasicMaterial (no lighting dependency) so the wall colour stays a
//   consistent neutral regardless of how the directional light is angled.
export function WallPlane({ wallWidth, wallHeight }: WallPlaneProps) {
  return (
    <mesh position={[wallWidth / 2, wallHeight / 2, -0.005]}>
      <planeGeometry args={[wallWidth, wallHeight]} />
      <meshStandardMaterial color="#f8f5f0" side={DoubleSide} />
    </mesh>
  );
}
