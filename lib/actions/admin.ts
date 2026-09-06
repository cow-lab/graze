"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { runCombine, type CombineRunSummary } from "@/lib/combine/run";
import { checkRetractions, type RetractionCheckSummary } from "@/lib/combine/retractions";
import { mergePosts } from "@/lib/moderation";
import { maybePromoteField } from "@/lib/actions/fields";
import { guard, type ActionResult } from "@/lib/actions/result";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== "ADMIN") redirect("/");

  return user;
}

export async function approveQueueEntry(postId: string): Promise<ActionResult> {
  return guard("Couldn't approve that paper. Try again in a moment.", async () => {
    await requireAdmin();
    const post = await prisma.post.update({
      where: { id: postId },
      data: { status: "PUBLISHED" },
      select: { fields: { select: { boardId: true } } },
    });
    // A paper can be filed under several Fields now, and publishing it counts towards the
    // traction threshold in each of them.
    for (const assignment of post.fields) {
      await maybePromoteField(assignment.boardId);
    }
    revalidatePath("/admin/queue");
    revalidatePath("/research");
    revalidatePath("/");
    return undefined;
  });
}

export async function rejectQueueEntry(postId: string): Promise<ActionResult> {
  return guard("Couldn't reject that paper. Try again in a moment.", async () => {
    await requireAdmin();
    await prisma.post.update({ where: { id: postId }, data: { status: "REJECTED" } });
    revalidatePath("/admin/queue");
    return undefined;
  });
}

export async function runCombineAction(): Promise<ActionResult<CombineRunSummary>> {
  return guard(
    "The Combine run didn't finish — one of the external sources may be down. The captured error is on this page.",
    async () => {
      await requireAdmin();
      const summary = await runCombine();
      revalidatePath("/admin/queue");
      return summary;
    },
  );
}

export async function checkRetractionsAction(): Promise<ActionResult<RetractionCheckSummary>> {
  return guard("The retraction check didn't finish — Crossref may be unavailable right now.", async () => {
    await requireAdmin();
    const summary = await checkRetractions();
    revalidatePath("/");
    revalidatePath("/research");
    return summary;
  });
}

export async function mergePostsAction(
  keepPostId: string,
  mergePostIds: string[],
): Promise<ActionResult> {
  return guard("Couldn't merge those papers — nothing was changed. Try again in a moment.", async () => {
    await requireAdmin();
    for (const mergeId of mergePostIds) {
      await mergePosts(keepPostId, mergeId);
    }
    revalidatePath("/admin/duplicates");
    revalidatePath("/");
    revalidatePath("/research");
    return undefined;
  });
}

export async function promoteFieldAction(boardId: string): Promise<ActionResult> {
  return guard("Couldn't promote that Field. Try again in a moment.", async () => {
    await requireAdmin();
    await prisma.board.update({ where: { id: boardId }, data: { status: "ACTIVE" } });
    revalidatePath("/admin/fields");
    revalidatePath("/");
    return undefined;
  });
}

export async function suspendFieldAction(boardId: string): Promise<ActionResult> {
  return guard("Couldn't suspend that Field. Try again in a moment.", async () => {
    await requireAdmin();
    await prisma.board.update({ where: { id: boardId }, data: { status: "SUSPENDED" } });
    revalidatePath("/admin/fields");
    revalidatePath("/");
    return undefined;
  });
}

// Retire a Field in good standing: it drops out of the sidebar and the Field picker and
// The Combine stops feeding it, but everything already posted there stays readable. This
// is the non-punitive counterpart to suspending.
export async function archiveFieldAction(boardId: string): Promise<ActionResult> {
  return guard("Couldn't archive that Field. Try again in a moment.", async () => {
    await requireAdmin();
    await prisma.board.update({ where: { id: boardId }, data: { status: "ARCHIVED" } });
    revalidatePath("/admin/fields");
    revalidatePath("/");
    return undefined;
  });
}

// Undo an archive or a suspension. Restores to PROVISIONAL rather than straight to
// ACTIVE, so a reinstated Field re-enters through the same traction gate as any other —
// then maybePromoteField immediately lifts it back to ACTIVE if it already has posts from
// enough distinct people, which is the common case for anything reinstated.
export async function restoreFieldAction(boardId: string): Promise<ActionResult> {
  return guard("Couldn't restore that Field. Try again in a moment.", async () => {
    await requireAdmin();
    await prisma.board.update({ where: { id: boardId }, data: { status: "PROVISIONAL" } });
    await maybePromoteField(boardId);
    revalidatePath("/admin/fields");
    revalidatePath("/");
    return undefined;
  });
}

export async function dismissFieldReportsAction(boardId: string): Promise<ActionResult> {
  return guard("Couldn't dismiss those reports. Try again in a moment.", async () => {
    await requireAdmin();
    await prisma.fieldReport.deleteMany({ where: { boardId } });
    revalidatePath("/admin/fields");
    return undefined;
  });
}
