"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/generated/prisma/client";
import { ProductPicker } from "@/components/configurator/ProductPicker";
import { SelectedItemsList } from "@/components/configurator/SelectedItemsList";
import { ValidationSummary } from "@/components/configurator/ValidationSummary";
import { WallDimensionsForm } from "@/components/configurator/WallDimensionsForm";
import { useLiveLayout, type SelectedItem } from "@/hooks/useLiveLayout";
import { MAX_WALL_DIMENSION_METERS } from "@/lib/validation/schemas";

interface InitialData {
  name: string;
  wallWidth: number;
  wallHeight: number;
  items: SelectedItem[];
}

interface ConfiguratorClientProps {
  products: Product[];
  // Provided when editing an existing configuration.
  configurationId?: string;
  initialData?: InitialData;
}

type SubmitState = { status: "idle" } | { status: "submitting" } | { status: "error"; message: string };

// These ids are only ever used as local React keys / removal handles for items that
// haven't been saved yet — they don't need to be cryptographically random, just
// unique within this page's lifetime, so a plain counter avoids depending on
// crypto.randomUUID() (which requires a secure context and would throw if this app
// were ever served over plain HTTP).
let nextTempId = 0;

export function ConfiguratorClient({ products, configurationId, initialData }: ConfiguratorClientProps) {
  const isEdit = !!configurationId;
  const router = useRouter();
  const [name, setName] = useState(initialData?.name ?? "");
  const [wallWidth, setWallWidth] = useState(initialData?.wallWidth ?? 4);
  const [wallHeight, setWallHeight] = useState(initialData?.wallHeight ?? 2.6);
  const [items, setItems] = useState<SelectedItem[]>(initialData?.items ?? []);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const { result, error } = useLiveLayout(wallWidth, wallHeight, items, productsById);

  function handleAdd(productId: string, quantity: number, params: Record<string, number> | null) {
    setItems((prev) => [...prev, { tempId: `item-${nextTempId++}`, productId, quantity, params }]);
  }

  function handleRemove(tempId: string) {
    setItems((prev) => prev.filter((item) => item.tempId !== tempId));
  }

  const canSubmit =
    name.trim().length > 0 &&
    Number.isFinite(wallWidth) &&
    wallWidth > 0 &&
    wallWidth <= MAX_WALL_DIMENSION_METERS &&
    Number.isFinite(wallHeight) &&
    wallHeight > 0 &&
    wallHeight <= MAX_WALL_DIMENSION_METERS &&
    items.length > 0 &&
    !error;

  async function handleSubmit() {
    setSubmitState({ status: "submitting" });
    const payload = {
      name,
      wallWidth,
      wallHeight,
      items: items.map((item, index) => ({
        productId: item.productId,
        quantity: item.quantity,
        params: item.params,
        sortOrder: index,
      })),
    };
    try {
      const response = await fetch(
        isEdit ? `/api/configurations/${configurationId}` : "/api/configurations",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        // If the server returned structured validation issues, surface the first one
        // so the user sees a specific message rather than generic "Invalid input".
        const firstIssue =
          Array.isArray(body.issues) && body.issues.length > 0
            ? `: ${body.issues[0].message}`
            : "";
        setSubmitState({ status: "error", message: (body.error ?? "Failed to save configuration") + firstIssue });
        return;
      }
      router.push(`/configurations/${body.id}`);
    } catch {
      setSubmitState({ status: "error", message: "Network error — please try again" });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <WallDimensionsForm
          name={name}
          wallWidth={wallWidth}
          wallHeight={wallHeight}
          onNameChange={setName}
          onWallWidthChange={setWallWidth}
          onWallHeightChange={setWallHeight}
        />
        <ProductPicker products={products} onAdd={handleAdd} />
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border border-stone-200 p-4">
          <h2 className="text-lg font-semibold">Selected items</h2>
          <div className="mt-3">
            <SelectedItemsList items={items} productsById={productsById} onRemove={handleRemove} />
          </div>
        </div>

        <ValidationSummary result={result} error={error} itemCount={items.length} wallWidth={wallWidth} wallHeight={wallHeight} />

        <button
          type="button"
          disabled={!canSubmit || submitState.status === "submitting"}
          onClick={handleSubmit}
          className="w-full rounded bg-[#0369A1] px-4 py-2 text-white transition-colors duration-150 hover:bg-[#0284c7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer"
        >
          {submitState.status === "submitting"
            ? isEdit ? "Saving…" : "Creating…"
            : isEdit ? "Save changes" : "Create configuration"}
        </button>

        {submitState.status === "error" && <p className="text-sm text-red-600">{submitState.message}</p>}
      </div>
    </div>
  );
}
