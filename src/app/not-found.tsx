import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl p-6 text-center">
      <h1 className="text-2xl font-bold text-zinc-900">Page not found</h1>
      <p className="mt-2 text-zinc-500">The item you are looking for may have been deleted or the link is wrong.</p>
      <Link href="/" className="mt-6 inline-block rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700">
        Back to configurations
      </Link>
    </div>
  );
}
