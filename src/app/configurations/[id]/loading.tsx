"use client";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse p-6">
      <div className="h-7 w-64 rounded bg-stone-200" />
      <div className="mt-1 h-4 w-40 rounded bg-stone-100" />
      <div className="mt-4 h-7 w-16 rounded bg-stone-200" />
      <div className="mt-6 h-64 w-full rounded-lg border border-stone-200 bg-stone-100" />
      <div className="mt-8 h-5 w-16 rounded bg-stone-200" />
      <div className="mt-3 h-[500px] w-full rounded-lg border border-stone-200 bg-stone-100" />
      <div className="mt-6 h-10 w-44 rounded bg-stone-200" />
      <div className="mt-8 h-5 w-36 rounded bg-stone-200" />
      <div className="mt-2 divide-y divide-stone-200 rounded-lg border border-stone-200">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-stone-50 last:rounded-b-lg" />
        ))}
      </div>
    </div>
  );
}
