"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/generated/prisma/client";
import { ProductImageUploader } from "@/components/admin/ProductImageUploader";
import { ParametricConfigSchema, type ParametricConfig } from "@/lib/validation/schemas";

interface ProductFormProps {
  product?: Product; // undefined = create mode, defined = edit mode
  primaryImage?: { id: string; url: string } | null;
}

const DEFAULT_PARAMETRIC_CONFIG: ParametricConfig = {
  columns: { paramName: "columns", label: "Columns", min: 1, max: 8, defaultValue: 3 },
  drawersPerColumn: {
    paramName: "drawersPerColumn",
    label: "Drawers per column",
    min: 1,
    max: 20,
    defaultValue: 5,
  },
  rows: { paramName: "rows", label: "Rows", min: 1, max: 6, defaultValue: 1 },
  topOption: {
    paramName: "hasTop",
    label: "Top shelf",
    defaultEnabled: true,
    heightParamName: "topHeight",
    heightLabel: "Top shelf height",
    minHeight: 0.05,
    maxHeight: 0.5,
    defaultHeight: 0.1,
  },
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function ProductForm({ product, primaryImage }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [category, setCategory] = useState(product?.category ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [defaultColor, setDefaultColor] = useState(product?.defaultColor ?? "#6b8fa8");
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [depth, setDepth] = useState(product?.depth?.toString() ?? "");
  const [dimensionType, setDimensionType] = useState<"FIXED" | "PARAMETRIC">(
    product?.dimensionType ?? "FIXED",
  );
  const [width, setWidth] = useState(product?.width?.toString() ?? "");
  const [height, setHeight] = useState(product?.height?.toString() ?? "");

  const parsedConfig = ParametricConfigSchema.safeParse(product?.parametricConfig);
  const [parametricConfig, setParametricConfig] = useState<ParametricConfig>(
    parsedConfig.success ? parsedConfig.data : DEFAULT_PARAMETRIC_CONFIG,
  );

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function updateCountSetting(
    field: "columns" | "drawersPerColumn" | "rows",
    key: string,
    value: string,
  ) {
    const num = Number(value);
    setParametricConfig((c) => ({ ...c, [field]: { ...c[field], [key]: num } }));
  }

  function updateTopOption(key: string, value: string | boolean) {
    setParametricConfig((c) => ({
      ...c,
      topOption: { ...c.topOption, [key]: typeof value === "boolean" ? value : Number(value) },
    }));
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSubmitError(null);

    // Guard against non-finite numbers from partially-cleared inputs before the
    // round-trip to the server, which would give a less clear error.
    const depthNum = parseFloat(depth);
    if (!Number.isFinite(depthNum) || depthNum <= 0) {
      setSubmitError("Depth must be a positive number.");
      return;
    }
    if (dimensionType === "FIXED") {
      const w = parseFloat(width), h = parseFloat(height);
      if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) {
        setSubmitError("Width and height must be positive numbers.");
        return;
      }
    }

    setSaving(true);

    const body =
      dimensionType === "FIXED"
        ? {
            dimensionType,
            name,
            slug,
            category,
            description: description || undefined,
            defaultColor: defaultColor || null,
            isActive,
            depth: depthNum,
            width: parseFloat(width),
            height: parseFloat(height),
          }
        : {
            dimensionType,
            name,
            slug,
            category,
            description: description || undefined,
            defaultColor: defaultColor || null,
            isActive,
            depth: depthNum,
            parametricConfig,
          };

    const url = isEdit ? `/api/products/${product.id}` : "/api/products";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setSubmitError(json.error ?? "Failed to save product");
        return;
      }
      // router.push to a Server Component page re-fetches data automatically —
      // no router.refresh() needed.
      router.push("/products");
    } catch {
      setSubmitError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit || !confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setSubmitError(json.error ?? "Failed to delete product");
        return;
      }
      router.push("/products");
    } catch {
      setSubmitError("Network error — please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="space-y-4 rounded-lg border border-zinc-200 p-4">
        <h2 className="font-semibold">Basic info</h2>

        <label className="block">
          <span className="block text-sm font-medium text-zinc-700">Name</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-zinc-700">Slug</span>
          <input
            type="text"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
          />
          <span className="mt-1 block text-xs text-zinc-400">
            Lowercase letters, numbers, hyphens. Auto-derived from name.
          </span>
          {slug === "" && name !== "" && (
            <span className="mt-1 block text-xs text-amber-600">
              Name contains no Latin characters — please type a slug manually.
            </span>
          )}
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-medium text-zinc-700">Category</span>
            <input
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              placeholder="e.g. locker"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-zinc-700">Depth (m)</span>
            <input
              type="number"
              required
              step="0.001"
              min="0.001"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </label>
        </div>

        <label className="block">
          <span className="block text-sm font-medium text-zinc-700">Description</span>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <label className="block">
            <span className="block text-sm font-medium text-zinc-700">Default colour</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={defaultColor ?? "#6b8fa8"}
                onChange={(e) => setDefaultColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border border-zinc-300 p-1"
              />
              <input
                type="text"
                value={defaultColor ?? ""}
                onChange={(e) => setDefaultColor(e.target.value)}
                placeholder="#6b8fa8"
                className="w-28 rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
              />
            </div>
          </label>

          <label className="flex items-center gap-2 pt-5 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active (visible in picker)
          </label>
        </div>
      </div>

      {/* Dimension type */}
      {isEdit && product ? (
        <div className="rounded-lg border border-zinc-200 p-4">
          <ProductImageUploader
            productId={product.id}
            imageId={primaryImage?.id ?? null}
            currentImageUrl={primaryImage?.url ?? null}
            onUploaded={() => router.refresh()}
            onDeleted={() => router.refresh()}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-500">
          Save the product first, then come back to edit it to upload a photo.
        </div>
      )}

      <div className="space-y-4 rounded-lg border border-zinc-200 p-4">
        <h2 className="font-semibold">Dimensions</h2>

        <div className="flex gap-4">
          {(["FIXED", "PARAMETRIC"] as const).map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="dimensionType"
                value={type}
                checked={dimensionType === type}
                onChange={() => setDimensionType(type)}
              />
              {type === "FIXED" ? "Fixed size" : "Parametric (user-configurable)"}
            </label>
          ))}
        </div>

        {dimensionType === "FIXED" ? (
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-zinc-700">Width (m)</span>
              <input
                type="number"
                required
                step="0.001"
                min="0.001"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-zinc-700">Height (m)</span>
              <input
                type="number"
                required
                step="0.001"
                min="0.001"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            {(["columns", "drawersPerColumn", "rows"] as const).map((field) => (
              <div key={field} className="rounded border border-zinc-100 p-3">
                <p className="mb-2 text-sm font-medium text-zinc-700">
                  {parametricConfig[field].label}
                </p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {(["paramName", "label", "min", "max", "defaultValue"] as const).map((key) => (
                    <label key={key} className="block text-xs">
                      <span className="block text-zinc-500">{key}</span>
                      <input
                        type={["min", "max", "defaultValue"].includes(key) ? "number" : "text"}
                        value={String(
                          (parametricConfig[field] as Record<string, unknown>)[key] ?? "",
                        )}
                        onChange={(e) => updateCountSetting(field, key, e.target.value)}
                        className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="rounded border border-zinc-100 p-3">
              <p className="mb-2 text-sm font-medium text-zinc-700">Top shelf option</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(["paramName", "label", "heightParamName", "heightLabel"] as const).map((key) => (
                  <label key={key} className="block text-xs">
                    <span className="block text-zinc-500">{key}</span>
                    <input
                      type="text"
                      value={String(
                        (parametricConfig.topOption as Record<string, unknown>)[key] ?? "",
                      )}
                      onChange={(e) => updateTopOption(key, e.target.value)}
                      className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1"
                    />
                  </label>
                ))}
                <label className="block text-xs">
                  <span className="block text-zinc-500">defaultEnabled</span>
                  <input
                    type="checkbox"
                    checked={parametricConfig.topOption.defaultEnabled}
                    onChange={(e) => updateTopOption("defaultEnabled", e.target.checked)}
                    className="mt-2"
                  />
                </label>
                {(["minHeight", "maxHeight", "defaultHeight"] as const).map((key) => (
                  <label key={key} className="block text-xs">
                    <span className="block text-zinc-500">{key} (m)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={String(
                        (parametricConfig.topOption as Record<string, unknown>)[key] ?? "",
                      )}
                      onChange={(e) => updateTopOption(key, e.target.value)}
                      className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {submitError && (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-red-600 hover:underline disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete product"}
          </button>
        )}
      </div>
    </form>
  );
}
