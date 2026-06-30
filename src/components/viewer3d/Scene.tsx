"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { PlacedInstance } from "@/lib/layout-engine/types";
import { ProductMesh } from "./ProductMesh";
import { WallPlane } from "./WallPlane";

interface SceneProps {
  placements: PlacedInstance[];
  wallWidth: number;
  wallHeight: number;
}

export function Scene({ placements, wallWidth, wallHeight }: SceneProps) {
  const maxDim = Math.max(wallWidth, wallHeight);
  const cameraZ = maxDim * 1.5;

  return (
    <div style={{ width: "100%", height: 500 }}>
      <Canvas
        // preserveDrawingBuffer lets canvas.toBlob() work for PNG export —
        // without it the WebGL buffer is already cleared by the time the
        // screenshot reads it.
        gl={{ preserveDrawingBuffer: true }}
        // Only re-render when the user interacts (orbit/zoom) — avoids
        // constant 60fps rendering when the scene is idle.
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

        <OrbitControls
          makeDefault
          enableDamping
          target={[wallWidth / 2, wallHeight / 2, 0]}
        />

        <WallPlane wallWidth={wallWidth} wallHeight={wallHeight} />

        {placements.map((p) => (
          <ProductMesh key={p.instanceKey} placement={p} />
        ))}
      </Canvas>
    </div>
  );
}
