import Link from "next/link";
import { requireAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { normalizeTitle } from "@/lib/combine/utils";
import MergePostsButton from "@/components/MergePostsButton";
import AdminNav from "@/components/AdminNav";
import EmptyState from "@/components/EmptyState";
import { PAGE_HEADER } from "@/lib/surfaces";

export default async function AdminDuplicatesPage() {
  await requireAdminUser();

  const posts = await prisma.post.findMany({
    where: { status: { not: "REJECTED" } },
    select: {
      id: true,
      title: true,
      doi: true,
      field: true,
      source: true,
      sourceName: true,
      createdAt: true,
      _count: { select: { comments: true, votes: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, typeof posts>();
  for (const post of posts) {
    const key = normalizeTitle(post.title);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(post);
    groups.set(key, list);
  }
  const duplicateGroups = [...groups.values()].filter((g) => g.length > 1);

  return (
    <div className="max-w-3xl mx-auto">
      <div className={`${PAGE_HEADER} mb-8`}>
        <h1 className="font-heading text-2xl font-semibold mb-1">Possible duplicate research</h1>
        <p className="text-sm text-fg-muted">
          These share an exact normalized title — usually a preprint and its published version
          that slipped past the automatic check, or a straight re-submission. Pick which one to
          keep; the other&apos;s votes and comments move over to it, and it&apos;s removed.
        </p>
      </div>

      {duplicateGroups.length === 0 ? (
        <EmptyState>No title collisions right now.</EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {duplicateGroups.map((group) => (
            <div
              key={group[0].id}
              className="bg-panel/95 border border-border-strong rounded-lg p-4 shadow-sm"
            >
              <h2 className="font-heading text-base font-semibold mb-3">{group[0].title}</h2>
              <div className="flex flex-col gap-2">
                {group.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between gap-3 flex-wrap bg-panel-2 border border-border rounded-md px-3 py-2"
                  >
                    <div className="text-xs text-fg-muted font-mono">
                      <Link href={`/post/${post.id}`} className="text-fg hover:text-moss">
                        {post.id}
                      </Link>{" "}
                      · {post.source === "COMBINE" ? `via ${post.sourceName}` : "user-submitted"} ·{" "}
                      {post.doi ? `DOI: ${post.doi}` : "no DOI"} · {post.field ?? "no venue"} ·{" "}
                      {post._count.votes} votes, {post._count.comments} comments
                    </div>
                    <MergePostsButton
                      keepPostId={post.id}
                      otherPostIds={group.filter((p) => p.id !== post.id).map((p) => p.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminNav />
    </div>
  );
}
