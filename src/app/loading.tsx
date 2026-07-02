"use client";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-stone-200" />
          <div className="h-4 w-64 rounded bg-stone-100" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-32 rounded bg-stone-200" />
          <div className="h-9 w-40 rounded bg-stone-200" />
        </div>
      </div>
      <div className="mt-8 overflow-hidden rounded-xl border border-stone-200 bg-white">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 border-b border-stone-100 p-4 last:border-0">
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 rounded bg-stone-200" />
              <div className="h-3 w-64 rounded bg-stone-100" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-14 rounded bg-stone-100" />
              <div className="h-3 w-20 rounded bg-stone-100" />
              <div className="h-4 w-8 rounded bg-stone-100" />
              <div className="h-4 w-12 rounded bg-stone-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
