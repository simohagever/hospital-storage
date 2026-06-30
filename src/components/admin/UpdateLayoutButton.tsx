"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function UpdateLayoutButton({ configurationId }: { configurationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Auto-clear the status message after 5 seconds so stale feedback doesn't linger.
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  async function handleUpdate() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/configurations/${configurationId}`, { method: "PATCH" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setMessage({ text: json.error ?? "Update failed — please try again.", ok: false });
        return;
      }
      const json: { fits: boolean } = await res.json();
      setMessage({
        text: json.fits
          ? "Layout updated — all items fit."
          : "Layout updated — some items no longer fit (see warnings below).",
        ok: json.fits,
      });
      router.refresh();
    } catch {
      setMessage({ text: "Network error — please try again.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        onClick={handleUpdate}
        disabled={busy}
        className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
      >
        {busy ? "Updating…" : "Update layout"}
      </button>
      {message && (
        <span className={`text-sm ${message.ok ? "text-green-700" : "text-amber-700"}`}>
          {message.text}
        </span>
      )}
    </span>
  );
}
