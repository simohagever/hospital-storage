"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import { buildReport } from "@/lib/pdf/buildReport";
import type { BomRow } from "@/lib/pdf/buildReport";

// Fetch an image URL and return a data-URI so html-to-image can inline it.
// html-to-image does fetch same-origin <image href> elements, but SVG <image>
// nodes with relative hrefs can silently produce a blank in the output if the
// browser hasn't cached them yet. Pre-converting guarantees they're baked in.
async function inlineSvgImages(root: HTMLElement): Promise<() => void> {
  const svgImages = Array.from(root.querySelectorAll<SVGImageElement>("image[href], image[xlink\\:href]"));
  const restoreFns: Array<() => void> = [];

  await Promise.all(
    svgImages.map(async (img) => {
      const href = img.getAttribute("href") ?? img.getAttribute("xlink:href");
      if (!href || href.startsWith("data:")) return;
      try {
        const res = await fetch(href);
        if (!res.ok) return;
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        const original = href;
        img.setAttribute("href", dataUrl);
        restoreFns.push(() => img.setAttribute("href", original));
      } catch {
        // best-effort — leave the original href in place
      }
    }),
  );

  return () => restoreFns.forEach((fn) => fn());
}

// Downscale a PNG data URL so neither dimension exceeds maxPx, then re-encode
// at 0.85 quality to keep PDF file size small enough to email.
function resizeDataUrl(dataUrl: string, maxPx: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // 0.85 quality: good visual fidelity at a smaller file size than 0.92
      resolve(canvas.toDataURL("image/png", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

interface ExportPdfButtonProps {
  elevationId: string;
  captureRef3d: React.RefObject<(() => Promise<string>) | null>;
  configName: string;
  wallWidth: number;
  wallHeight: number;
  bom: BomRow[];
  /** true while the 3D viewer hasn't rendered its first frame yet */
  disabled?: boolean;
}

export function ExportPdfButton({
  elevationId,
  captureRef3d,
  configName,
  wallWidth,
  wallHeight,
  bom,
  disabled,
}: ExportPdfButtonProps) {
  const [status, setStatus] = useState<"idle" | "capturing" | "building">("idle");

  async function handleExport() {
    setStatus("capturing");
    try {
      // ── 1. Capture 2D elevation ─────────────────────────────────────────
      const elevEl = document.getElementById(elevationId);
      if (!elevEl) throw new Error(`Element #${elevationId} not found`);
      // Scroll into view so the element is rendered (not display:none / out of layout).
      elevEl.scrollIntoView({ block: "nearest" });
      // One rAF so any scroll/reflow settles before html-to-image serialises the DOM.
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      // Inline any SVG <image> hrefs as data-URIs so they are baked into the PNG.
      const restoreSvgImages = await inlineSvgImages(elevEl);
      const rawElevPng = await toPng(elevEl, { pixelRatio: 2, backgroundColor: "#ffffff" });
      restoreSvgImages();
      const elevPng = await resizeDataUrl(rawElevPng, 2400);

      // ── 2. Capture 3D canvas ────────────────────────────────────────────
      let scene3dPng = "";
      if (captureRef3d.current) {
        const raw3d = await captureRef3d.current();
        if (raw3d) scene3dPng = await resizeDataUrl(raw3d, 2400);
      }

      // ── 3. Assemble and download PDF ────────────────────────────────────
      setStatus("building");
      buildReport({ elevationPng: elevPng, scene3dPng, configName, wallWidth, wallHeight, bom });
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Export failed — please try again.");
    } finally {
      setStatus("idle");
    }
  }

  const isWorking = status !== "idle";
  const label =
    status === "capturing" ? "Capturing views…" :
    status === "building"  ? "Building PDF…" :
    "Download PDF Report";
  const tooltip = disabled && !isWorking ? "Waiting for 3D viewer to load…" : undefined;

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || isWorking}
      title={tooltip}
      className="rounded border border-stone-700 bg-stone-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isWorking && (
        <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent align-middle" />
      )}
      {label}
    </button>
  );
}
