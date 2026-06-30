"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteConfigButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/configurations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Failed to delete — please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="shrink-0 text-right">
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="text-sm text-red-500 hover:underline disabled:opacity-40"
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </span>
  );
}
