"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportClientError } from "@/lib/actions/errors";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportClientError({
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }, [error]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-panel/95 border border-border-strong rounded-lg p-5 shadow-sm">
        <h1 className="font-heading text-2xl font-semibold mb-1">Something went wrong</h1>
        <p className="text-sm text-fg-muted mb-4">
          This has been logged automatically. You can try again, or head back to the feed.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-md bg-moss text-white text-sm font-medium hover:brightness-110 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-md border border-border-strong text-sm font-medium hover:bg-ink/5 transition"
          >
            Back to feed
          </Link>
        </div>
      </div>
    </div>
  );
}
