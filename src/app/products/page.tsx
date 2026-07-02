import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { COLUMN_WIDTH, DRAWER_HEIGHT } from "@/lib/layout-engine/dimensions";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const byCategory = products.reduce<Record<string, typeof products>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Product catalog</h1>
        <Link
          href="/products/new"
          className="rounded bg-[#292524] px-4 py-2 text-sm text-white hover:bg-[#44403c]"
        >
          Add product
        </Link>
      </div>

      <div className="mt-8 space-y-8">
        {Object.entries(byCategory).map(([category, items]) => (
          <section key={category}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
              {category}
            </h2>
            <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200">
              {items.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {p.defaultColor && (
                        <span
                          className="inline-block h-4 w-4 rounded-full border border-stone-200"
                          style={{ background: p.defaultColor }}
                        />
                      )}
                      <span className="font-medium">{p.name}</span>
                      {!p.isActive && (
                        <span className="rounded border border-stone-300 px-1.5 py-0.5 text-xs text-stone-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-stone-500">
                      {p.dimensionType === "FIXED"
                        ? `${p.width != null ? p.width.toFixed(3) : "?"}m × ${p.height != null ? p.height.toFixed(3) : "?"}m × ${p.depth.toFixed(3)}m`
                        : `Parametric · col width ${COLUMN_WIDTH.toFixed(3)}m · drawer height ${DRAWER_HEIGHT.toFixed(3)}m · depth ${p.depth.toFixed(3)}m`}
                    </p>
                  </div>
                  <Link
                    href={`/products/${p.id}/edit`}
                    className="shrink-0 text-sm text-stone-500 hover:underline"
                  >
                    Edit
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {products.length === 0 && (
          <div className="rounded-lg border border-dashed border-stone-300 p-12 text-center">
            <p className="text-stone-500">No products yet.</p>
            <Link
              href="/products/new"
              className="mt-4 inline-block rounded bg-[#292524] px-4 py-2 text-sm text-white"
            >
              Add your first product
            </Link>
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-stone-200 pt-6">
        <Link href="/" className="text-sm text-stone-500 hover:underline">
          ← Back to configurations
        </Link>
      </div>
    </div>
  );
}
