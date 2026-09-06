import { prisma } from "@/lib/prisma";
import type { Prisma, VoteValue } from "@prisma/client";

export type PostListItem = Awaited<ReturnType<typeof getFeedPosts>>[number];

const authorSelect = {
  id: true,
  name: true,
  cowNumber: true,
} as const;

const feedInclude = {
  author: { select: authorSelect },
  // Every Field this paper is filed under, not just one — see PostField in the schema.
  fields: {
    select: { board: { select: { slug: true, name: true } } },
    orderBy: { board: { name: "asc" } },
  },
  votes: { select: { value: true, userId: true } },
  // The glossary (so cards can underline known jargon) and the one-line TL;DR, which is the
  // cheapest tier of "Chew on this" and the reason someone scanning a feed stops. Still not
  // the whole explainer row — the summary, findings and quiz load when the panel opens.
  explainer: { select: { termsJson: true, tldr: true } },
  _count: { select: { comments: true } },
} as const;

// Three orderings a person reading research would actually ask for. The time-decayed
// "hot" score this replaces was built for a social engagement feed that no longer exists:
// it ranked papers by how fast they were collecting votes, which says nothing about
// whether a paper is worth reading.
export type SortOption = "cited" | "discussed" | "new";

export const DEFAULT_SORT: SortOption = "cited";

export const SORT_LABELS: Record<SortOption, string> = {
  cited: "Most cited",
  discussed: "Most discussed",
  new: "Newest",
};

export function parseSort(value: string | undefined): SortOption {
  return value === "discussed" || value === "new" || value === "cited" ? value : DEFAULT_SORT;
}

// Posts from a SUSPENDED Field are withheld everywhere they'd otherwise be listed —
// suspending spam is pointless if its posts keep surfacing in the feed and library.
// ARCHIVED is deliberately not included: retiring a Field closes it to new posts but
// leaves everything already in it readable.
//
// Now that a paper can sit in several Fields, "visible" means at least one of them isn't
// suspended. Suspending a Field shouldn't disappear a paper that also belongs somewhere
// legitimate — only a paper whose every Field has been suspended drops out.
const VISIBLE_IN_SOME_FIELD = {
  fields: { some: { board: { status: { not: "SUSPENDED" } } } },
} as const;

// Typed explicitly: returning a bare union of two object shapes made every `where` that
// spreads it a union too, and Prisma's inferred result type came apart downstream.
function inField(boardSlug: string | undefined): Prisma.PostWhereInput {
  return boardSlug
    ? { fields: { some: { board: { slug: boardSlug, status: { not: "SUSPENDED" } } } } }
    : VISIBLE_IN_SOME_FIELD;
}

function withScore<T extends { votes: { value: VoteValue; userId: string }[] }>(
  post: T,
  viewerId?: string,
) {
  const score = post.votes.reduce((acc, v) => acc + (v.value === "UP" ? 1 : -1), 0);
  const userVote = viewerId ? post.votes.find((v) => v.userId === viewerId)?.value ?? null : null;
  return { ...post, score, userVote };
}

// Rows arrive newest-first from the database, so recency is the tie-break for free and
// "Newest" needs no work at all. A paper with no citation count yet (user-submitted, never
// cross-referenced) sorts below every paper that has one rather than above them as a 0
// would elsewhere — unknown isn't zero.
function applySort<T extends { citationCount: number | null; _count: { comments: number }; createdAt: Date }>(
  posts: T[],
  sort: SortOption,
): T[] {
  if (sort === "new") return posts;

  if (sort === "discussed") {
    return [...posts].sort(
      (a, b) => b._count.comments - a._count.comments || b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  return [...posts].sort(
    (a, b) => (b.citationCount ?? -1) - (a.citationCount ?? -1) || b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export async function getFeedPosts(params: {
  boardSlug?: string;
  sort?: SortOption;
  viewerId?: string;
}) {
  const posts = await prisma.post.findMany({
    where: {
      ...inField(params.boardSlug),
      status: "PUBLISHED",
    },
    include: feedInclude,
    orderBy: { createdAt: "desc" },
  });

  const withScores = posts.map((p) => withScore(p, params.viewerId));
  return applySort(withScores, params.sort ?? DEFAULT_SORT);
}

export async function getResearchPosts(params: {
  search?: string;
  field?: string;
  sort?: SortOption;
  viewerId?: string;
}) {
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      ...VISIBLE_IN_SOME_FIELD,
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
    orderBy: { createdAt: "desc" },
  });

  const withScores = posts.map((p) => withScore(p, params.viewerId));
  return applySort(withScores, params.sort ?? DEFAULT_SORT);
}

export async function getPostDetail(id: string, viewerId?: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: authorSelect },
      fields: {
        select: { board: { select: { slug: true, name: true } } },
        orderBy: { board: { name: "asc" } },
      },
      votes: { select: { value: true, userId: true } },
      explainer: true,
      _count: { select: { comments: true } },
    },
  });
  if (!post || post.status !== "PUBLISHED") return null;
  return withScore(post, viewerId);
}

// Fields you can post into — used for the Field picker on /submit and /search. Archived
// and suspended Fields are both excluded: an archived Field is readable but closed to new
// contributions, which is the whole point of retiring one.
export async function getBoardsWithCounts() {
  const boards = await prisma.board.findMany({
    where: { status: { in: ["ACTIVE", "PROVISIONAL"] } },
    include: { _count: { select: { posts: { where: { post: { status: "PUBLISHED" } } } } } },
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
    include: { _count: { select: { posts: { where: { post: { status: "PUBLISHED" } } } } } },
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
