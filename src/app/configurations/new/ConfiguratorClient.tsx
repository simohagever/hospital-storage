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

interface ConfiguratorClientProps {
  products: Product[];
}

type SubmitState = { status: "idle" } | { status: "submitting" } | { status: "error"; message: string };

// These ids are only ever used as local React keys / removal handles for items that
// haven't been saved yet — they don't need to be cryptographically random, just
// unique within this page's lifetime, so a plain counter avoids depending on
// crypto.randomUUID() (which requires a secure context and would throw if this app
// were ever served over plain HTTP).
let nextTempId = 0;

export function ConfiguratorClient({ products }: ConfiguratorClientProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [wallWidth, setWallWidth] = useState(4);
  const [wallHeight, setWallHeight] = useState(2.6);
  const [items, setItems] = useState<SelectedItem[]>([]);
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
    try {
      const response = await fetch("/api/configurations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          wallWidth,
          wallHeight,
          items: items.map((item, index) => ({
            productId: item.productId,
            quantity: item.quantity,
            params: item.params,
            sortOrder: index,
          })),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setSubmitState({ status: "error", message: body.error ?? "Failed to save configuration" });
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
        <div className="rounded-lg border border-zinc-200 p-4">
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
          className="w-full rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitState.status === "submitting" ? "Creating…" : "Create configuration"}
        </button>

        {submitState.status === "error" && <p className="text-sm text-red-600">{submitState.message}</p>}
      </div>
    </div>
  );
}
