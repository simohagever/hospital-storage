import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { resolveDimensions } from "@/lib/layout-engine/dimensions";
import { packWall } from "@/lib/layout-engine/pack";
import { LayoutEngineError, type LayoutInputItem, type PlacedInstance } from "@/lib/layout-engine/types";
import { prisma } from "@/lib/prisma";
import { CreateConfigurationInputSchema, LayoutWarningSchema, ParametricConfigSchema } from "@/lib/validation/schemas";

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

// PATCH intentionally removed — the "Update layout" button was removed from the UI.
// Use PUT to do a full edit (name/wall/items) which also recomputes the layout.

// Full replacement: update name/wall dimensions and replace all items.
// Used by the edit configuration page.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const existing = await prisma.wallConfiguration.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = CreateConfigurationInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productById = new Map(products.map((p) => [p.id, p]));
  const missingIds = productIds.filter((pid) => !productById.has(pid));
  if (missingIds.length > 0) {
    return NextResponse.json({ error: `Unknown product id(s): ${missingIds.join(", ")}` }, { status: 400 });
  }

  const itemIds = input.items.map(() => randomUUID());

  let layoutItems: LayoutInputItem[];
  try {
    layoutItems = input.items.map((item, index) => {
      const product = productById.get(item.productId)!;
      let parametricConfig = null;
      if (product.dimensionType === "PARAMETRIC") {
        try {
          parametricConfig = ParametricConfigSchema.parse(product.parametricConfig);
        } catch {
          throw new Error(`Product "${product.name}" has an invalid stored configuration — check the admin catalog.`);
        }
      }
      const dimensions = resolveDimensions(
        { dimensionType: product.dimensionType, width: product.width, height: product.height, depth: product.depth, parametricConfig },
        item.params ?? null,
      );
      return {
        configItemId: itemIds[index],
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        dimensions,
        defaultColor: product.defaultColor ?? undefined,
        sortOrder: item.sortOrder ?? index,
      };
    });
  } catch (e) {
    if (e instanceof LayoutEngineError || e instanceof Error) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
    throw e;
  }

  const result = packWall(input.wallWidth, input.wallHeight, layoutItems);
  const placementsByItemId = new Map<string, PlacedInstance[]>();
  for (const placement of result.placements) {
    const list = placementsByItemId.get(placement.configItemId) ?? [];
    list.push(placement);
    placementsByItemId.set(placement.configItemId, list);
  }

  // Interactive transaction — sequential operations share a connection and roll
  // back atomically. Using the callback form (vs array form) means a failure on
  // any individual item create surfaces the specific error rather than a generic
  // "transaction failed" message, making debugging much easier.
  await prisma.$transaction(async (tx) => {
    await tx.wallConfigurationItem.deleteMany({ where: { configurationId: id } });

    for (const [index, item] of input.items.entries()) {
      await tx.wallConfigurationItem.create({
        data: {
          id: itemIds[index],
          configurationId: id,
          productId: item.productId,
          quantity: item.quantity,
          params: item.params ?? undefined,
          sortOrder: item.sortOrder ?? index,
          placedItemInstances: {
            create: (placementsByItemId.get(itemIds[index]) ?? []).map((p) => ({
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
          },
        },
      });
    }

    await tx.wallConfiguration.update({
      where: { id },
      data: {
        name: input.name,
        wallWidth: input.wallWidth,
        wallHeight: input.wallHeight,
        fits: result.fits,
        usedWidth: result.usedWidth,
        usedHeight: result.usedHeight,
        // Validate warnings through LayoutWarningSchema before storing so
        // the shape written to the DB always matches what the results page reads.
        warnings: LayoutWarningSchema.array().parse(result.warnings) as unknown as Prisma.InputJsonValue,
        layoutComputedAt: new Date(),
      },
    });
  });

  return NextResponse.json({ id, fits: result.fits });
}
