import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ElevationSvg } from "@/components/elevation/ElevationSvg";
import { SceneLoader } from "@/components/viewer3d/SceneLoader";
import { computeInternalGrid } from "@/lib/layout-engine/computeInternalGrid";
import type { PlacedInstance } from "@/lib/layout-engine/types";
import { prisma } from "@/lib/prisma";
import { LayoutWarningSchema, ParametricConfigSchema } from "@/lib/validation/schemas";

export default async function ConfigurationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const configuration = await prisma.wallConfiguration.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: true, placedItemInstances: true },
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
      grid,
    }));
  });

  const warningsParsed = z.array(LayoutWarningSchema).safeParse(configuration.warnings);
  const warnings = warningsParsed.success ? warningsParsed.data : [];

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">{configuration.name}</h1>
      <p className="mt-1 text-zinc-600">
        {configuration.wallWidth.toFixed(2)}m × {configuration.wallHeight.toFixed(2)}m wall
      </p>

      <div
        className={`mt-4 inline-block rounded border px-3 py-1.5 text-sm font-medium ${
          configuration.fits ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"
        }`}
      >
        {configuration.fits ? "Fits" : "Doesn't fit"}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 p-4">
        <ElevationSvg
          placements={placements}
          wallWidth={configuration.wallWidth}
          wallHeight={configuration.wallHeight}
          usedWidth={configuration.usedWidth ?? 0}
        />
      </div>

      {warnings.length > 0 && (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-red-700">
          {warnings.map((warning, index) => (
            <li key={index}>{warning.message}</li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-lg font-semibold">3D view</h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200">
        <SceneLoader
          placements={placements}
          wallWidth={configuration.wallWidth}
          wallHeight={configuration.wallHeight}
          usedWidth={configuration.usedWidth ?? 0}
        />
      </div>

      <h2 className="mt-8 text-lg font-semibold">Bill of materials</h2>
      <ul className="mt-2 divide-y divide-zinc-200">
        {configuration.items.map((item) => (
          <li key={item.id} className="py-2 text-sm">
            {item.product.name} × {item.quantity} ({item.placedItemInstances.length} placed) — depth{" "}
            {item.product.depth.toFixed(2)}m
          </li>
        ))}
      </ul>

      <Link href="/configurations/new" className="mt-6 inline-block text-sm text-zinc-600 hover:underline">
        Create another configuration
      </Link>
    </div>
  );
}
