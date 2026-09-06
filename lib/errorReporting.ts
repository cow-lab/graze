// Lightweight, provider-agnostic error capture.
//
// The goal is that server and client errors land somewhere visible automatically instead
// of being found by accident. That's achieved with a structured log line plus an in-memory
// ring buffer surfaced at /admin/errors — useful with zero configuration.
//
// A hosted service (Sentry or otherwise) is opt-in: set ERROR_WEBHOOK_URL and every
// captured error is POSTed there as JSON. Deliberately not the Sentry SDK by default —
// without a DSN it ships a sizeable client bundle that does nothing, which works against
// the low-bandwidth mode elsewhere in this app.

export type CapturedError = {
  id: string;
  message: string;
  stack: string | null;
  source: "server" | "client";
  path: string | null;
  digest: string | null;
  at: string;
};

const MAX_RETAINED = 100;

// Held on globalThis rather than in module scope. Next.js evaluates instrumentation.ts and
// page renders in separate module graphs, so a plain module-level array gives the writer
// and the reader two different copies — errors get captured but /admin/errors shows none.
// Same singleton trick as lib/prisma.ts.
const globalForErrors = globalThis as unknown as { grazeErrors?: CapturedError[] };
const recent: CapturedError[] = (globalForErrors.grazeErrors ??= []);

export function captureError(input: {
  error: unknown;
  source: "server" | "client";
  path?: string | null;
  digest?: string | null;
}): CapturedError {
  const err = input.error;
  const entry: CapturedError = {
    id: Math.random().toString(36).slice(2, 10),
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? (err.stack ?? null) : null,
    source: input.source,
    path: input.path ?? null,
    digest: input.digest ?? null,
    at: new Date().toISOString(),
  };

  recent.unshift(entry);
  if (recent.length > MAX_RETAINED) recent.length = MAX_RETAINED;

  console.error(
    `[error:${entry.source}] ${entry.message}` +
      (entry.path ? ` · path=${entry.path}` : "") +
      (entry.digest ? ` · digest=${entry.digest}` : ""),
    entry.stack ?? "",
  );

  const webhook = process.env.ERROR_WEBHOOK_URL;
  if (webhook) {
    // Fire-and-forget: reporting an error must never throw or block the request that
    // produced it.
    void fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(() => {});
  }

  return entry;
}

export function recentErrors(): CapturedError[] {
  return [...recent];
}
