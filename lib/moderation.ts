import { prisma } from "@/lib/prisma";

// Backstop for when a duplicate slips past the preprint↔published check at ingestion
// time (lib/combine/preprintMatch.ts) — an admin picks which post survives, and this
// folds the other one's comments and votes into it rather than losing them.
export async function mergePosts(keepPostId: string, mergePostId: string): Promise<void> {
  if (keepPostId === mergePostId) throw new Error("Cannot merge a post into itself.");

  await prisma.$transaction(async (tx) => {
    const [keep, merge] = await Promise.all([
      tx.post.findUniqueOrThrow({ where: { id: keepPostId } }),
      tx.post.findUniqueOrThrow({ where: { id: mergePostId } }),
    ]);

    await tx.comment.updateMany({ where: { postId: mergePostId }, data: { postId: keepPostId } });

    // Votes carry a (userId, postId) uniqueness constraint — if the same person voted on
    // both posts, keep their vote on the surviving post and drop the other rather than
    // letting one person's vote count twice.
    const mergeVotes = await tx.vote.findMany({ where: { postId: mergePostId } });
    for (const vote of mergeVotes) {
      const existing = await tx.vote.findUnique({
        where: { userId_postId: { userId: vote.userId, postId: keepPostId } },
      });
      if (existing) {
        await tx.vote.delete({ where: { id: vote.id } });
      } else {
        await tx.vote.update({ where: { id: vote.id }, data: { postId: keepPostId } });
      }
    }

    // Board cards carry the same (userId, postId) uniqueness as votes: if someone had
    // both duplicates on their board, they keep one card — the one on the survivor —
    // rather than ending up with two cards for one paper. The note on the card being
    // dropped is folded into the survivor's when the survivor has none.
    const mergeCards = await tx.canvasCard.findMany({ where: { postId: mergePostId } });
    for (const card of mergeCards) {
      const existing = await tx.canvasCard.findFirst({
        where: { userId: card.userId, postId: keepPostId },
      });
      if (existing) {
        if (!existing.note.trim() && card.note.trim()) {
          await tx.canvasCard.update({ where: { id: existing.id }, data: { note: card.note } });
        }
        // Connections drawn to the dropped card would otherwise vanish with it.
        await tx.canvasLink.updateMany({
          where: { fromCardId: card.id },
          data: { fromCardId: existing.id },
        });
        await tx.canvasLink.updateMany({
          where: { toCardId: card.id },
          data: { toCardId: existing.id },
        });
        await tx.canvasCard.delete({ where: { id: card.id } });
      } else {
        await tx.canvasCard.update({ where: { id: card.id }, data: { postId: keepPostId } });
      }
    }

    // If only one side has a "Chew on this" explainer, keep it rather than losing it —
    // ResearchExplainer.postId is unique, so only move it over when the survivor has none.
    const keepExplainer = await tx.researchExplainer.findUnique({ where: { postId: keepPostId } });
    if (!keepExplainer) {
      await tx.researchExplainer.updateMany({
        where: { postId: mergePostId },
        data: { postId: keepPostId },
      });
    }

    // Delete the merged-away post now — its DOI (if any) needs to be free before it can
    // be backfilled onto the survivor below, since DOI is a unique column.
    await tx.post.delete({ where: { id: mergePostId } });

    await tx.post.update({
      where: { id: keepPostId },
      data: {
        doi: keep.doi ?? merge.doi ?? undefined,
        citationCount: keep.citationCount ?? merge.citationCount ?? undefined,
        field: keep.field ?? merge.field ?? undefined,
        externalUrl: keep.externalUrl ?? merge.externalUrl ?? undefined,
      },
    });
  });
}
