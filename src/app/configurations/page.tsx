export const dynamic = "force-dynamic";

import Link from "next/link";
import { DeleteConfigButton } from "@/components/admin/DeleteConfigButton";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

export default async function ConfigurationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [configurations, total] = await Promise.all([
    prisma.wallConfiguration.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        wallWidth: true,
        wallHeight: true,
        fits: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.wallConfiguration.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Configurations</h1>
        <Link
          href="/configurations/new"
          className="rounded-lg bg-[#0369A1] px-4 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-[#0284C7]"
        >
          New configuration →
        </Link>
      </div>

      {configurations.length === 0 ? (
        <div className="mt-16 text-center text-stone-400">
          <p className="text-lg">No configurations yet.</p>
          <p className="mt-1 text-sm">
            <Link href="/configurations/new" className="text-[#0369A1] hover:underline">
              Create your first one →
            </Link>
          </p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white shadow-sm">
          {configurations.map((config) => (
            <li key={config.id} className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/configurations/${config.id}`}
                  className="font-medium text-stone-900 hover:underline"
                >
                  {config.name}
                </Link>
                <p className="mt-0.5 text-xs text-stone-400">
                  {config.wallWidth.toFixed(2)}m × {config.wallHeight.toFixed(2)}m ·{" "}
                  {new Date(config.updatedAt).toLocaleDateString()}
                </p>
              </div>

              {config.fits !== null && (
                <span
                  className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${
                    config.fits
                      ? "border-green-300 bg-green-50 text-green-700"
                      : "border-red-300 bg-red-50 text-red-700"
                  }`}
                >
                  {config.fits ? "Fits" : "Doesn't fit"}
                </span>
              )}

              <Link
                href={`/configurations/${config.id}/edit`}
                className="shrink-0 text-sm text-stone-400 hover:text-stone-700 hover:underline"
              >
                Edit
              </Link>

              <DeleteConfigButton id={config.id} name={config.name} />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm text-stone-500">
          <span>Page {page} of {totalPages} · {total} total</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/configurations?page=${page - 1}`}
                className="rounded border border-stone-300 px-3 py-1.5 hover:bg-stone-50"
              >
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/configurations?page=${page + 1}`}
                className="rounded border border-stone-300 px-3 py-1.5 hover:bg-stone-50"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
