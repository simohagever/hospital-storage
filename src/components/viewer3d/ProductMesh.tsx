"use client";

import { Suspense } from "react";
import { useTexture } from "@react-three/drei";
import type { PlacedInstance } from "@/lib/layout-engine/types";
import { DimensionLabel3d } from "./DimensionLabel3d";

const VISUAL_GAP = 0.001;

interface ProductMeshProps {
  placement: PlacedInstance;
  centerOffsetX: number;
  showDimensions: boolean;
}

// Six-material box: the front face (+z, toward the camera) shows the product photo
// when one has been uploaded; all other faces use the flat default colour.
// Material order for BoxGeometry: +x, -x, +y, -y, +z (front), -z (back).
//
// Note: the texture fills the front face at 100% scale, so if the uploaded photo
// has a different aspect ratio from the shelf it will be stretched. Upload photos
// cropped to the product's actual W×H ratio to avoid distortion (v1 known limit).
function TexturedBox({ w, h, d, color, imageUrl }: { w: number; h: number; d: number; color: string; imageUrl: string }) {
  const texture = useTexture(imageUrl);
  return (
    <mesh>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial attach="material-0" color={color} />
      <meshStandardMaterial attach="material-1" color={color} />
      <meshStandardMaterial attach="material-2" color={color} />
      <meshStandardMaterial attach="material-3" color={color} />
      <meshStandardMaterial attach="material-4" map={texture} />
      <meshStandardMaterial attach="material-5" color={color} />
    </mesh>
  );
}

function FlatBox({ w, h, d, color }: { w: number; h: number; d: number; color: string }) {
  return (
    <mesh>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

export function ProductMesh({ placement: p, centerOffsetX, showDimensions }: ProductMeshProps) {
  const { positionX, positionY, actualWidth, actualHeight, actualDepth, defaultColor, imageUrl } = p;
  const w = actualWidth - VISUAL_GAP;
  const h = actualHeight - VISUAL_GAP;
  const cx = centerOffsetX + positionX + actualWidth / 2;
  const cy = positionY + actualHeight / 2;
  const color = defaultColor ?? "#b0b0b0";
  const dimensionText = `${actualWidth.toFixed(2)} × ${actualHeight.toFixed(2)} × ${actualDepth.toFixed(2)}m`;

  return (
    <group position={[cx, cy, actualDepth / 2]}>
      {imageUrl ? (
        <Suspense fallback={<FlatBox w={w} h={h} d={actualDepth} color={color} />}>
          <TexturedBox w={w} h={h} d={actualDepth} color={color} imageUrl={imageUrl} />
        </Suspense>
      ) : (
        <FlatBox w={w} h={h} d={actualDepth} color={color} />
      )}

      {showDimensions && (
        <DimensionLabel3d
          position={[0, 0, actualDepth / 2 + 0.02]}
          text={dimensionText}
        />
      )}
    </group>
  );
}
