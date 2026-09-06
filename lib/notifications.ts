import { prisma } from "@/lib/prisma";

// Notifications are scoped to papers a person is actually involved with. The old
// vote-count notification is gone on purpose: this product isn't trying to grow engagement
// volume, and "7 people grew your post" is exactly the kind of number that pulls attention
// away from the work.

export async function notifyCommentOnPost(params: {
  postId: string;
  commentId: string;
  actorId: string;
}) {
  const post = await prisma.post.findUnique({
    where: { id: params.postId },
    select: { authorId: true },
  });
  // Never notify someone about their own activity.
  if (!post || post.authorId === params.actorId) return;

  await prisma.notification.create({
    data: {
      type: "COMMENT_ON_POST",
      userId: post.authorId,
      actorId: params.actorId,
      postId: params.postId,
      commentId: params.commentId,
    },
  });
}

export async function notifyReplyToComment(params: {
  parentCommentId: string;
  commentId: string;
  postId: string;
  actorId: string;
}) {
  const parent = await prisma.comment.findUnique({
    where: { id: params.parentCommentId },
    select: { authorId: true },
  });
  if (!parent || parent.authorId === params.actorId) return;

  await prisma.notification.create({
    data: {
      type: "REPLY_TO_COMMENT",
      userId: parent.authorId,
      actorId: params.actorId,
      postId: params.postId,
      commentId: params.commentId,
    },
  });
}

// "Someone commented on a paper you're tracking." Tracking means one of two things, both
// of which are a deliberate act: the paper is on your board, or you've commented on it.
// `excludeUserIds` carries whoever has already been notified about this same comment by
// one of the more specific notifications above — nobody should get two lines for one event.
export async function notifyTrackedPaperComment(params: {
  postId: string;
  commentId: string;
  actorId: string;
  excludeUserIds: string[];
}) {
  const [boardUsers, commenters] = await Promise.all([
    prisma.canvasCard.findMany({
      where: { postId: params.postId },
      select: { userId: true },
    }),
    prisma.comment.findMany({
      where: { postId: params.postId },
      select: { authorId: true },
      distinct: ["authorId"],
    }),
  ]);

  const excluded = new Set([params.actorId, ...params.excludeUserIds]);
  const recipients = new Set<string>();
  for (const row of boardUsers) if (!excluded.has(row.userId)) recipients.add(row.userId);
  for (const row of commenters) if (!excluded.has(row.authorId)) recipients.add(row.authorId);

  if (recipients.size === 0) return;

  await prisma.notification.createMany({
    data: [...recipients].map((userId) => ({
      type: "COMMENT_ON_TRACKED_PAPER" as const,
      userId,
      actorId: params.actorId,
      postId: params.postId,
      commentId: params.commentId,
    })),
  });
}

export async function getNotifications(userId: string, take = 15) {
  return prisma.notification.findMany({
    where: { userId },
    include: {
      actor: { select: { name: true, cowNumber: true } },
      post: { select: { id: true, title: true } },
      comment: { select: { id: true, body: true, isAnonymous: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
