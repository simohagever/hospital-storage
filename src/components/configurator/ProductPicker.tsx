"use client";

import { useState } from "react";
import type { Product } from "@/generated/prisma/client";
import { resolveDimensions } from "@/lib/layout-engine/dimensions";
import { LayoutEngineError } from "@/lib/layout-engine/types";
import { ParametricConfigSchema, type CountSetting, type ParametricConfig } from "@/lib/validation/schemas";

interface ProductPickerProps {
  products: Product[];
  onAdd: (productId: string, quantity: number, params: Record<string, number> | null) => void;
}

export function ProductPicker({ products, onAdd }: ProductPickerProps) {
  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 p-4">
      <h2 className="text-lg font-semibold">Add products</h2>
      <div className="space-y-3">
        {products.map((product) => (
          <ProductPickerRow key={product.id} product={product} onAdd={onAdd} />
        ))}
      </div>
    </div>
  );
}

function defaultParamsFor(config: ParametricConfig): Record<string, number> {
  return {
    [config.columns.paramName]: config.columns.defaultValue,
    [config.drawersPerColumn.paramName]: config.drawersPerColumn.defaultValue,
    [config.rows.paramName]: config.rows.defaultValue,
    [config.topOption.paramName]: config.topOption.defaultEnabled ? 1 : 0,
    [config.topOption.heightParamName]: config.topOption.defaultHeight,
  };
}

function ProductPickerRow({ product, onAdd }: { product: Product; onAdd: ProductPickerProps["onAdd"] }) {
  const [quantity, setQuantity] = useState(1);

  const parsedConfig = ParametricConfigSchema.safeParse(product.parametricConfig);
  const parametricConfig = product.dimensionType === "PARAMETRIC" && parsedConfig.success ? parsedConfig.data : null;

  const [params, setParams] = useState<Record<string, number>>(() =>
    parametricConfig ? defaultParamsFor(parametricConfig) : {},
  );

  let preview: { width: number; height: number; depth: number } | null = null;
  let previewError: string | null = null;
  try {
    preview = resolveDimensions(
      {
        dimensionType: product.dimensionType,
        width: product.width,
        height: product.height,
        depth: product.depth,
        parametricConfig,
      },
      parametricConfig ? params : null,
    );
  } catch (e) {
    previewError = e instanceof LayoutEngineError ? e.message : "Invalid configuration";
  }

  const hasTop = parametricConfig ? Boolean(params[parametricConfig.topOption.paramName]) : false;

  return (
    <div className="rounded border border-zinc-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{product.name}</p>
          <p className="text-sm text-zinc-500">{product.category}</p>
        </div>
      </div>

      {parametricConfig && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CountField
            setting={parametricConfig.columns}
            value={params[parametricConfig.columns.paramName]}
            onChange={(v) => setParams((p) => ({ ...p, [parametricConfig.columns.paramName]: v }))}
          />
          <CountField
            setting={parametricConfig.drawersPerColumn}
            value={params[parametricConfig.drawersPerColumn.paramName]}
            onChange={(v) => setParams((p) => ({ ...p, [parametricConfig.drawersPerColumn.paramName]: v }))}
          />
          <CountField
            setting={parametricConfig.rows}
            value={params[parametricConfig.rows.paramName]}
            onChange={(v) => setParams((p) => ({ ...p, [parametricConfig.rows.paramName]: v }))}
          />
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <input
                type="checkbox"
                checked={hasTop}
                onChange={(e) =>
                  setParams((p) => ({ ...p, [parametricConfig.topOption.paramName]: e.target.checked ? 1 : 0 }))
                }
              />
              {parametricConfig.topOption.label}
            </label>
            {hasTop && (
              <input
                type="number"
                step="0.01"
                min={parametricConfig.topOption.minHeight}
                max={parametricConfig.topOption.maxHeight}
                value={Number.isFinite(params[parametricConfig.topOption.heightParamName]) ? params[parametricConfig.topOption.heightParamName] : ""}
                onChange={(e) =>
                  setParams((p) => ({ ...p, [parametricConfig.topOption.heightParamName]: e.target.valueAsNumber }))
                }
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
              />
            )}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-sm">
          {preview && (
            <span className="text-zinc-600">
              {preview.width.toFixed(3)}m × {preview.height.toFixed(3)}m × {preview.depth.toFixed(3)}m
            </span>
          )}
          {previewError && <span className="text-red-600">{previewError}</span>}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.valueAsNumber)}
            className="w-16 rounded border border-zinc-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            disabled={!preview}
            onClick={() => onAdd(product.id, quantity, parametricConfig ? params : null)}
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function CountField({
  setting,
  value,
  onChange,
}: {
  setting: CountSetting;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="block font-medium text-zinc-700">{setting.label}</span>
      <input
        type="number"
        min={setting.min}
        max={setting.max}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
      />
    </label>
  );
}
