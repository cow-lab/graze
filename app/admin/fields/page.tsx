import { Sparkles } from "lucide-react";
import { requireAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PROMOTION_DISTINCT_AUTHOR_THRESHOLD } from "@/lib/fieldConstants";
import {
  PromoteFieldButton,
  SuspendFieldButton,
  ArchiveFieldButton,
  RestoreFieldButton,
  DismissReportsButton,
} from "@/components/FieldAdminActions";
import AdminNav from "@/components/AdminNav";
import SectionHeading from "@/components/SectionHeading";
import EmptyState from "@/components/EmptyState";
import { PAGE_HEADER } from "@/lib/surfaces";

export default async function AdminFieldsPage() {
  await requireAdminUser();

  const withPostCount = {
    _count: { select: { posts: { where: { post: { status: "PUBLISHED" as const } } } } },
  };

  const [reportedBoards, provisionalBoards, activeBoards, archivedBoards, suspendedBoards] =
    await Promise.all([
      prisma.board.findMany({
        where: { reports: { some: {} } },
        include: {
          reports: {
            include: { reporter: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.board.findMany({
        where: { status: "PROVISIONAL" },
        include: {
          posts: {
            where: { post: { status: "PUBLISHED" } },
            select: { post: { select: { authorId: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Listed so there's something to archive — active Fields previously never appeared
      // here at all, which left no way to retire one from the UI.
      prisma.board.findMany({
        where: { status: "ACTIVE" },
        include: withPostCount,
        orderBy: { name: "asc" },
      }),
      prisma.board.findMany({
        where: { status: "ARCHIVED" },
        include: withPostCount,
        orderBy: { name: "asc" },
      }),
      // Listed unconditionally, not just while reports exist. Suspended Fields are hidden
      // from the sidebar, the Field picker and The Combine, so without their own section a
      // suspension became a dead end the moment its reports were dismissed.
      prisma.board.findMany({
        where: { status: "SUSPENDED" },
        include: withPostCount,
        orderBy: { name: "asc" },
      }),
    ]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className={`${PAGE_HEADER} mb-8`}>
        <h1 className="font-heading text-2xl font-semibold mb-1">Field administration</h1>
        <p className="text-sm text-fg-muted">
          Fields don&apos;t need approval to be created — the real spam defense is that a
          Field only reaches the main sidebar once posts from{" "}
          {PROMOTION_DISTINCT_AUTHOR_THRESHOLD} distinct people land in it. This page is just
          the backstop: reports, and a manual override if you want to skip ahead.
        </p>
      </div>

      <section className="mb-10">
        <SectionHeading
          title={`Reported Fields${reportedBoards.length > 0 ? ` (${reportedBoards.length})` : ""}`}
        />
        {reportedBoards.length === 0 ? (
          <EmptyState>Nothing reported right now.</EmptyState>
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
                    {board.status === "SUSPENDED" ? (
                      <RestoreFieldButton boardId={board.id} />
                    ) : (
                      <SuspendFieldButton boardId={board.id} />
                    )}
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
        <SectionHeading
          title={`Provisional Fields${provisionalBoards.length > 0 ? ` (${provisionalBoards.length})` : ""}`}
        />
        {provisionalBoards.length === 0 ? (
          <EmptyState>None right now.</EmptyState>
        ) : (
          <div className="flex flex-col gap-3">
            {provisionalBoards.map((board) => {
              const distinctPosters = new Set(board.posts.map((p) => p.post.authorId)).size;
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
                            <Sparkles size={10} aria-hidden="true" /> Combine-suggested
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-fg-muted mt-0.5">{board.description}</p>
                      <p className="text-xs text-fg-muted mt-1 font-mono">
                        {distinctPosters}/{PROMOTION_DISTINCT_AUTHOR_THRESHOLD} distinct posters
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <PromoteFieldButton boardId={board.id} />
                      <ArchiveFieldButton boardId={board.id} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionHeading
          title={`Active Fields${activeBoards.length > 0 ? ` (${activeBoards.length})` : ""}`}
          description="Live in the sidebar and open to new posts. Archive one to retire it in good standing; suspend one only as a moderation action."
        />
        {activeBoards.length === 0 ? (
          <EmptyState>No active Fields yet.</EmptyState>
        ) : (
          <div className="flex flex-col gap-3">
            {activeBoards.map((board) => (
              <div
                key={board.id}
                className="bg-panel/95 border border-border-strong rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-heading text-base font-semibold">F~{board.slug}</h3>
                    <p className="text-sm text-fg-muted mt-0.5">{board.description}</p>
                    <p className="text-xs text-fg-muted mt-1 font-mono">
                      {board._count.posts} published post{board._count.posts === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArchiveFieldButton boardId={board.id} />
                    <SuspendFieldButton boardId={board.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionHeading
          title={`Archived Fields${archivedBoards.length > 0 ? ` (${archivedBoards.length})` : ""}`}
          description="Retired, but not hidden — existing posts stay readable and keep appearing in the feed. They're out of the sidebar and the Field picker, and The Combine no longer feeds them."
        />
        {archivedBoards.length === 0 ? (
          <EmptyState>Nothing archived right now.</EmptyState>
        ) : (
          <div className="flex flex-col gap-3">
            {archivedBoards.map((board) => (
              <div
                key={board.id}
                className="bg-panel/95 border border-border-strong rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-heading text-base font-semibold">F~{board.slug}</h3>
                    <p className="text-sm text-fg-muted mt-0.5">{board.description}</p>
                    <p className="text-xs text-fg-muted mt-1 font-mono">
                      {board._count.posts} published post{board._count.posts === 1 ? "" : "s"}
                    </p>
                  </div>
                  <RestoreFieldButton boardId={board.id} label="Unarchive" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionHeading
          title={`Suspended Fields${suspendedBoards.length > 0 ? ` (${suspendedBoards.length})` : ""}`}
          description="Hidden from the sidebar, the Field picker and The Combine. Restoring one sends it back through the traction gate — it returns to the main list straight away if it already has enough distinct posters."
        />
        {suspendedBoards.length === 0 ? (
          <EmptyState>Nothing suspended right now.</EmptyState>
        ) : (
          <div className="flex flex-col gap-3">
            {suspendedBoards.map((board) => (
              <div
                key={board.id}
                className="bg-panel/95 border border-border-strong rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-heading text-base font-semibold">F~{board.slug}</h3>
                    <p className="text-sm text-fg-muted mt-0.5">{board.description}</p>
                    <p className="text-xs text-fg-muted mt-1 font-mono">
                      {board._count.posts} published post{board._count.posts === 1 ? "" : "s"}
                    </p>
                  </div>
                  <RestoreFieldButton boardId={board.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <AdminNav />
    </div>
  );
}
