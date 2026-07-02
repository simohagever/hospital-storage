export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse p-6">
      <div className="h-7 w-56 rounded bg-stone-200" />
      <div className="mt-1 h-4 w-72 rounded bg-stone-100" />
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-lg border border-stone-200 p-4">
            <div className="h-5 w-12 rounded bg-stone-200" />
            <div className="mt-4 space-y-3">
              <div className="h-9 w-full rounded bg-stone-100" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-9 rounded bg-stone-100" />
                <div className="h-9 rounded bg-stone-100" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-stone-200 p-4">
            <div className="h-5 w-28 rounded bg-stone-200" />
            <div className="mt-3 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 rounded border border-stone-100 bg-stone-50" />
              ))}
            </div>
          </div>
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
