"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateExplainer } from "@/lib/explainer";
import { getOrAssignCowNumber } from "@/lib/cow";
import { maybePromoteField } from "@/lib/actions/fields";
import type { PostType, VoteValue } from "@prisma/client";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function saveUpload(file: File): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(file.name) || ".pdf";
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}

export async function createPost(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const type = String(formData.get("type") ?? "") as PostType;
  const title = String(formData.get("title") ?? "").trim();
  const boardSlug = String(formData.get("board") ?? "").trim();

  if (!title) return "Title is required.";
  if (!boardSlug) return "Choose a board.";
  if (!["RESEARCH", "POST"].includes(type)) return "Choose a post type.";

  const board = await prisma.board.findUnique({ where: { slug: boardSlug } });
  if (!board) return "That field doesn't exist.";

  const isAnonymous = formData.get("anonymous") === "on";
  if (isAnonymous) await getOrAssignCowNumber(session.user.id);

  if (type === "POST") {
    const description = String(formData.get("description") ?? "").trim();
    const refPostId = String(formData.get("refPostId") ?? "").trim();
    if (!description) return "Description is required.";

    if (refPostId) {
      const refPost = await prisma.post.findUnique({ where: { id: refPostId }, select: { id: true } });
      if (!refPost) return "That post ID doesn't match any existing post.";
    }

    const post = await prisma.post.create({
      data: {
        type,
        title,
        description,
        refPostId: refPostId || null,
        authorId: session.user.id,
        boardId: board.id,
        isAnonymous,
      },
    });
    await maybePromoteField(board.id);
    revalidatePath("/");
    if (refPostId) revalidatePath(`/post/${refPostId}`);
    redirect(`/post/${post.id}`);
  }

  if (type === "RESEARCH") {
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
      if (file.type !== "application/pdf") return "Only PDF uploads are supported.";
      fileUrl = await saveUpload(file);
    }
    if (!fileUrl && !externalUrl) {
      return "Provide either a PDF upload or an external link.";
    }

    const post = await prisma.post.create({
      data: {
        type,
        title,
        authors,
        field: field || board.name,
        year,
        abstract,
        externalUrl: externalUrl || null,
        fileUrl,
        authorId: session.user.id,
        boardId: board.id,
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
        summary: explainer.summary,
        termsJson: JSON.stringify(explainer.terms),
        quizJson: JSON.stringify(explainer.quiz),
        isDemo,
      },
    });

    await maybePromoteField(board.id);
    revalidatePath("/");
    revalidatePath("/research");
    redirect(`/post/${post.id}`);
  }

  return "Unsupported post type.";
}

export async function voteOnPost(postId: string, value: VoteValue) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

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
}

export async function recordView(postId: string) {
  await prisma.post.update({
    where: { id: postId },
    data: { viewCount: { increment: 1 } },
  });
}

export async function deletePost(postId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  if (!post || post.authorId !== session.user.id) redirect("/");

  // Comments, votes, and the research explainer all cascade off the post row. Posts that
  // referenced this one keep existing (their refPostId just goes null).
  await prisma.post.delete({ where: { id: postId } });

  revalidatePath("/");
  revalidatePath("/research");
  redirect("/");
}
