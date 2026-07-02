import { notFound } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ConfiguratorClient } from "@/app/configurations/new/ConfiguratorClient";
import type { SelectedItem } from "@/hooks/useLiveLayout";

export default async function EditConfigurationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const configuration = await prisma.wallConfiguration.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (!configuration) notFound();

  const usedProductIds = configuration.items.map((item) => item.productId);

  // Include products that are currently active OR that are already in this
  // configuration (even if deactivated since it was saved), so the user can
  // see and edit them rather than having them appear as "Unknown product".
  const products = await prisma.product.findMany({
    where: { OR: [{ isActive: true }, { id: { in: usedProductIds } }] },
    orderBy: { name: "asc" },
  });

  // Validate stored params with zod instead of blindly casting — if someone
  // stored non-numeric values in the DB the edit page would silently pass bad
  // state to useLiveLayout; with safeParse we fall back to null (defaults) instead.
  const paramsSchema = z.record(z.string(), z.number()).nullable();
  let counter = 0;
  const initialItems: SelectedItem[] = configuration.items.map((item) => {
    const paramsResult = paramsSchema.safeParse(item.params);
    return {
      tempId: `existing-${counter++}`,
      productId: item.productId,
      quantity: item.quantity,
      // Use the zod-validated output, not the raw Prisma JsonValue cast, so any
      // coercions or refinements applied by the schema are actually in effect.
      params: paramsResult.success ? paramsResult.data : null,
    };
  });

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">Edit configuration</h1>
      <p className="mt-1 text-sm text-stone-500">{configuration.name}</p>
      <div className="mt-6">
        <ConfiguratorClient
          products={products}
          configurationId={id}
          initialData={{
            name: configuration.name,
            wallWidth: configuration.wallWidth,
            wallHeight: configuration.wallHeight,
            items: initialItems,
          }}
        />
      </div>
    </div>
  );
}
