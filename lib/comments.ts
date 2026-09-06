import { prisma } from "@/lib/prisma";
import { getPostEngagement } from "@/lib/engagement";

export type CommentNode = Awaited<ReturnType<typeof getCommentTree>>[number];

// How much having done the work counts for when comments are ordered. These are vote
// equivalents: a comment from someone who followed the link out to the paper starts two
// upvotes ahead of one from someone who didn't, and passing the paper's comprehension
// check is worth one more. Deliberately modest — enough that a first-hand comment doesn't
// sit at the bottom waiting for votes it may never get, not so much that a wrong answer
// outranks a well-voted correction forever.
const READ_SOURCE_WEIGHT = 2;
const PASSED_CHECK_WEIGHT = 1;

export async function getCommentTree(postId: string, viewerId?: string) {
  const [comments, engagement] = await Promise.all([
    prisma.comment.findMany({
      where: { postId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            cowNumber: true,
                    },
        },
        votes: { select: { value: true, userId: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    getPostEngagement(postId),
  ]);

  type Raw = (typeof comments)[number];
  type Node = Raw & {
    score: number;
    userVote: "UP" | "DOWN" | null;
    readSource: boolean;
    passedCheck: boolean;
    rank: number;
    replies: Node[];
  };

  const byId = new Map<string, Node>();
  for (const c of comments) {
    const score = c.votes.reduce((acc, v) => acc + (v.value === "UP" ? 1 : -1), 0);
    const userVote = viewerId ? (c.votes.find((v) => v.userId === viewerId)?.value ?? null) : null;
    const authorEngagement = engagement.get(c.authorId) ?? {
      readSource: false,
      passedCheck: false,
    };
    const rank =
      score +
      (authorEngagement.readSource ? READ_SOURCE_WEIGHT : 0) +
      (authorEngagement.passedCheck ? PASSED_CHECK_WEIGHT : 0);

    byId.set(c.id, {
      ...c,
      score,
      userVote,
      readSource: authorEngagement.readSource,
      passedCheck: authorEngagement.passedCheck,
      rank,
      replies: [],
    });
  }

  const roots: Node[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortByRank = (nodes: Node[]) => {
    nodes.sort((a, b) => b.rank - a.rank || a.createdAt.getTime() - b.createdAt.getTime());
    nodes.forEach((n) => sortByRank(n.replies));
  };
  sortByRank(roots);

  return roots;
}
