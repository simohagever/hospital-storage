"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { PlacedInstance } from "@/lib/layout-engine/types";
import { FloorPlane } from "./FloorPlane";
import { ProductMesh } from "./ProductMesh";
import { WallPlane } from "./WallPlane";

interface SceneProps {
  placements: PlacedInstance[];
  wallWidth: number;
  wallHeight: number;
  usedWidth: number;
}

export function Scene({ placements, wallWidth, wallHeight, usedWidth }: SceneProps) {
  const maxDim = Math.max(wallWidth, wallHeight);
  const cameraZ = maxDim * 1.5;
  // Same centering offset as the 2D elevation drawing — items appear centred
  // on the wall rather than left-aligned against its left edge.
  const centerOffsetX = (wallWidth - usedWidth) / 2;

  return (
    <div style={{ width: "100%", height: 500 }}>
      <Canvas
        gl={{ preserveDrawingBuffer: true }}
        frameloop="demand"
        camera={{
          position: [wallWidth / 2, wallHeight / 2, cameraZ],
          fov: 45,
          near: 0.01,
          far: 1000,
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />

        {/* enableDamping removed — camera stops immediately on release,
            which works correctly with frameloop="demand" */}
        <OrbitControls
          makeDefault
          target={[wallWidth / 2, wallHeight / 2, 0]}
        />

        <WallPlane wallWidth={wallWidth} wallHeight={wallHeight} />
        <FloorPlane wallWidth={wallWidth} />

        {placements.map((p) => (
          <ProductMesh key={p.instanceKey} placement={p} centerOffsetX={centerOffsetX} />
        ))}
      </Canvas>
    </div>
  );
}
