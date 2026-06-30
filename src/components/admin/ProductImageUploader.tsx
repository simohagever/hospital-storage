"use client";

import { useRef, useState } from "react";
import Image from "next/image";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — mirrors the server-side limit

interface ProductImageUploaderProps {
  productId: string;
  imageId: string | null;
  currentImageUrl: string | null;
  onUploaded: (url: string) => void;
  onDeleted: () => void;
}

export function ProductImageUploader({
  productId,
  imageId,
  currentImageUrl,
  onUploaded,
  onDeleted,
}: ProductImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl);
  const [currentImageId, setCurrentImageId] = useState<string | null>(imageId);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError(`File must be smaller than ${MAX_BYTES / 1024 / 1024}MB`);
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/products/${productId}/image`, {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Upload failed");
        return;
      }
      setPreview(json.url);
      setCurrentImageId(json.id ?? null);
      onUploaded(json.url);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!currentImageId || !confirm("Remove this photo?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/image`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: currentImageId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Delete failed");
        return;
      }
      setPreview(null);
      setCurrentImageId(null);
      onDeleted();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-zinc-700">Product photo</p>

      {preview ? (
        <div className="relative h-40 w-40 overflow-hidden rounded border border-zinc-200">
          <Image src={preview} alt="Product photo" fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="flex h-40 w-40 items-center justify-center rounded border border-dashed border-zinc-300 text-sm text-zinc-400">
          No photo
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          {busy ? "Uploading…" : preview ? "Replace photo" : "Upload photo"}
        </button>
        {preview && (
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            Remove
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-zinc-400">JPEG, PNG, WebP or GIF · max 5 MB</p>
    </div>
  );
}
