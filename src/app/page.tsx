import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const configurations = await prisma.wallConfiguration.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      wallWidth: true,
      wallHeight: true,
      fits: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wall configurations</h1>
          <p className="mt-1 text-sm text-zinc-500">Hospital storage furniture configurator</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/products"
            className="rounded border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Product catalog
          </Link>
          <Link
            href="/configurations/new"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
          >
            New configuration
          </Link>
        </div>
      </div>

      <div className="mt-8">
        {configurations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center">
            <p className="text-zinc-500">No configurations yet.</p>
            <Link
              href="/configurations/new"
              className="mt-4 inline-block rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
            >
              Create your first configuration
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {configurations.map((config) => (
              <li key={config.id}>
                <Link
                  href={`/configurations/${config.id}`}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-zinc-50"
                >
                  <div>
                    <p className="font-medium">{config.name}</p>
                    <p className="mt-0.5 text-sm text-zinc-500">
                      {config.wallWidth.toFixed(2)}m × {config.wallHeight.toFixed(2)}m &middot;{" "}
                      {config._count.items} product line{config._count.items === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {config.fits !== null && (
                      <span
                        className={`rounded border px-2 py-0.5 text-xs font-medium ${
                          config.fits
                            ? "border-green-300 bg-green-50 text-green-700"
                            : "border-red-300 bg-red-50 text-red-700"
                        }`}
                      >
                        {config.fits ? "Fits" : "Doesn't fit"}
                      </span>
                    )}
                    <time
                      dateTime={config.createdAt.toISOString()}
                      className="text-xs text-zinc-400"
                    >
                      {config.createdAt.toISOString().slice(0, 10)}
                    </time>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
