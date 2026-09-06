import { prisma } from "@/lib/prisma";

// Layout constants shared by the server (where a new card is placed) and the canvas
// component (how wide a card renders). Keeping them in one place is what stops freshly
// added cards from landing on top of each other.
export const CARD_WIDTH = 260;
// Cards are compact because the note on them starts collapsed — the canvas is meant to be
// scannable at a glance, with the writing revealed on click (see BoardCanvas).
export const CARD_HEIGHT = 156;
export const GRID_COLS = 3;
export const GRID_GAP_X = 300;
export const GRID_GAP_Y = 190;
export const GRID_ORIGIN = 40;

export type BoardCard = {
  id: string;
  postId: string | null;
  doi: string | null;
  title: string;
  authors: string | null;
  meta: string;
  /** Where the card's paper actually lives — a Graze post, or straight out to the source. */
  href: string | null;
  /** The original source, for cards that carry one. Click-throughs here are tracked. */
  sourceUrl: string | null;
  note: string;
  x: number;
  y: number;
};

export type BoardLink = {
  id: string;
  fromCardId: string;
  toCardId: string;
  label: string;
};

// Where the next card goes: the first slot in a left-to-right, top-to-bottom grid that
// doesn't land on top of a card already there. Overlap is tested against the cards'
// actual rectangles rather than the slot they started in — by the time you add your fifth
// paper, the first four are wherever you dragged them, and a new card covering one of
// them (notes and all) reads as data loss.
export async function nextCardPosition(userId: string): Promise<{ x: number; y: number }> {
  const cards = await prisma.canvasCard.findMany({
    where: { userId },
    select: { x: true, y: true },
  });

  const overlaps = (x: number, y: number) =>
    cards.some(
      (c) =>
        x < c.x + CARD_WIDTH &&
        x + CARD_WIDTH > c.x &&
        y < c.y + CARD_HEIGHT &&
        y + CARD_HEIGHT > c.y,
    );

  for (let i = 0; i < 500; i++) {
    const x = GRID_ORIGIN + (i % GRID_COLS) * GRID_GAP_X;
    const y = GRID_ORIGIN + Math.floor(i / GRID_COLS) * GRID_GAP_Y;
    if (!overlaps(x, y)) return { x, y };
  }
  // A board this full has no tidy answer; below everything is at least never hidden.
  const lowest = cards.reduce((max, c) => Math.max(max, c.y), 0);
  return { x: GRID_ORIGIN, y: lowest + GRID_GAP_Y };
}

export async function getBoard(userId: string): Promise<{ cards: BoardCard[]; links: BoardLink[] }> {
  const [rows, links] = await Promise.all([
    prisma.canvasCard.findMany({
      where: { userId },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            authors: true,
            field: true,
            year: true,
            doi: true,
            externalUrl: true,
            fileUrl: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.canvasLink.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
  ]);

  const cards: BoardCard[] = rows.map((row) => {
    if (row.post) {
      const sourceUrl =
        row.post.externalUrl ??
        row.post.fileUrl ??
        (row.post.doi ? `https://doi.org/${row.post.doi}` : null);
      return {
        id: row.id,
        postId: row.post.id,
        doi: row.post.doi,
        title: row.post.title,
        authors: row.post.authors,
        meta: [row.post.field, row.post.year].filter(Boolean).join(" · "),
        href: `/post/${row.post.id}`,
        sourceUrl,
        note: row.note,
        x: row.x,
        y: row.y,
      };
    }
    // An external card: the paper was added from live search and never imported, so
    // everything it can show was copied onto the card at save time.
    return {
      id: row.id,
      postId: null,
      doi: row.externalDoi,
      title: row.externalTitle ?? "Untitled",
      authors: row.externalAuthors,
      meta: [row.externalVenue, row.externalYear].filter(Boolean).join(" · "),
      href: row.externalUrl,
      sourceUrl: row.externalUrl ?? (row.externalDoi ? `https://doi.org/${row.externalDoi}` : null),
      note: row.note,
      x: row.x,
      y: row.y,
    };
  });

  return {
    cards,
    links: links.map((l) => ({
      id: l.id,
      fromCardId: l.fromCardId,
      toCardId: l.toCardId,
      label: l.label,
    })),
  };
}

// Which of the given posts are already on this user's board — a Set so cards can ask in
// O(1) without a per-row query threaded through the feed include.
export async function getBoardedPostIds(viewerId: string | undefined, postIds: string[]) {
  if (!viewerId || postIds.length === 0) return new Set<string>();
  const rows = await prisma.canvasCard.findMany({
    where: { userId: viewerId, postId: { in: postIds } },
    select: { postId: true },
  });
  return new Set(rows.map((r) => r.postId).filter((id): id is string => !!id));
}
