"use client";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse p-6">
      <div className="h-7 w-2/5 rounded bg-stone-200" />
      <div className="mt-1 h-4 w-3/5 rounded bg-stone-100" />
      <div className="mt-6 space-y-5">
        {/* Name + Slug */}
        <div className="space-y-1.5">
          <div className="h-3.5 w-16 rounded bg-stone-200" />
          <div className="h-10 w-full rounded bg-stone-100" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3.5 w-12 rounded bg-stone-200" />
          <div className="h-10 w-full rounded bg-stone-100" />
        </div>
        {/* Category + Depth row */}
        <div className="flex gap-4">
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-16 rounded bg-stone-200" />
            <div className="h-10 w-full rounded bg-stone-100" />
          </div>
          <div className="w-32 space-y-1.5">
            <div className="h-3.5 w-14 rounded bg-stone-200" />
            <div className="h-10 w-full rounded bg-stone-100" />
          </div>
        </div>
        {/* Dimension type toggle */}
        <div className="flex gap-3">
          <div className="h-8 w-20 rounded bg-stone-200" />
          <div className="h-8 w-24 rounded bg-stone-100" />
        </div>
        {/* Width + Height */}
        <div className="flex gap-4">
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-12 rounded bg-stone-200" />
            <div className="h-10 w-full rounded bg-stone-100" />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-14 rounded bg-stone-200" />
            <div className="h-10 w-full rounded bg-stone-100" />
          </div>
        </div>
        {/* Submit button */}
        <div className="h-9 w-28 rounded bg-stone-300" />
      </div>
      <div className="mt-8 border-t border-stone-200 pt-6">
        <div className="h-4 w-32 rounded bg-stone-100" />
      </div>
    </div>
  );
}
