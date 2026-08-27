import Link from "next/link";
import { Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PROMOTION_DISTINCT_AUTHOR_THRESHOLD } from "@/lib/fieldConstants";
import { PromoteFieldButton, SuspendFieldButton, DismissReportsButton } from "@/components/FieldAdminActions";

export default async function AdminFieldsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== "ADMIN") redirect("/");

  const [reportedBoards, provisionalBoards] = await Promise.all([
    prisma.board.findMany({
      where: { reports: { some: {} } },
      include: {
        reports: { include: { reporter: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.board.findMany({
      where: { status: "PROVISIONAL" },
      include: { posts: { where: { status: "PUBLISHED" }, select: { authorId: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-heading text-2xl font-semibold mb-1">Field administration</h1>
      <p className="text-sm text-fg-muted mb-8">
        Fields don&apos;t need approval to be created — the real spam defense is that a
        Field only reaches the main sidebar once posts from{" "}
        {PROMOTION_DISTINCT_AUTHOR_THRESHOLD} distinct people land in it. This page is just
        the backstop: reports, and a manual override if you want to skip ahead.
      </p>

      <section className="mb-10">
        <h2 className="font-heading text-base font-semibold mb-3">
          Reported Fields {reportedBoards.length > 0 && `(${reportedBoards.length})`}
        </h2>
        {reportedBoards.length === 0 ? (
          <p className="text-sm text-fg-muted">Nothing reported right now.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {reportedBoards.map((board) => (
              <div
                key={board.id}
                className="bg-panel/95 border border-border-strong rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-heading text-base font-semibold">
                      F~{board.slug}{" "}
                      <span className="font-mono text-[10px] uppercase text-fg-muted">
                        {board.status}
                      </span>
                    </h3>
                    <p className="text-sm text-fg-muted mt-0.5">{board.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {board.status !== "SUSPENDED" && <SuspendFieldButton boardId={board.id} />}
                    <DismissReportsButton boardId={board.id} />
                  </div>
                </div>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {board.reports.map((r) => (
                    <li key={r.id} className="text-xs text-fg-muted">
                      <span className="text-ink">{r.reporter.name}</span>: {r.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-heading text-base font-semibold mb-3">
          Provisional Fields {provisionalBoards.length > 0 && `(${provisionalBoards.length})`}
        </h2>
        {provisionalBoards.length === 0 ? (
          <p className="text-sm text-fg-muted">None right now.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {provisionalBoards.map((board) => {
              const distinctPosters = new Set(board.posts.map((p) => p.authorId)).size;
              return (
                <div
                  key={board.id}
                  className="bg-panel/95 border border-border-strong rounded-lg p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-heading text-base font-semibold flex items-center gap-1.5">
                        F~{board.slug}
                        {board.isAiSuggested && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-teal/30 bg-teal/15 text-teal font-mono text-[10px] uppercase tracking-wide">
                            <Sparkles size={10} /> Combine-suggested
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-fg-muted mt-0.5">{board.description}</p>
                      <p className="text-xs text-fg-muted mt-1 font-mono">
                        {distinctPosters}/{PROMOTION_DISTINCT_AUTHOR_THRESHOLD} distinct posters
                      </p>
                    </div>
                    <PromoteFieldButton boardId={board.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-xs text-fg-muted mt-8">
        <Link href="/admin/queue" className="text-moss hover:underline">
          Moderation queue
        </Link>{" "}
        ·{" "}
        <Link href="/admin/duplicates" className="text-moss hover:underline">
          Possible duplicates
        </Link>{" "}
        ·{" "}
        <Link href="/" className="text-moss hover:underline">
          Back to feed
        </Link>
      </p>
    </div>
  );
}
