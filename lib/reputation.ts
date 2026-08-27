import { prisma } from "@/lib/prisma";

// Net vote score (upvotes − downvotes) summed across a user's PUBLISHED posts and their
// comments. Shared by the profile page and the Field-creation account-standing gate
// (lib/actions/fields.ts) — a real, if approximate, proxy for "not a brand-new throwaway."
export async function getUserReputation(userId: string): Promise<number> {
  const [posts, comments] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: userId, status: "PUBLISHED" },
      select: { votes: { select: { value: true } } },
    }),
    prisma.comment.findMany({
      where: { authorId: userId },
      select: { votes: { select: { value: true } } },
    }),
  ]);

  const score = (votes: { value: "UP" | "DOWN" }[]) =>
    votes.reduce((acc, v) => acc + (v.value === "UP" ? 1 : -1), 0);

  return posts.reduce((acc, p) => acc + score(p.votes), 0) + comments.reduce((acc, c) => acc + score(c.votes), 0);
}
