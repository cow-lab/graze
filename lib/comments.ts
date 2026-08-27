import { prisma } from "@/lib/prisma";

export type CommentNode = Awaited<ReturnType<typeof getCommentTree>>[number];

export async function getCommentTree(postId: string, viewerId?: string) {
  const comments = await prisma.comment.findMany({
    where: { postId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          cowNumber: true,
          _count: { select: { affiliations: { where: { verified: true } } } },
        },
      },
      votes: { select: { value: true, userId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  type Raw = (typeof comments)[number];
  type Node = Raw & { score: number; userVote: "UP" | "DOWN" | null; replies: Node[] };

  const byId = new Map<string, Node>();
  for (const c of comments) {
    const score = c.votes.reduce((acc, v) => acc + (v.value === "UP" ? 1 : -1), 0);
    const userVote = viewerId ? (c.votes.find((v) => v.userId === viewerId)?.value ?? null) : null;
    byId.set(c.id, { ...c, score, userVote, replies: [] });
  }

  const roots: Node[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortByScore = (nodes: Node[]) => {
    nodes.sort((a, b) => b.score - a.score || a.createdAt.getTime() - b.createdAt.getTime());
    nodes.forEach((n) => sortByScore(n.replies));
  };
  sortByScore(roots);

  return roots;
}
