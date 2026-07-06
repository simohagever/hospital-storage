"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { WebGLRenderer } from "three";
import type { PlacedInstance } from "@/lib/layout-engine/types";
import { FloorPlane } from "./FloorPlane";
import { ProductMesh } from "./ProductMesh";
import { WallPlane } from "./WallPlane";

interface SceneProps {
  placements: PlacedInstance[];
  wallWidth: number;
  wallHeight: number;
  usedWidth: number;
  /** Filled on mount with a function that returns a hi-res PNG data URL of the canvas. */
  captureRef?: React.RefObject<(() => Promise<string>) | null>;
  /** Called once after the first frame has rendered — use to enable the PDF button. */
  onFirstRender?: () => void;
}

// Wires up the gl renderer ref, the external captureRef, and the onFirstRender callback.
function CanvasCapture({
  onMount,
  captureRef,
  onFirstRender,
}: {
  onMount: (gl: WebGLRenderer) => void;
  captureRef?: React.RefObject<(() => Promise<string>) | null>;
  onFirstRender?: () => void;
}) {
  const gl = useThree((s) => s.gl);
  const firedRef = useRef(false);

  useEffect(() => {
    onMount(gl as unknown as WebGLRenderer);

    if (captureRef) {
      captureRef.current = () =>
        new Promise((resolve, reject) => {
          // One rAF ensures the current frame is fully flushed before reading pixels.
          requestAnimationFrame(() => {
            try {
              resolve((gl as unknown as WebGLRenderer).domElement.toDataURL("image/png"));
            } catch (e) {
              reject(e);
            }
          });
        });
    }
  }, [gl, onMount, captureRef]);

  // useFrame fires after real WebGL pixels hit the canvas — unlike useEffect which fires
  // after the React commit but before the first actual frame has been drawn.
  useFrame(() => {
    if (onFirstRender && !firedRef.current) {
      firedRef.current = true;
      onFirstRender();
    }
  });

  return null;
}

export function Scene({ placements, wallWidth, wallHeight, usedWidth, captureRef, onFirstRender }: SceneProps) {
  const [showDimensions, setShowDimensions] = useState(false);
  const glRef = useRef<WebGLRenderer | null>(null);

  const maxDim = Math.max(wallWidth, wallHeight);
  const cameraZ = maxDim * 1.5;
  const centerOffsetX = (wallWidth - usedWidth) / 2;

  const handleMount = useCallback((gl: WebGLRenderer) => {
    glRef.current = gl;
  }, []);

  function handleSnapshot() {
    // With frameloop="always" the canvas renders every frame, so one rAF
    // is enough to ensure the current frame has been flushed before capture.
    requestAnimationFrame(() => {
      glRef.current?.domElement.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "wall-configuration-3d.png";
          a.click();
          URL.revokeObjectURL(url);
        },
        "image/png",
      );
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowDimensions((v) => !v)}
          className={`rounded border px-3 py-1.5 text-sm ${
            showDimensions
              ? "border-zinc-800 bg-zinc-800 text-white"
              : "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          {showDimensions ? "Hide dimensions" : "Show dimensions"}
        </button>
        <button
          type="button"
          onClick={handleSnapshot}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          Download PNG
        </button>
      </div>

      <div style={{ width: "100%", height: 500 }}>
        <Canvas
          gl={{ preserveDrawingBuffer: true }}
          dpr={[1, 2]}
          frameloop="always"
          camera={{
            position: [wallWidth / 2, wallHeight / 2, cameraZ],
            fov: 45,
            near: 0.01,
            far: 1000,
          }}
        >
          <CanvasCapture onMount={handleMount} captureRef={captureRef} onFirstRender={onFirstRender} />

          {/* Room background colour matching the example product photo */}
          <color attach="background" args={["#6b7280"]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 10, 5]} intensity={0.8} />

          <OrbitControls
            makeDefault
            target={[wallWidth / 2, wallHeight / 2, 0]}
          />

          <WallPlane wallWidth={wallWidth} wallHeight={wallHeight} />
          <FloorPlane wallWidth={wallWidth} />

          {placements.map((p) => (
            <ProductMesh
              key={p.instanceKey}
              placement={p}
              centerOffsetX={centerOffsetX}
              showDimensions={showDimensions}
            />
          ))}
        </Canvas>
      </div>
    </div>
  );
}
