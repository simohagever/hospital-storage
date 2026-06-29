import { useMemo } from "react";
import { ZodError } from "zod";
import type { Product } from "@/generated/prisma/client";
import { resolveDimensions } from "@/lib/layout-engine/dimensions";
import { packWall } from "@/lib/layout-engine/pack";
import { LayoutEngineError, type LayoutInputItem, type LayoutResult } from "@/lib/layout-engine/types";
import { ParametricConfigSchema } from "@/lib/validation/schemas";

export interface SelectedItem {
  tempId: string;
  productId: string;
  quantity: number;
  params: Record<string, number> | null;
}

export interface LiveLayoutResult {
  result: LayoutResult | null;
  error: string | null;
}

// Mirrors POST /api/configurations's resolve-then-pack sequence exactly, so what the
// user sees while building their list never diverges from what the server will
// compute when they submit. Never persists anything — purely a live preview.
//
// `error` means the computation itself couldn't run (bad params, missing product) —
// not "doesn't fit". A wall that's too small still produces a normal, successful
// `result` with `fits: false` and populated `warnings`/`unplaced`; that's read and
// displayed by ValidationSummary, not represented as an error here.
export function useLiveLayout(
  wallWidth: number,
  wallHeight: number,
  items: SelectedItem[],
  productsById: Map<string, Product>,
): LiveLayoutResult {
  return useMemo(() => {
    if (!Number.isFinite(wallWidth) || wallWidth <= 0 || !Number.isFinite(wallHeight) || wallHeight <= 0) {
      return { result: null, error: null };
    }

    try {
      const layoutItems: LayoutInputItem[] = items.map((item, index) => {
        const product = productsById.get(item.productId);
        if (!product) {
          throw new LayoutEngineError("Selected product is no longer available");
        }

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
          item.params,
        );

        return {
          configItemId: item.tempId,
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          dimensions,
          defaultColor: product.defaultColor ?? undefined,
          sortOrder: index,
        };
      });

      return { result: packWall(wallWidth, wallHeight, layoutItems), error: null };
    } catch (e) {
      if (e instanceof LayoutEngineError) {
        return { result: null, error: e.message };
      }
      if (e instanceof ZodError) {
        return { result: null, error: "A selected product's stored configuration is invalid." };
      }
      throw e;
    }
  }, [wallWidth, wallHeight, items, productsById]);
}
