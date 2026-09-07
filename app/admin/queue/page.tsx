import { requireAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import RunCombineButton from "@/components/RunCombineButton";
import CheckRetractionsButton from "@/components/CheckRetractionsButton";
import QueueActions from "@/components/QueueActions";
import AdminNav from "@/components/AdminNav";
import EmptyState from "@/components/EmptyState";
import { PAGE_HEADER } from "@/lib/surfaces";

export default async function AdminQueuePage() {
  await requireAdminUser();

  const pending = await prisma.post.findMany({
    where: { status: "PENDING", source: "COMBINE" },
    include: {
      fields: { select: { board: { select: { slug: true, name: true } } } },
      explainer: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className={`${PAGE_HEADER} mb-6`}>
        <h1 className="font-heading text-2xl font-semibold mb-1">Moderation queue</h1>
        <p className="text-sm text-fg-muted mb-4">
          Research that passes every check — peer-reviewed work type, DOAJ-listed journal, no
          retraction on record, no outlying retraction history behind the journal — publishes
          straight to the library. This queue holds the rest: papers a person picked from live
          search whose journal isn&apos;t listed, preprints someone wants in anyway, and the
          cases where two sources disagree. Those last ones are deliberately not resolved
          automatically.
        </p>
        <div className="flex flex-col gap-4 items-start">
          <RunCombineButton />
          <CheckRetractionsButton />
        </div>
      </div>

      {pending.length === 0 ? (
        <EmptyState>Nothing pending review right now.</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((post) => (
            <div
              key={post.id}
              className="bg-panel/95 border border-border-strong rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h3 className="font-heading text-base font-semibold">{post.title}</h3>
                  <p className="text-sm text-fg-muted mt-0.5">
                    {post.authors} · {post.field} · {post.year} ·{" "}
                    {post.fields.map((f) => `F~${f.board.slug}`).join(" ") || "no Field"}
                  </p>
                </div>
                <QueueActions postId={post.id} />
              </div>

              {/* Why this one is waiting on a person. The checks never resolve a
                  disagreement between sources themselves — this is the sentence they
                  leave behind when they hand it over. */}
              {post.reviewReason && (
                <p className="mt-3 rounded-md border border-sun/50 bg-sun/10 px-3 py-2 text-sm text-ink">
                  <span className="font-mono text-[10px] uppercase tracking-wide text-fg-muted">
                    Why it&apos;s here
                  </span>
                  <br />
                  {post.reviewReason}
                </p>
              )}

              <p className="text-sm mt-3 leading-relaxed">{post.abstract}</p>

              <div className="flex items-center gap-3 mt-3 font-mono text-[11px] text-fg-muted flex-wrap">
                <span>Source: {post.sourceName}</span>
                {post.doi && <span>DOI: {post.doi}</span>}
                {post.externalUrl && (
                  <a
                    href={post.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-moss hover:underline"
                  >
                    View original ↗
                  </a>
                )}
              </div>

              {post.explainer && (
                <details className="mt-3 text-xs text-fg-muted">
                  <summary className="cursor-pointer hover:text-ink transition-colors">
                    Preview generated explainer
                  </summary>
                  <p className="mt-2 leading-relaxed">{post.explainer.summary}</p>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      <AdminNav />
    </div>
  );
}
