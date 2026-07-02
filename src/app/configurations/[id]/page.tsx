import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ConfigurationClientSection } from "@/components/export/ConfigurationClientSection";
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

  const placements: PlacedInstance[] = configuration.items.flatMap((item) => {
    // Compute the internal structural grid for parametric items so the 2D elevation
    // can draw column/row dividers and annotate each section's dimensions.
    const parsedConfig = ParametricConfigSchema.safeParse(item.product.parametricConfig);
    const grid =
      item.product.dimensionType === "PARAMETRIC" && parsedConfig.success
        ? computeInternalGrid(
            parsedConfig.data,
            item.params as Record<string, number> | null,
          )
        : undefined;

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
    const paramsRecord =
      item.params !== null && typeof item.params === "object" && !Array.isArray(item.params)
        ? (item.params as Record<string, number>)
        : null;
    const paramsStr = paramsRecord
      ? Object.entries(paramsRecord)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")
      : "";
    return {
      name: item.product.name,
      qty: item.quantity,
      placed: item.placedItemInstances.length,
      width: first?.actualWidth ?? 0,
      height: first?.actualHeight ?? 0,
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
        {configuration.items.map((item) => (
          <li key={item.id} className="py-2 text-sm">
            {item.product.name} × {item.quantity} ({item.placedItemInstances.length} placed) — depth{" "}
            {item.product.depth.toFixed(2)}m
          </li>
        ))}
      </ul>

      <div className="mt-8 flex items-center gap-4 border-t border-stone-200 pt-6">
        <Link href="/" className="text-sm text-stone-500 hover:underline">
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
