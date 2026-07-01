"use client";

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="rounded border border-red-300 bg-red-50 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-red-700">Something went wrong loading this page.</h2>
        {process.env.NODE_ENV !== "production" && (
          <p className="mt-1 font-mono text-sm text-red-600">{error.message}</p>
        )}
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-4 rounded bg-zinc-900 px-4 py-2 text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
