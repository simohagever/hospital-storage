import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { resolveDimensions } from "@/lib/layout-engine/dimensions";
import { packWall } from "@/lib/layout-engine/pack";
import { LayoutEngineError, type LayoutInputItem, type PlacedInstance } from "@/lib/layout-engine/types";
import { prisma } from "@/lib/prisma";
import { ParametricConfigSchema } from "@/lib/validation/schemas";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.wallConfiguration.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw e;
  }
}

// Re-resolves dimensions from the current product catalog and re-packs the wall.
// Useful after product dimensions change in the admin catalog.
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const configuration = await prisma.wallConfiguration.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!configuration) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let layoutItems: LayoutInputItem[];
  try {
    layoutItems = configuration.items.map((item) => {
      const product = item.product;
      const parametricConfig =
        product.dimensionType === "PARAMETRIC"
          ? ParametricConfigSchema.parse(product.parametricConfig)
          : null;

      const dimensions = resolveDimensions(
        {
          dimensionType: product.dimensionType,
          width: product.width,
          height: product.height,
          depth: product.depth,
          parametricConfig,
        },
        item.params as Record<string, number> | null,
      );

      return {
        configItemId: item.id, // reuse existing WallConfigurationItem.id — no new IDs needed
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        dimensions,
        defaultColor: product.defaultColor ?? undefined,
        sortOrder: item.sortOrder,
      };
    });
  } catch (e) {
    if (e instanceof LayoutEngineError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: "A referenced product's stored configuration is invalid." },
        { status: 500 },
      );
    }
    throw e;
  }

  const result = packWall(configuration.wallWidth, configuration.wallHeight, layoutItems);

  const placementsByItemId = new Map<string, PlacedInstance[]>();
  for (const placement of result.placements) {
    const list = placementsByItemId.get(placement.configItemId) ?? [];
    list.push(placement);
    placementsByItemId.set(placement.configItemId, list);
  }

  // Replace all placed instances atomically.
  await prisma.$transaction([
    prisma.placedItemInstance.deleteMany({ where: { configurationId: id } }),
    ...configuration.items.map((item) =>
      prisma.placedItemInstance.createMany({
        data: (placementsByItemId.get(item.id) ?? []).map((p) => ({
          configurationItemId: item.id,
          configurationId: id,
          instanceKey: p.instanceKey,
          actualWidth: p.actualWidth,
          actualHeight: p.actualHeight,
          actualDepth: p.actualDepth,
          positionX: p.positionX,
          positionY: p.positionY,
          positionZ: p.positionZ,
          rowIndex: p.rowIndex,
          sortOrder: p.sortOrder,
        })),
      }),
    ),
    prisma.wallConfiguration.update({
      where: { id },
      data: {
        fits: result.fits,
        usedWidth: result.usedWidth,
        usedHeight: result.usedHeight,
        warnings: result.warnings as unknown as Prisma.InputJsonValue,
        layoutComputedAt: new Date(),
      },
    }),
  ]);

  // Include fit status in the response so the client can show immediate feedback
  // before the page refresh that will display the updated drawing.
  return NextResponse.json({ ok: true, fits: result.fits, warnings: result.warnings });
}
