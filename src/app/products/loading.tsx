"use client";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse p-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-1/3 rounded bg-stone-200" />
        <div className="h-9 w-28 rounded bg-stone-200" />
      </div>
      <div className="mt-8 space-y-8">
        {[3, 2, 2].map((count, gi) => (
          <div key={gi}>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-4 w-16 rounded bg-stone-200" />
              <div className="h-4 w-6 rounded-full bg-stone-100" />
            </div>
            <div className="divide-y divide-stone-200 rounded-lg border border-stone-200">
              {[...Array(count)].map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-4 w-2/5 rounded bg-stone-200" />
                    <div className="h-3 w-3/4 rounded bg-stone-100" />
                  </div>
                  <div className="h-4 w-8 shrink-0 rounded bg-stone-100" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
