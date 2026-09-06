import { requireAdminUser } from "@/lib/session";
import { recentErrors } from "@/lib/errorReporting";
import { metricSnapshot } from "@/lib/metrics";
import AdminNav from "@/components/AdminNav";
import SectionHeading from "@/components/SectionHeading";
import EmptyState from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function AdminErrorsPage() {
  await requireAdminUser();
  const errors = recentErrors();
  const snapshot = metricSnapshot();
  const metrics = Object.entries(snapshot).sort(([a], [b]) => a.localeCompare(b));
  // The two numbers the product is actually judged on, pulled out of the alphabetical
  // list: did someone go to the real paper, and did they go after reading the summary.
  const clickthroughs = snapshot["source.clickthrough"] ?? 0;
  const afterChew = snapshot["source.clickthrough_after_chew"] ?? 0;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-panel/95 border border-border-strong rounded-lg p-5 shadow-sm mb-8">
        <h1 className="font-heading text-2xl font-semibold mb-1">Errors &amp; usage</h1>
        <p className="text-sm text-fg-muted">
          Server and client errors are captured automatically rather than needing to be
          reproduced by hand. Both lists are in-memory and reset when the server restarts —
          set <code className="font-mono text-xs">ERROR_WEBHOOK_URL</code> to forward errors
          somewhere durable.
        </p>
      </div>

      <section className="mb-10">
        <SectionHeading title={`Recent errors${errors.length ? ` (${errors.length})` : ""}`} />
        {errors.length === 0 ? (
          <EmptyState>No errors captured since the last restart.</EmptyState>
        ) : (
          <div className="flex flex-col gap-3">
            {errors.map((e) => (
              <div
                key={e.id}
                className="bg-panel/95 border border-border-strong rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded border font-mono text-[10px] uppercase tracking-wide ${
                      e.source === "server"
                        ? "border-rose/30 bg-rose/10 text-rose"
                        : "border-teal/30 bg-teal/10 text-teal"
                    }`}
                  >
                    {e.source}
                  </span>
                  {e.path && (
                    <span className="font-mono text-[11px] text-fg-muted">{e.path}</span>
                  )}
                  <span className="font-mono text-[11px] text-fg-muted">{e.at}</span>
                </div>
                <p className="text-sm font-medium">{e.message}</p>
                {e.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-fg-muted hover:text-ink">
                      Stack trace
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded bg-panel-2 p-2 text-[11px] leading-relaxed">
                      {e.stack}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <SectionHeading
          title="Click-through to the source"
          description="The measure that matters: whether any of this got someone to the actual paper. Engagement volume — votes, cards, notifications — is not the goal and is not reported as one."
        />
        <div className="bg-panel/95 border border-border-strong rounded-lg p-4 shadow-sm flex flex-wrap gap-8">
          <div>
            <p className="font-heading text-3xl font-semibold tabular-nums">{clickthroughs}</p>
            <p className="font-mono text-[11px] uppercase tracking-wide text-fg-muted mt-0.5">
              source click-throughs
            </p>
          </div>
          <div>
            <p className="font-heading text-3xl font-semibold tabular-nums text-moss">{afterChew}</p>
            <p className="font-mono text-[11px] uppercase tracking-wide text-fg-muted mt-0.5">
              after reading a &ldquo;Chew on this&rdquo; summary
            </p>
          </div>
          <div>
            <p className="font-heading text-3xl font-semibold tabular-nums">
              {clickthroughs > 0 ? `${Math.round((afterChew / clickthroughs) * 100)}%` : "—"}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-wide text-fg-muted mt-0.5">
              of click-throughs came via a summary
            </p>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading
          title="Feature usage"
          description="Everything else that's counted, in memory, since the last restart — accessibility features, board activity, and search."
        />
        {metrics.length === 0 ? (
          <EmptyState>Nothing recorded since the last restart.</EmptyState>
        ) : (
          <div className="bg-panel/95 border border-border-strong rounded-lg p-4 shadow-sm">
            <dl className="flex flex-col gap-1.5">
              {metrics.map(([name, count]) => (
                <div key={name} className="flex items-baseline justify-between gap-4">
                  <dt className="font-mono text-xs text-fg-muted">{name}</dt>
                  <dd className="font-mono text-sm tabular-nums">{count}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>

      <AdminNav />
    </div>
  );
}
