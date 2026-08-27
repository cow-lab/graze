import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RunCombineButton from "@/components/RunCombineButton";
import CheckRetractionsButton from "@/components/CheckRetractionsButton";
import QueueActions from "@/components/QueueActions";

export default async function AdminQueuePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== "ADMIN") redirect("/");

  const pending = await prisma.post.findMany({
    where: { status: "PENDING", source: "COMBINE" },
    include: { board: { select: { slug: true } }, explainer: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-heading text-2xl font-semibold mb-1">Moderation queue</h1>
      <p className="text-sm text-fg-muted mb-6">
        Research that passes The Combine&apos;s checks (DOAJ/allowlist-verified journal, not a
        duplicate, has a real abstract) now publishes straight to the library — nothing normally
        lands here. This queue only holds anything a future check flags for manual review.
      </p>

      <div className="mb-6 flex flex-col gap-4 items-start">
        <RunCombineButton />
        <CheckRetractionsButton />
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-fg-muted">Nothing pending review right now.</p>
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
                    {post.authors} · {post.field} · {post.year} · F~{post.board.slug}
                  </p>
                </div>
                <QueueActions postId={post.id} />
              </div>

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

      <p className="text-xs text-fg-muted mt-8">
        <Link href="/admin/duplicates" className="text-moss hover:underline">
          Possible duplicates
        </Link>{" "}
        ·{" "}
        <Link href="/admin/fields" className="text-moss hover:underline">
          Field administration
        </Link>{" "}
        ·{" "}
        <Link href="/" className="text-moss hover:underline">
          Back to feed
        </Link>
      </p>
    </div>
  );
}
