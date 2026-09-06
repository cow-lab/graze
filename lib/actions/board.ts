"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/actions/auth";
import { nextCardPosition } from "@/lib/board";
import { recordMetric } from "@/lib/metrics";
import { guard, type ActionResult } from "@/lib/actions/result";

export type ExternalPaper = {
  doi: string | null;
  title: string;
  authors: string | null;
  venue: string | null;
  year: number | null;
  url: string | null;
};

const MAX_NOTE = 600;
const MAX_LABEL = 40;

// Add/remove a paper that's already in the library. Returns whether it's on the board
// afterwards, so the button can settle on the server's answer rather than its guess.
export async function toggleBoardPost(postId: string): Promise<ActionResult<boolean>> {
  return guard("Couldn't update your board. Try again in a moment.", async () => {
    const userId = await requireUserId();

    const existing = await prisma.canvasCard.findFirst({ where: { userId, postId } });
    if (existing) {
      await prisma.canvasCard.delete({ where: { id: existing.id } });
      revalidatePath("/board");
      return false;
    }

    const { x, y } = await nextCardPosition(userId);
    await prisma.canvasCard.create({ data: { userId, postId, x, y } });
    recordMetric("board.card_added", { tier: "library" });
    revalidatePath("/board");
    return true;
  });
}

// Add/remove a live-search result. The paper isn't in the database and may never be, so
// enough metadata is copied onto the card to render it on its own — otherwise the card
// would point at nothing.
export async function toggleBoardExternal(item: ExternalPaper): Promise<ActionResult<boolean>> {
  return guard("Couldn't add that paper to your board. Try again in a moment.", async () => {
    const userId = await requireUserId();

    if (item.doi) {
      // If this paper has since been imported, put the real post on the board instead of
      // duplicating it as an external card.
      const imported = await prisma.post.findUnique({
        where: { doi: item.doi },
        select: { id: true },
      });
      if (imported) {
        const nested = await toggleBoardPost(imported.id);
        // The nested call already reported anything that went wrong; re-throw so this
        // guard reports it once rather than returning a bare `true`.
        if (!nested.ok) throw new Error(nested.message);
        return nested.data;
      }

      const existing = await prisma.canvasCard.findFirst({
        where: { userId, externalDoi: item.doi },
      });
      if (existing) {
        await prisma.canvasCard.delete({ where: { id: existing.id } });
        revalidatePath("/board");
        return false;
      }
    }

    const { x, y } = await nextCardPosition(userId);
    await prisma.canvasCard.create({
      data: {
        userId,
        externalDoi: item.doi,
        externalTitle: item.title,
        externalAuthors: item.authors,
        externalVenue: item.venue,
        externalYear: item.year,
        externalUrl: item.url,
        x,
        y,
      },
    });
    recordMetric("board.card_added", { tier: "external" });
    revalidatePath("/board");
    return true;
  });
}

// Every mutation below goes through this: a card id from the client is untrusted, and
// updateMany scoped to the owner means someone else's card simply matches nothing.
async function ownedCardIds(userId: string, ids: string[]) {
  const rows = await prisma.canvasCard.findMany({
    where: { userId, id: { in: ids } },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

export async function moveCard(cardId: string, x: number, y: number): Promise<ActionResult> {
  return guard("Couldn't save where you moved that card. It'll stay put until you reload.", async () => {
    const userId = await requireUserId();
    // Clamped rather than rejected: a card dragged past the top-left edge should stop at
    // the edge, not refuse to move.
    await prisma.canvasCard.updateMany({
      where: { id: cardId, userId },
      data: { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) },
    });
    revalidatePath("/board");
    return undefined;
  });
}

export async function updateCardNote(cardId: string, note: string): Promise<ActionResult> {
  return guard("Couldn't save your note. Copy it somewhere safe and try again.", async () => {
    const userId = await requireUserId();
    const trimmed = note.slice(0, MAX_NOTE);
    const before = await prisma.canvasCard.findFirst({
      where: { id: cardId, userId },
      select: { note: true },
    });
    if (!before) return undefined;

    await prisma.canvasCard.updateMany({ where: { id: cardId, userId }, data: { note: trimmed } });
    // Counted only when a note goes from empty to written — re-saving an existing note
    // isn't a second act of engagement.
    if (!before.note.trim() && trimmed.trim()) recordMetric("board.note_written");
    revalidatePath("/board");
    return undefined;
  });
}

export async function removeCard(cardId: string): Promise<ActionResult> {
  return guard("Couldn't remove that card. Try again in a moment.", async () => {
    const userId = await requireUserId();
    await prisma.canvasCard.deleteMany({ where: { id: cardId, userId } });
    revalidatePath("/board");
    return undefined;
  });
}

export type NewLink = { id: string; fromCardId: string; toCardId: string; label: string };

export async function createLink(
  fromCardId: string,
  toCardId: string,
  label: string,
): Promise<ActionResult<NewLink>> {
  return guard("Couldn't save that connection. Try drawing it again.", async () => {
    const userId = await requireUserId();
    // These two read as failures to the caller in exactly the same way an infrastructure
    // failure does, so they're thrown with the sentence the person should see.
    if (fromCardId === toCardId) throw new Error("Pick two different cards.");

    const owned = await ownedCardIds(userId, [fromCardId, toCardId]);
    if (owned.size !== 2) throw new Error("Those cards aren't on your board.");

    // Connections read the same in either direction, so the pair is normalised before
    // writing — otherwise A→B and B→A would both be storable as separate lines between
    // the same two cards.
    const [a, b] = [fromCardId, toCardId].sort();

    const existing = await prisma.canvasLink.findUnique({
      where: { fromCardId_toCardId: { fromCardId: a, toCardId: b } },
    });
    if (existing) throw new Error("Those two are already connected.");

    const link = await prisma.canvasLink.create({
      data: { userId, fromCardId: a, toCardId: b, label: label.trim().slice(0, MAX_LABEL) },
    });
    recordMetric("board.link_created", { labelled: link.label.length > 0 });
    revalidatePath("/board");
    return {
      id: link.id,
      fromCardId: link.fromCardId,
      toCardId: link.toCardId,
      label: link.label,
    };
  });
}

export async function updateLinkLabel(linkId: string, label: string): Promise<ActionResult> {
  return guard("Couldn't save that label. Try again in a moment.", async () => {
    const userId = await requireUserId();
    await prisma.canvasLink.updateMany({
      where: { id: linkId, userId },
      data: { label: label.trim().slice(0, MAX_LABEL) },
    });
    revalidatePath("/board");
    return undefined;
  });
}

export async function deleteLink(linkId: string): Promise<ActionResult> {
  return guard("Couldn't remove that connection. Try again in a moment.", async () => {
    const userId = await requireUserId();
    await prisma.canvasLink.deleteMany({ where: { id: linkId, userId } });
    revalidatePath("/board");
    return undefined;
  });
}
