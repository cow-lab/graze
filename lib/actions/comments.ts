"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOrAssignCowNumber } from "@/lib/cow";
import type { VoteValue } from "@prisma/client";

export async function createComment(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const postId = String(formData.get("postId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim() || null;

  if (!body) return "Comment can't be empty.";
  if (!postId) return "Missing post.";

  const isAnonymous = formData.get("anonymous") === "on";
  if (isAnonymous) await getOrAssignCowNumber(session.user.id);

  await prisma.comment.create({
    data: {
      body,
      postId,
      parentId,
      authorId: session.user.id,
      isAnonymous,
    },
  });

  revalidatePath(`/post/${postId}`);
}

export async function voteOnComment(commentId: string, postId: string, value: VoteValue) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

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
}
