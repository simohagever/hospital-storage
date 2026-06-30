import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Add product</h1>
      <p className="mt-1 text-sm text-zinc-500">
        New products appear in the configuration picker immediately after saving.
      </p>
      <div className="mt-6">
        <ProductForm />
      </div>
      <div className="mt-8 border-t border-zinc-200 pt-6">
        <Link href="/products" className="text-sm text-zinc-500 hover:underline">
          ← Back to catalog
        </Link>
      </div>
    </div>
  );
}
