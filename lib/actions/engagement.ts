"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordMetric } from "@/lib/metrics";
import { captureError } from "@/lib/errorReporting";
import type { EngagementKind } from "@prisma/client";

export type PaperRef = {
  /** Set for a paper in the library. */
  postId?: string | null;
  /** Set for anything identified only by DOI — chiefly live-search results. */
  doi?: string | null;
};

// Tracking is deliberately not gated on being signed in: the metric is "did this get
// someone to the real paper", and a logged-out reader clicking through counts for that
// just as much. Only the durable per-user row (which earns a comment its marker) needs an
// account.
async function record(
  kind: EngagementKind,
  ref: PaperRef,
  afterExplainer: boolean,
): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  let postId = ref.postId ?? null;
  const doi = ref.doi ?? null;
  // A live result with no DOI has no stable identity to key a row on, so it stays a
  // metric-only event.
  if (!postId && !doi) return null;

  // Search results identify a paper by DOI only. If that paper is also in the library,
  // resolve it to the post as well — otherwise reading the source from /search wouldn't
  // count towards the same paper's comments, which is the same act either way.
  if (!postId && doi) {
    const imported = await prisma.post.findUnique({ where: { doi }, select: { id: true } });
    postId = imported?.id ?? null;
  }

  const existing = await prisma.paperEngagement.findFirst({
    where: { userId, kind, ...(postId ? { postId } : { doi }) },
  });

  if (existing) {
    // Upgrade-only: once a click is known to have followed an explainer, a later plain
    // click shouldn't erase that.
    if (afterExplainer && !existing.afterExplainer) {
      await prisma.paperEngagement.update({
        where: { id: existing.id },
        data: { afterExplainer: true },
      });
    }
    return postId;
  }

  try {
    await prisma.paperEngagement.create({
      data: { userId, kind, postId, doi, afterExplainer },
    });
  } catch {
    // Two clicks landing at once race on the unique constraint. The row exists either
    // way, which is all this table is asserting.
  }

  return postId;
}

// The core metric. Called from the source link itself, so it counts the click that leaves
// Graze rather than a proxy for it.
// Both of these are fired as the person is on their way somewhere else — following a link
// out to a paper, or reading their quiz result. Tracking is never worth interrupting that,
// so failures are captured and swallowed rather than surfaced.
export async function recordSourceClick(ref: PaperRef, afterExplainer: boolean) {
  try {
    recordMetric("source.clickthrough", { paper: ref.postId ?? ref.doi ?? "(unidentified)" });
    if (afterExplainer) recordMetric("source.clickthrough_after_chew");

    const postId = await record("SOURCE_CLICK", ref, afterExplainer);
    // So the "read the source" marker shows up on this person's existing comments without
    // them having to reload by hand.
    if (postId) revalidatePath(`/post/${postId}`);
  } catch (error) {
    captureError({ error, source: "server" });
  }
}

export async function recordComprehensionPass(ref: PaperRef) {
  try {
    recordMetric("comprehension.passed", { paper: ref.postId ?? ref.doi ?? "(unidentified)" });
    const postId = await record("COMPREHENSION_PASS", ref, false);
    if (postId) revalidatePath(`/post/${postId}`);
  } catch (error) {
    captureError({ error, source: "server" });
  }
}
