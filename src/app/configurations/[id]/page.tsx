import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ConfigurationClientSection } from "@/components/export/ConfigurationClientSection";

// Module-scope so this schema is built once per process, not on every request.
const paramsSchema = z.record(z.string(), z.number()).nullable();
import { computeInternalGrid } from "@/lib/layout-engine/computeInternalGrid";
import type { PlacedInstance } from "@/lib/layout-engine/types";
import type { BomRow } from "@/lib/pdf/buildReport";
import { prisma } from "@/lib/prisma";
import { LayoutWarningSchema, ParametricConfigSchema } from "@/lib/validation/schemas";

export default async function ConfigurationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const configuration = await prisma.wallConfiguration.findUnique({
    where: { id },
    include: {
      items: {
        include: {
            product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
            placedItemInstances: true,
          },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!configuration) {
    notFound();
  }

  function formatParamsWithLabels(
    product: { parametricConfig: unknown },
    params: Record<string, number> | null,
  ): string {
    if (!params) return "";
    const parsedConfig = ParametricConfigSchema.safeParse(product.parametricConfig);
    if (!parsedConfig.success) {
      return Object.entries(params).map(([k, v]) => `${k}: ${v}`).join(", ");
    }
    const cfg = parsedConfig.data;
    const labelMap = new Map<string, string>([
      [cfg.columns.paramName, cfg.columns.label],
      [cfg.drawersPerColumn.paramName, cfg.drawersPerColumn.label],
      [cfg.rows.paramName, cfg.rows.label],
      [cfg.topOption.paramName, cfg.topOption.label],
      [cfg.topOption.heightParamName, cfg.topOption.heightLabel],
      [cfg.topOption.shelvesCount.paramName, cfg.topOption.shelvesCount.label],
    ]);
    return Object.entries(params)
      .map(([k, v]) => {
        const label = labelMap.get(k) ?? k;
        return k === cfg.topOption.paramName ? `${label}: ${v ? "Yes" : "No"}` : `${label}: ${v}`;
      })
      .join(", ");
  }

  const placements: PlacedInstance[] = configuration.items.flatMap((item) => {
    // Compute the internal structural grid for parametric items so the 2D elevation
    // can draw column/row dividers and annotate each section's dimensions.
    const parsedConfig = ParametricConfigSchema.safeParse(item.product.parametricConfig);
    const parsedParams = paramsSchema.safeParse(item.params);
    let grid: PlacedInstance["grid"];
    if (item.product.dimensionType === "PARAMETRIC" && parsedConfig.success) {
      try {
        grid = computeInternalGrid(parsedConfig.data, parsedParams.success ? parsedParams.data : null);
      } catch {
        // Corrupted params — skip the grid breakdown, render a flat box instead.
      }
    }

    return item.placedItemInstances.map((instance) => ({
      instanceKey: instance.instanceKey,
      configItemId: instance.configurationItemId,
      productId: item.productId,
      productName: item.product.name,
      rowIndex: instance.rowIndex,
      sortOrder: instance.sortOrder,
      positionX: instance.positionX,
      positionY: instance.positionY,
      positionZ: instance.positionZ,
      actualWidth: instance.actualWidth,
      actualHeight: instance.actualHeight,
      actualDepth: instance.actualDepth,
      defaultColor: item.product.defaultColor ?? undefined,
      imageUrl: item.product.images[0]?.url ?? undefined,
      grid,
    }));
  });

  const warningsParsed = z.array(LayoutWarningSchema).safeParse(configuration.warnings);
  const warnings = warningsParsed.success ? warningsParsed.data : [];

  // Serialisable BOM data for the PDF export button (client component)
  const bom: BomRow[] = configuration.items.map((item) => {
    const first = item.placedItemInstances[0];
    const parsedParams = paramsSchema.safeParse(item.params);
    const paramsRecord = parsedParams.success ? parsedParams.data : null;
    const paramsStr = formatParamsWithLabels(item.product, paramsRecord);
    return {
      name: item.product.name,
      qty: item.quantity,
      placed: item.placedItemInstances.length,
      // Use the placed instance's snapshotted dimensions; fall back to the
      // product's own stored width/height for items that didn't fit (no instances).
      width: first?.actualWidth ?? item.product.width ?? 0,
      height: first?.actualHeight ?? item.product.height ?? 0,
      depth: item.product.depth,
      params: paramsStr,
    };
  });

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">{configuration.name}</h1>
      <p className="mt-1 text-stone-500">
        {configuration.wallWidth.toFixed(2)}m × {configuration.wallHeight.toFixed(2)}m wall
      </p>

      {configuration.fits !== null && (
        <div
          className={`mt-4 inline-block rounded border px-3 py-1.5 text-sm font-medium ${
            configuration.fits ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {configuration.fits ? "Fits" : "Doesn't fit"}
        </div>
      )}

      {/* ElevationSvg + SceneLoader + ExportPdfButton live together in a client
          component so they can share the 3D captureRef and the scene-ready flag. */}
      <ConfigurationClientSection
        placements={placements}
        wallWidth={configuration.wallWidth}
        wallHeight={configuration.wallHeight}
        usedWidth={configuration.usedWidth ?? 0}
        bom={bom}
        configName={configuration.name}
      />

      {warnings.length > 0 && (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-red-700">
          {warnings.map((warning, index) => (
            <li key={index}>{warning.message}</li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-lg font-semibold">Bill of materials</h2>
      <ul className="mt-2 divide-y divide-stone-200">
        {configuration.items.map((item) => {
          const first = item.placedItemInstances[0];
          const parsedPs = paramsSchema.safeParse(item.params);
          const paramsRecord = parsedPs.success ? parsedPs.data : null;
          const paramsSummary = formatParamsWithLabels(item.product, paramsRecord);
          const w = first?.actualWidth ?? item.product.width;
          const h = first?.actualHeight ?? item.product.height;
          return (
            <li key={item.id} className="py-2 text-sm">
              <span className="font-medium">{item.product.name}</span>
              {" × "}{item.quantity}
              {item.placedItemInstances.length !== item.quantity && (
                <span className="ml-1 text-stone-400">({item.placedItemInstances.length} placed)</span>
              )}
              {w != null && h != null && (
                <span className="ml-2 text-stone-500">
                  {w.toFixed(3)}m × {h.toFixed(3)}m × {item.product.depth.toFixed(3)}m
                </span>
              )}
              {paramsSummary && (
                <span className="ml-2 text-stone-400">— {paramsSummary}</span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex items-center gap-4 border-t border-stone-200 pt-6">
        <Link href="/configurations" className="text-sm text-stone-500 hover:underline">
          ← All configurations
        </Link>
        <Link href="/configurations/new" className="text-sm text-stone-500 hover:underline">
          + New configuration
        </Link>
        <Link href={`/configurations/${id}/edit`} className="text-sm text-stone-500 hover:underline">
          Edit this configuration
        </Link>
      </div>
    </div>
  );
}
