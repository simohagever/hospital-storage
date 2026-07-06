"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteConfigButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/configurations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Failed to delete — please try again.");
        setConfirming(false);
        return;
      }
      setDone(true);
      // If the user is on the detail page for this config, redirect home —
      // refresh() would hit the deleted record and land on a 404.
      if (pathname.includes(id)) {
        router.push("/configurations");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error — please try again.");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <span className="shrink-0 text-xs text-stone-400">Deleted</span>;
  }

  if (confirming) {
    return (
      <span className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-zinc-600">Delete &ldquo;{name}&rdquo;?</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-40"
        >
          {busy ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          type="button"
          onClick={() => { setConfirming(false); setError(null); }}
          disabled={busy}
          className="rounded border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </span>
    );
  }

  return (
    <span className="shrink-0">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-red-500 hover:underline"
      >
        Delete
      </button>
      {error && <span className="ml-2 text-xs text-red-500">{error}</span>}
    </span>
  );
}
