"use client";

import type { Product } from "@/generated/prisma/client";
import type { SelectedItem } from "@/hooks/useLiveLayout";
import { resolveDimensions } from "@/lib/layout-engine/dimensions";
import { ParametricConfigSchema } from "@/lib/validation/schemas";

interface SelectedItemsListProps {
  items: SelectedItem[];
  productsById: Map<string, Product>;
  onRemove: (tempId: string) => void;
}

function formatParams(product: Product | undefined, params: Record<string, number> | null): string | null {
  if (!params || !product) return null;

  const parsed = ParametricConfigSchema.safeParse(product.parametricConfig);
  if (!parsed.success) {
    return Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join(", ");
  }
  const config = parsed.data;
  const labelByParamName = new Map<string, string>([
    [config.columns.paramName, config.columns.label],
    [config.drawersPerColumn.paramName, config.drawersPerColumn.label],
    [config.rows.paramName, config.rows.label],
    [config.topOption.paramName, config.topOption.label],
    [config.topOption.heightParamName, config.topOption.heightLabel],
  ]);

  return Object.entries(params)
    .map(([key, value]) => {
      const label = labelByParamName.get(key) ?? key;
      return key === config.topOption.paramName ? `${label}: ${value ? "Yes" : "No"}` : `${label}: ${value}`;
    })
    .join(", ");
}

function formatDimensions(product: Product | undefined, params: Record<string, number> | null): string | null {
  if (!product) return null;
  try {
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
      params,
    );
    return `${dimensions.width.toFixed(3)}m × ${dimensions.height.toFixed(3)}m × ${dimensions.depth.toFixed(3)}m`;
  } catch {
    return null;
  }
}

export function SelectedItemsList({ items, productsById, onRemove }: SelectedItemsListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">No products added yet.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-200">
      {items.map((item) => {
        const product = productsById.get(item.productId);
        const paramsSummary = formatParams(product, item.params);
        const dimensionsSummary = formatDimensions(product, item.params);

        return (
          <li key={item.tempId} className="flex items-center justify-between gap-3 py-2">
            <div>
              <p className="font-medium">{product?.name ?? "Unknown product"}</p>
              <p className="text-sm text-zinc-500">
                Qty {item.quantity}
                {dimensionsSummary ? ` · ${dimensionsSummary}` : ""}
              </p>
              {paramsSummary && <p className="text-sm text-zinc-400">{paramsSummary}</p>}
            </div>
            <button
              type="button"
              onClick={() => onRemove(item.tempId)}
              className="shrink-0 rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:underline"
            >
              Remove
            </button>
          </li>
        );
      })}
    </ul>
  );
}
