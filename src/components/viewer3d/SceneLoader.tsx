"use client";

import { Component, type ReactNode } from "react";
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
  usedWidth: number;
  captureRef?: React.RefObject<(() => Promise<string>) | null>;
  onFirstRender?: () => void;
}

interface EBState { failed: boolean; retries: number }

class SceneErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { failed: false, retries: 0 };

  static getDerivedStateFromError(): Partial<EBState> {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("[SceneLoader] 3D viewer crashed:", error);
  }

  handleRetry = () => {
    this.setState((s) => ({ failed: false, retries: s.retries + 1 }));
  };

  render() {
    if (this.state.failed) {
      const isRepeatFail = this.state.retries > 0;
      return (
        <div className="flex h-[500px] flex-col items-center justify-center gap-2 text-sm text-stone-400">
          <p>
            {isRepeatFail
              ? "3D viewer failed again — your browser or device may not support WebGL."
              : "3D viewer failed to load."}
          </p>
          {!isRepeatFail && (
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded border border-stone-300 px-3 py-1 text-xs hover:bg-stone-50"
            >
              Try again
            </button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export function SceneLoader(props: SceneLoaderProps) {
  return (
    <SceneErrorBoundary>
      <SceneDynamic {...props} />
    </SceneErrorBoundary>
  );
}
