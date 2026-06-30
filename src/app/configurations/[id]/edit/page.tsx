import { notFound } from "next/navigation";
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

  let counter = 0;
  const initialItems: SelectedItem[] = configuration.items.map((item) => ({
    tempId: `existing-${counter++}`,
    productId: item.productId,
    quantity: item.quantity,
    params: item.params as Record<string, number> | null,
  }));

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">Edit configuration</h1>
      <p className="mt-1 text-sm text-zinc-500">{configuration.name}</p>
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
