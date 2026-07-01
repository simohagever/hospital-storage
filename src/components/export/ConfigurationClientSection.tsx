"use client";

import { useCallback, useRef, useState } from "react";
import { ElevationSvg } from "@/components/elevation/ElevationSvg";
import type { PlacedInstance } from "@/lib/layout-engine/types";
import { SceneLoader } from "@/components/viewer3d/SceneLoader";
import { ExportPdfButton } from "./ExportPdfButton";
import type { BomRow } from "@/lib/pdf/buildReport";

interface ConfigurationClientSectionProps {
  placements: PlacedInstance[];
  wallWidth: number;
  wallHeight: number;
  usedWidth: number;
  bom: BomRow[];
  configName: string;
}

export function ConfigurationClientSection({
  placements,
  wallWidth,
  wallHeight,
  usedWidth,
  bom,
  configName,
}: ConfigurationClientSectionProps) {
  // Filled by Scene on its first WebGL frame — used to capture the 3D canvas as PNG.
  const captureRef3d = useRef<(() => Promise<string>) | null>(null);
  // Tracks whether the 3D viewer has rendered at least one frame.
  // The PDF button stays disabled until this is true to prevent blank 3D snapshots.
  const [scene3dReady, setScene3dReady] = useState(false);

  const handleFirstRender = useCallback(() => {
    setScene3dReady(true);
  }, []);

  return (
    <>
      {/*
       * ElevationSvg renders its own <div id="elevation-export-root"> around the SVG.
       * ExportPdfButton queries that ID with html-to-image to get just the drawing
       * without the card border around it.
       */}
      <div className="mt-6 overflow-x-auto rounded-lg border border-stone-200 p-4">
        <ElevationSvg
          placements={placements}
          wallWidth={wallWidth}
          wallHeight={wallHeight}
          usedWidth={usedWidth}
        />
      </div>

      <h2 className="mt-8 text-lg font-semibold">3D view</h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-stone-200">
        <SceneLoader
          placements={placements}
          wallWidth={wallWidth}
          wallHeight={wallHeight}
          usedWidth={usedWidth}
          captureRef={captureRef3d}
          onFirstRender={handleFirstRender}
        />
      </div>

      <div className="mt-6">
        <ExportPdfButton
          elevationId="elevation-export-root"
          captureRef3d={captureRef3d}
          configName={configName}
          wallWidth={wallWidth}
          wallHeight={wallHeight}
          bom={bom}
          disabled={!scene3dReady}
        />
      </div>
    </>
  );
}
