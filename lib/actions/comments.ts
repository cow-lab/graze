"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/actions/auth";
import { getOrAssignCowNumber } from "@/lib/cow";
import {
  notifyCommentOnPost,
  notifyReplyToComment,
  notifyTrackedPaperComment,
} from "@/lib/notifications";
import { guard, type ActionResult } from "@/lib/actions/result";
import type { VoteValue } from "@prisma/client";

export async function createComment(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const result = await guard(
    "Couldn't post your comment — it wasn't saved. Copy it somewhere safe and try again.",
    () => createCommentInner(formData),
  );
  return result.ok ? result.data : result.message;
}

async function createCommentInner(formData: FormData): Promise<string | undefined> {
  const userId = await requireUserId();

  const postId = String(formData.get("postId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim() || null;

  if (!body) return "Comment can't be empty.";
  if (!postId) return "Missing post.";

  const isAnonymous = formData.get("anonymous") === "on";
  if (isAnonymous) await getOrAssignCowNumber(userId);

  const comment = await prisma.comment.create({
    data: {
      body,
      postId,
      parentId,
      authorId: userId,
      isAnonymous,
    },
  });

  // A reply notifies the parent comment's author; a top-level comment notifies whoever
  // submitted the paper. Everyone else tracking the paper — it's on their board, or they
  // commented on it — gets the more general notification, minus anyone already covered
  // above so one comment never produces two notifications for the same person.
  const alreadyNotified: string[] = [];
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { authorId: true },
    });
    if (parent) alreadyNotified.push(parent.authorId);
    await notifyReplyToComment({
      parentCommentId: parentId,
      commentId: comment.id,
      postId,
      actorId: userId,
    });
  } else {
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (post) alreadyNotified.push(post.authorId);
    await notifyCommentOnPost({ postId, commentId: comment.id, actorId: userId });
  }

  await notifyTrackedPaperComment({
    postId,
    commentId: comment.id,
    actorId: userId,
    excludeUserIds: alreadyNotified,
  });

  revalidatePath(`/post/${postId}`);
}

export async function voteOnComment(
  commentId: string,
  postId: string,
  value: VoteValue,
): Promise<ActionResult> {
  return guard("Something went wrong saving your vote. Try again in a moment.", async () => {
    const userId = await requireUserId();

    const existing = await prisma.commentVote.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existing && existing.value === value) {
      await prisma.commentVote.delete({ where: { id: existing.id } });
    } else if (existing) {
      await prisma.commentVote.update({ where: { id: existing.id }, data: { value } });
    } else {
      await prisma.commentVote.create({ data: { userId, commentId, value } });
    }

    revalidatePath(`/post/${postId}`);
    return undefined;
  });
}
