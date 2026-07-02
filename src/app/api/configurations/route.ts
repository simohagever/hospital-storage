import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveDimensions } from "@/lib/layout-engine/dimensions";
import { packWall } from "@/lib/layout-engine/pack";
import { LayoutEngineError, type LayoutInputItem, type PlacedInstance } from "@/lib/layout-engine/types";
import { CreateConfigurationInputSchema, ParametricConfigSchema } from "@/lib/validation/schemas";

// The server always re-derives the layout from the referenced products and submitted
// params/quantities — a client-submitted layout result is never trusted or accepted,
// both because product dimensions could have changed since the user started, and
// because this is the one place a layout becomes a permanent saved record.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
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

  const missingIds = productIds.filter((id) => !productById.has(id));
  if (missingIds.length > 0) {
    return NextResponse.json({ error: `Unknown product id(s): ${missingIds.join(", ")}` }, { status: 400 });
  }

  // Generated up front, before any database write, so the packer can tag each
  // placement with the id its WallConfigurationItem row will have once saved — this
  // lets the whole configuration be saved as a single atomic nested-create instead of
  // an insert-then-go-back-and-link-ids two-phase write.
  const configId = randomUUID();
  const itemIds = input.items.map(() => randomUUID());

  let layoutItems: LayoutInputItem[];
  try {
    layoutItems = input.items.map((item, index) => {
      const product = productById.get(item.productId)!;
      // The DB's CHECK constraint only verifies parametricConfig has the right top-level
      // keys present, not that their contents are internally consistent — re-validate
      // here so a corrupted/out-of-band row fails with a clean error instead of an
      // unhandled crash inside resolveDimensions.
      const parametricConfig =
        product.dimensionType === "PARAMETRIC" ? ParametricConfigSchema.parse(product.parametricConfig) : null;

      const dimensions = resolveDimensions(
        {
          dimensionType: product.dimensionType,
          width: product.width,
          height: product.height,
          depth: product.depth,
          parametricConfig,
        },
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
    if (e instanceof LayoutEngineError) {
      // Caused by what the requester submitted (an out-of-range param) — their fault, 400.
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e instanceof ZodError) {
      // Caused by a stored product's own data being internally inconsistent despite
      // passing the DB's coarse shape check — not the requester's fault, 500.
      return NextResponse.json(
        { error: "A referenced product's stored configuration is invalid. Please contact support." },
        { status: 500 },
      );
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

  try {
    await prisma.wallConfiguration.create({
      data: {
        id: configId,
        name: input.name,
        wallWidth: input.wallWidth,
        wallHeight: input.wallHeight,
        fits: result.fits,
        usedWidth: result.usedWidth,
        usedHeight: result.usedHeight,
        warnings: result.warnings as unknown as Prisma.InputJsonValue,
        layoutComputedAt: new Date(),
        items: {
          create: input.items.map((item, index) => ({
            id: itemIds[index],
            productId: item.productId,
            quantity: item.quantity,
            params: item.params ?? null,
            sortOrder: item.sortOrder ?? index,
            placedItemInstances: {
              create: (placementsByItemId.get(itemIds[index]) ?? []).map((p) => ({
                configurationId: configId,
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
          })),
        },
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to save configuration — please try again." }, { status: 500 });
  }

  // Client only needs the id to navigate to the results page — avoid serialising
  // the entire nested configuration (items + instances) in the response.
  return NextResponse.json({ id: configId, fits: result.fits }, { status: 201 });
}
