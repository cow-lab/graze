import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PostCard from "@/components/PostCard";
import CowAvatar from "@/components/CowAvatar";
import SectionHeading from "@/components/SectionHeading";
import EmptyState from "@/components/EmptyState";
import { type PostListItem } from "@/lib/posts";
import { getBoardedPostIds } from "@/lib/board";
import { PAGE_HEADER } from "@/lib/surfaces";

const authorSelect = {
  id: true,
  name: true,
  cowNumber: true,
} as const;

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const isOwnProfile = session?.user?.id === id;

  // This page is private now — reputation and post history were visible to anyone who
  // clicked a name, which was more public surface than the project needs. Only the
  // account owner can view it; everyone else gets the same not-found page a nonexistent
  // id would produce, so this also doesn't confirm or deny that a given user id exists.
  if (!isOwnProfile) notFound();

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      // All PUBLISHED posts (for reputation math — a private number, safe to include
      // anonymous ones since nothing here is displayed per-post).
      posts: {
        where: { status: "PUBLISHED" },
        include: {
          author: { select: authorSelect },
          fields: {
            select: { board: { select: { slug: true, name: true } } },
            orderBy: { board: { name: "asc" } },
          },
          votes: { select: { value: true, userId: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      comments: { include: { votes: { select: { value: true } } } },
    },
  });

  if (!user) notFound();

  const postScore = (p: (typeof user.posts)[number]) =>
    p.votes.reduce((acc, v) => acc + (v.value === "UP" ? 1 : -1), 0);
  const commentScore = (c: (typeof user.comments)[number]) =>
    c.votes.reduce((acc, v) => acc + (v.value === "UP" ? 1 : -1), 0);

  // The public post list must never include anonymous posts — showing them here, under
  // the poster's real profile, would directly defeat the point of posting anonymously.
  const publicPosts = user.posts.filter((p) => !p.isAnonymous);
  const anonymousPosts = user.posts.filter((p) => p.isAnonymous);

  const postsWithScore = publicPosts.map((p) => ({
    ...p,
    score: postScore(p),
    userVote: session?.user?.id
      ? (p.votes.find((v) => v.userId === session.user!.id)?.value ?? null)
      : null,
  })) as unknown as PostListItem[];

  const reputation =
    user.posts.reduce((acc, p) => acc + postScore(p), 0) +
    user.comments.reduce((acc, c) => acc + commentScore(c), 0);

  // Replaces the old "upvotes received", which was the gross half of the reputation number
  // beside it — two vote counts saying nearly the same thing, on a page only its owner can
  // see. A popularity score with no audience measures nothing.
  //
  // This counts distinct papers where you followed the link to the actual source, which is
  // the one thing Graze exists to cause. PaperEngagement is unique per (user, paper, kind),
  // so a row count is a count of papers rather than of clicks.
  const sourcesOpened = await prisma.paperEngagement.count({
    where: { userId: id, kind: "SOURCE_CLICK" },
  });

  const boardedIds = await getBoardedPostIds(session?.user?.id, postsWithScore.map((p) => p.id));

  return (
    <div className="max-w-3xl mx-auto">
      <div className={`${PAGE_HEADER} mb-6`}>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-heading text-2xl font-semibold">{user.name}</h1>
        </div>
        <p className="mt-1 text-xs text-fg-muted">Only visible to you.</p>
        <div className="flex items-center gap-6 mt-3 font-mono text-xs text-fg-muted">
          <span>
            <span className="text-fg text-sm font-medium">{reputation}</span> reputation
          </span>
          <span>
            <span className="text-fg text-sm font-medium">{sourcesOpened}</span>{" "}
            {sourcesOpened === 1 ? "source opened" : "sources opened"}
          </span>
          <span>
            <span className="text-fg text-sm font-medium">{publicPosts.length}</span>{" "}
            {publicPosts.length === 1 ? "paper" : "papers"}
          </span>
        </div>

      </div>

      <SectionHeading title="Papers" />
      {postsWithScore.length === 0 ? (
        <EmptyState>No papers submitted yet.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {postsWithScore.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isLoggedIn={!!session?.user}
              isOnBoard={boardedIds.has(post.id)}
            />
          ))}
        </div>
      )}

      {isOwnProfile && anonymousPosts.length > 0 && (
        <div className="mt-8">
          <SectionHeading
            title={
              <>
                <CowAvatar size={16} /> Your anonymous papers
              </>
            }
            description={
              <>
                Only visible to you here — these show publicly as &ldquo;Cow #{user.cowNumber}
                &rdquo;, never linked to this profile.
              </>
            }
          />
          <div className="flex flex-col gap-2">
            {anonymousPosts.map((p) => (
              <a
                key={p.id}
                href={`/post/${p.id}`}
                className="block bg-panel-2 border border-border rounded-lg px-3 py-2 text-sm hover:border-moss/50 transition-colors"
              >
                {p.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
