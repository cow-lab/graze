"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { runCombine, type CombineRunSummary } from "@/lib/combine/run";
import { checkRetractions, type RetractionCheckSummary } from "@/lib/combine/retractions";
import { mergePosts } from "@/lib/moderation";
import { maybePromoteField } from "@/lib/actions/fields";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== "ADMIN") redirect("/");

  return user;
}

export async function approveQueueEntry(postId: string) {
  await requireAdmin();
  const post = await prisma.post.update({
    where: { id: postId },
    data: { status: "PUBLISHED" },
    select: { boardId: true },
  });
  await maybePromoteField(post.boardId);
  revalidatePath("/admin/queue");
  revalidatePath("/research");
  revalidatePath("/");
}

export async function rejectQueueEntry(postId: string) {
  await requireAdmin();
  await prisma.post.update({ where: { id: postId }, data: { status: "REJECTED" } });
  revalidatePath("/admin/queue");
}

export async function runCombineAction(): Promise<CombineRunSummary> {
  await requireAdmin();
  const summary = await runCombine();
  revalidatePath("/admin/queue");
  return summary;
}

export async function checkRetractionsAction(): Promise<RetractionCheckSummary> {
  await requireAdmin();
  const summary = await checkRetractions();
  revalidatePath("/");
  revalidatePath("/research");
  return summary;
}

export async function mergePostsAction(keepPostId: string, mergePostIds: string[]): Promise<void> {
  await requireAdmin();
  for (const mergeId of mergePostIds) {
    await mergePosts(keepPostId, mergeId);
  }
  revalidatePath("/admin/duplicates");
  revalidatePath("/");
  revalidatePath("/research");
}

export async function promoteFieldAction(boardId: string) {
  await requireAdmin();
  await prisma.board.update({ where: { id: boardId }, data: { status: "ACTIVE" } });
  revalidatePath("/admin/fields");
  revalidatePath("/");
}

export async function suspendFieldAction(boardId: string) {
  await requireAdmin();
  await prisma.board.update({ where: { id: boardId }, data: { status: "SUSPENDED" } });
  revalidatePath("/admin/fields");
  revalidatePath("/");
}

export async function dismissFieldReportsAction(boardId: string) {
  await requireAdmin();
  await prisma.fieldReport.deleteMany({ where: { boardId } });
  revalidatePath("/admin/fields");
}
