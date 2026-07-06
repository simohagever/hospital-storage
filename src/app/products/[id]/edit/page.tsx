export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { prisma } from "@/lib/prisma";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: { where: { isPrimary: true }, take: 1 } },
  });
  if (!product) notFound();

  const primaryImage = product.images[0] ?? null;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Edit product</h1>
      <p className="mt-1 text-sm text-stone-500">{product.name}</p>
      <div className="mt-6">
        <ProductForm
          product={product}
          primaryImage={primaryImage ? { id: primaryImage.id, url: primaryImage.url } : null}
        />
      </div>
      <div className="mt-8 border-t border-stone-200 pt-6">
        <Link href="/products" className="text-sm text-stone-500 hover:underline">
          ← Back to catalog
        </Link>
      </div>
    </div>
  );
}
