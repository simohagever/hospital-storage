"use client";

import { DoubleSide } from "three";

interface FloorPlaneProps {
  wallWidth: number;
}

// A large flat floor at y = 0 that grounds the scene so the shelves don't
// appear to float in empty space. Extends well beyond the wall footprint so
// the floor is always visible regardless of camera angle.
// DoubleSide so it stays visible if the user orbits the camera below floor level.
export function FloorPlane({ wallWidth }: FloorPlaneProps) {
  const size = Math.max(wallWidth * 4, 20);
  return (
    <mesh position={[wallWidth / 2, 0, size / 4]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial color="#d4d4d4" side={DoubleSide} />
    </mesh>
  );
}
