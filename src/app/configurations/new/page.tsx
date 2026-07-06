export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { ConfiguratorClient } from "./ConfiguratorClient";

export default async function NewConfigurationPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">New wall configuration</h1>
      <p className="mt-1 text-zinc-600">Pick a wall size and add products to see whether they fit.</p>
      <div className="mt-6">
        {products.length === 0 ? (
          <p className="rounded border border-zinc-200 bg-zinc-50 p-4 text-zinc-600">
            No active products in the catalog yet.
          </p>
        ) : (
          <ConfiguratorClient products={products} />
        )}
      </div>
    </div>
  );
}
