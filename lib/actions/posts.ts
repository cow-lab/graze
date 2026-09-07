"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveUploadedPdf } from "@/lib/storage";
import { requireUserId } from "@/lib/actions/auth";
import { generateExplainer } from "@/lib/explainer";
import { getOrAssignCowNumber } from "@/lib/cow";
import { maybePromoteField } from "@/lib/actions/fields";
import { guard, type ActionResult } from "@/lib/actions/result";
import { captureError } from "@/lib/errorReporting";
import type { VoteValue } from "@prisma/client";

export async function createPost(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const result = await guard(
    "Couldn't post that paper — nothing was saved. Try again in a moment.",
    () => createPostInner(formData),
  );
  return result.ok ? result.data : result.message;
}

async function createPostInner(formData: FormData): Promise<string | undefined> {
  const userId = await requireUserId();

  // Server-side twin of the checkbox in SubmitForm. Content becomes public and files are
  // stored publicly, so the record that someone affirmed they had the right to share it
  // must not depend on client-side validation.
  if (formData.get("rightsAcknowledged") !== "yes") {
    return "Please confirm you have the right to share this and understand it will be public.";
  }

  const title = String(formData.get("title") ?? "").trim();
  // Several Fields, not one — checkboxes rather than a dropdown, pre-ticked by the same
  // keyword matcher The Combine uses (see components/FieldPicker.tsx).
  const chosenSlugs = formData.getAll("fields").map(String).filter(Boolean);
  // Which of those the matcher proposed, so the assignment records how it was made rather
  // than crediting everything to the person who happened to submit the form.
  const suggestedSlugs = new Set(
    String(formData.get("suggestedFields") ?? "")
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean),
  );

  if (!title) return "Title is required.";
  if (chosenSlugs.length === 0) return "Pick at least one Field for this paper.";

  const boards = await prisma.board.findMany({
    where: { slug: { in: chosenSlugs }, status: { in: ["ACTIVE", "PROVISIONAL"] } },
    select: { id: true, slug: true, name: true },
  });
  if (boards.length === 0) return "None of those Fields exist.";
  const board = boards[0];

  const isAnonymous = formData.get("anonymous") === "on";
  if (isAnonymous) await getOrAssignCowNumber(userId);

  const authors = String(formData.get("authors") ?? "").trim();
  const field = String(formData.get("field") ?? "").trim();
  const abstract = String(formData.get("abstract") ?? "").trim();
  const externalUrl = String(formData.get("externalUrl") ?? "").trim();
  const yearRaw = String(formData.get("year") ?? "").trim();
  const year = yearRaw ? Number.parseInt(yearRaw, 10) : new Date().getFullYear();

  if (!authors) return "Authors are required.";
  if (!abstract) return "A plain-language abstract is required.";

  const file = formData.get("file");
  let fileUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    // Type and size are validated inside, so a bad upload comes back as a sentence for the
    // form rather than as an exception.
    const upload = await saveUploadedPdf(file);
    if (!upload.ok) return upload.message;
    fileUrl = upload.url;
  }
  if (!fileUrl && !externalUrl) {
    return "Provide either a PDF upload or an external link.";
  }

  const post = await prisma.post.create({
    data: {
      title,
      authors,
      field: field || board.name,
      year,
      abstract,
      externalUrl: externalUrl || null,
      fileUrl,
      authorId: userId,
      fields: {
        create: boards.map((b) => ({
          boardId: b.id,
          assignedBy: suggestedSlugs.has(b.slug) ? ("KEYWORD_MATCH" as const) : ("USER" as const),
        })),
      },
      isAnonymous,
    },
  });

  const { explainer, isDemo } = await generateExplainer({
    title,
    authors,
    field: field || board.name,
    abstract,
  });

  await prisma.researchExplainer.create({
    data: {
      postId: post.id,
      tldr: explainer.tldr,
      summary: explainer.summary,
      keyFindingsJson: JSON.stringify(explainer.keyFindings),
      termsJson: JSON.stringify(explainer.terms),
      quizJson: JSON.stringify(explainer.quiz),
      isDemo,
    },
  });

  for (const b of boards) await maybePromoteField(b.id);
  revalidatePath("/");
  revalidatePath("/research");
  redirect(`/post/${post.id}`);
}

export async function voteOnPost(postId: string, value: VoteValue): Promise<ActionResult> {
  return guard("Something went wrong saving your vote. Try again in a moment.", async () => {
    const userId = await requireUserId();

    const existing = await prisma.vote.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing && existing.value === value) {
      await prisma.vote.delete({ where: { id: existing.id } });
    } else if (existing) {
      await prisma.vote.update({ where: { id: existing.id }, data: { value } });
    } else {
      await prisma.vote.create({ data: { userId, postId, value } });
    }

    revalidatePath("/");
    revalidatePath("/research");
    revalidatePath(`/post/${postId}`);
    return undefined;
  });
}

// Called during the paper page's own render, so a failure here would take the page down
// with it over a counter nobody is waiting on. Logged and swallowed instead.
export async function recordView(postId: string) {
  try {
    await prisma.post.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });
  } catch (error) {
    captureError({ error, source: "server", path: `/post/${postId}` });
  }
}

export async function deletePost(postId: string): Promise<ActionResult> {
  return guard("Couldn't delete that paper. Try again in a moment.", async () => {
    const userId = await requireUserId();

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (!post || post.authorId !== userId) redirect("/");

    // Comments, votes, board cards, and the research explainer all cascade off the post row.
    await prisma.post.delete({ where: { id: postId } });

    revalidatePath("/");
    revalidatePath("/research");
    redirect("/");
  });
}
