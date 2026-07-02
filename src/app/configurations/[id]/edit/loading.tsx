"use client";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse p-6">
      <div className="h-7 w-44 rounded bg-stone-200" />
      <div className="mt-1 h-4 w-56 rounded bg-stone-100" />
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="h-40 rounded-lg border border-stone-200 bg-stone-50" />
          <div className="h-64 rounded-lg border border-stone-200 bg-stone-50" />
        </div>
        <div className="space-y-6">
          <div className="h-40 rounded-lg border border-stone-200 bg-stone-50" />
          <div className="h-16 rounded border border-stone-200 bg-stone-50" />
          <div className="h-10 w-full rounded bg-stone-200" />
        </div>
      </div>
    </div>
  );
}
