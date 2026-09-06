"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/actions/errors";

// Catches failures in the root layout itself, where app/error.tsx can't help because the
// layout that would host it is the thing that broke. Has to render its own <html>/<body>.
export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          background: "#f6ecc9",
          color: "#2b2a1f",
          padding: "3rem 1.5rem",
        }}
      >
        <div style={{ maxWidth: "36rem", margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: ".5rem" }}>
            Graze hit an unexpected error
          </h1>
          <p style={{ fontSize: ".9rem", marginBottom: "1.25rem" }}>
            It&apos;s been logged automatically.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: ".5rem 1rem",
              borderRadius: ".375rem",
              background: "#556e35",
              color: "#fff",
              border: 0,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
