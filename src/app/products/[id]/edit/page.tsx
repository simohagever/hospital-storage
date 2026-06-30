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
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Edit product</h1>
      <p className="mt-1 text-sm text-zinc-500">{product.name}</p>
      <div className="mt-6">
        <ProductForm product={product} />
      </div>
      <div className="mt-8 border-t border-zinc-200 pt-6">
        <Link href="/products" className="text-sm text-zinc-500 hover:underline">
          ← Back to catalog
        </Link>
      </div>
    </div>
  );
}
