export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-6 py-12">
      <div className="flex items-center justify-between">
        <div className="h-8 w-44 rounded bg-stone-200" />
        <div className="h-9 w-44 rounded bg-stone-200" />
      </div>
      <div className="mt-8 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white shadow-sm">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-4 w-48 rounded bg-stone-200" />
              <div className="h-3 w-64 rounded bg-stone-100" />
            </div>
            <div className="h-5 w-14 shrink-0 rounded bg-stone-100" />
            <div className="h-3 w-8 shrink-0 rounded bg-stone-100" />
            <div className="h-3 w-12 shrink-0 rounded bg-stone-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
