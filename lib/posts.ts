import { prisma } from "@/lib/prisma";
import type { PostType, VoteValue } from "@prisma/client";

export type PostListItem = Awaited<ReturnType<typeof getFeedPosts>>[number];

// Verification now lives on affiliations, not the account — an author "has a verified
// affiliation" if at least one of their listed affiliations passed the domain check.
const authorSelect = {
  id: true,
  name: true,
  cowNumber: true,
  _count: { select: { affiliations: { where: { verified: true } } } },
} as const;

const feedInclude = {
  author: { select: authorSelect },
  board: { select: { slug: true, name: true } },
  votes: { select: { value: true, userId: true } },
  _count: { select: { comments: true, referencingPosts: true } },
} as const;

export type SortOption = "hot" | "new" | "top";

function withScore<T extends { votes: { value: VoteValue; userId: string }[] }>(
  post: T,
  viewerId?: string,
) {
  const score = post.votes.reduce((acc, v) => acc + (v.value === "UP" ? 1 : -1), 0);
  const userVote = viewerId ? post.votes.find((v) => v.userId === viewerId)?.value ?? null : null;
  return { ...post, score, userVote };
}

// Reddit/HN-style time-decayed ranking: raw vote count alone goes stale immediately and
// never surfaces new content, so this is the default landing sort everywhere ("Top" — pure
// all-time votes — and "New" — pure recency — stay as explicit, separate options).
// Gravity 1.8 is within the standard 1.5-1.8 range; the +2 keeps a brand-new post's score
// finite instead of dividing by a near-zero age.
const HOT_GRAVITY = 1.8;

function hotScore(score: number, createdAt: Date): number {
  const hoursSincePost = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  return score / Math.pow(hoursSincePost + 2, HOT_GRAVITY);
}

function applySort<T extends { score: number; createdAt: Date }>(posts: T[], sort: SortOption): T[] {
  if (sort === "new") {
    return posts; // already DB-ordered by createdAt desc
  }
  if (sort === "top") {
    return [...posts].sort((a, b) => b.score - a.score || b.createdAt.getTime() - a.createdAt.getTime());
  }
  return [...posts].sort((a, b) => hotScore(b.score, b.createdAt) - hotScore(a.score, a.createdAt));
}

export async function getFeedPosts(params: {
  boardSlug?: string;
  type?: PostType;
  sort?: SortOption;
  viewerId?: string;
}) {
  const sort = params.sort ?? "hot";
  const posts = await prisma.post.findMany({
    where: {
      board: params.boardSlug ? { slug: params.boardSlug } : undefined,
      type: params.type,
      status: "PUBLISHED",
    },
    include: feedInclude,
    orderBy: sort === "new" ? { createdAt: "desc" } : undefined,
  });

  const withScores = posts.map((p) => withScore(p, params.viewerId));
  return applySort(withScores, sort);
}

export async function getResearchPosts(params: {
  search?: string;
  field?: string;
  sort?: SortOption;
  viewerId?: string;
}) {
  const sort = params.sort ?? "hot";
  const posts = await prisma.post.findMany({
    where: {
      type: "RESEARCH",
      status: "PUBLISHED",
      field: params.field || undefined,
      OR: params.search
        ? [
            { title: { contains: params.search } },
            { authors: { contains: params.search } },
            { field: { contains: params.search } },
            { abstract: { contains: params.search } },
          ]
        : undefined,
    },
    include: feedInclude,
    orderBy: sort === "new" ? { createdAt: "desc" } : undefined,
  });

  const withScores = posts.map((p) => withScore(p, params.viewerId));
  return applySort(withScores, sort);
}

export async function getPostDetail(id: string, viewerId?: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: authorSelect },
      board: { select: { slug: true, name: true } },
      votes: { select: { value: true, userId: true } },
      explainer: true,
      refPost: { select: { id: true, title: true, type: true } },
      referencingPosts: {
        select: {
          id: true,
          title: true,
          createdAt: true,
          isAnonymous: true,
          author: { select: authorSelect },
          votes: { select: { value: true } },
        },
      },
      _count: { select: { comments: true } },
    },
  });
  if (!post || post.status !== "PUBLISHED") return null;
  return withScore(post, viewerId);
}

// All postable Fields (active or still building traction) — used for the Field picker on
// /submit and /search. Suspended Fields are excluded; you can't post into one.
export async function getBoardsWithCounts() {
  const boards = await prisma.board.findMany({
    where: { status: { not: "SUSPENDED" } },
    include: { _count: { select: { posts: { where: { status: "PUBLISHED" } } } } },
    orderBy: { name: "asc" },
  });
  return boards;
}

// Split for the sidebar: ACTIVE Fields get the main list; PROVISIONAL ones (user-created or
// Combine-suggested, not yet at the traction threshold) get their own small "New fields"
// section rather than being promoted into the main list.
export async function getSidebarFields() {
  const boards = await prisma.board.findMany({
    where: { status: { in: ["ACTIVE", "PROVISIONAL"] } },
    include: { _count: { select: { posts: { where: { status: "PUBLISHED" } } } } },
    orderBy: { name: "asc" },
  });
  return {
    active: boards.filter((b) => b.status === "ACTIVE"),
    provisional: boards.filter((b) => b.status === "PROVISIONAL"),
  };
}

export async function getHerdStats() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [inTheHerd, grazingThisMonth] = await Promise.all([
    prisma.user.count(),
    prisma.post.count({ where: { createdAt: { gte: startOfMonth } } }),
  ]);

  return { inTheHerd, grazingThisMonth };
}
