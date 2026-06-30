"use client";

import dynamic from "next/dynamic";
import type { PlacedInstance } from "@/lib/layout-engine/types";

// next/dynamic with ssr:false must live in a Client Component module — the
// Server Component page imports this wrapper instead of calling dynamic() itself.
const SceneDynamic = dynamic(() => import("./Scene").then((m) => m.Scene), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] items-center justify-center text-sm text-zinc-400">
      Loading 3D viewer…
    </div>
  ),
});

interface SceneLoaderProps {
  placements: PlacedInstance[];
  wallWidth: number;
  wallHeight: number;
}

export function SceneLoader(props: SceneLoaderProps) {
  return <SceneDynamic {...props} />;
}
