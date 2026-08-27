"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getUserReputation } from "@/lib/reputation";
import { moderateFieldSubmission } from "@/lib/fieldModeration";
import { PROMOTION_DISTINCT_AUTHOR_THRESHOLD } from "@/lib/fieldConstants";

// Soft friction, not a gatekeeper: a brand-new account can't spin up Fields, but there's
// no approval queue and no admin in the loop for the common case. A few days old OR some
// earned reputation is enough — either signals "not a same-session throwaway account."
const MIN_ACCOUNT_AGE_DAYS = 3;
const MIN_REPUTATION_TO_BYPASS_AGE = 5;

function slugify(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")
    .replace(/[^a-zA-Z0-9]/g, "");
}

export async function createField(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const accountAgeDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (accountAgeDays < MIN_ACCOUNT_AGE_DAYS) {
    const reputation = await getUserReputation(user.id);
    if (reputation < MIN_REPUTATION_TO_BYPASS_AGE) {
      return `New accounts need to be ${MIN_ACCOUNT_AGE_DAYS}+ days old (or have some reputation from posts/comments) before creating a Field — helps keep this low-friction without it becoming a spam vector.`;
    }
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const keywordsRaw = String(formData.get("keywords") ?? "").trim();

  if (!name) return "Name is required.";
  if (!description) return "A short description is required.";

  const keywords = keywordsRaw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (keywords.length === 0) return "Add at least one search keyword.";

  const baseSlug = slugify(name);
  if (!baseSlug) return "That name doesn't produce a usable slug — try adding some letters.";

  const existingFields = await prisma.board.findMany({
    where: { status: { not: "SUSPENDED" } },
    select: { slug: true, name: true, description: true },
  });

  const moderation = await moderateFieldSubmission({ name, description, existingFields });
  if (moderation.isSpam) {
    return moderation.reason ?? "This didn't pass an automated spam check — try rephrasing it.";
  }
  if (moderation.isDuplicate) {
    return `${moderation.reason ?? "This looks like it overlaps an existing Field."}${
      moderation.duplicateOfSlug ? ` Check out F~${moderation.duplicateOfSlug}.` : ""
    }`;
  }

  let slug = baseSlug;
  let suffix = 2;
  while (await prisma.board.findUnique({ where: { slug } })) {
    slug = `${baseSlug}${suffix}`;
    suffix += 1;
  }

  const board = await prisma.board.create({
    data: {
      slug,
      name,
      description,
      searchKeywordsJson: JSON.stringify(keywords),
      createdById: session.user.id,
      status: "PROVISIONAL",
    },
  });

  revalidatePath("/");
  redirect(`/?board=${board.slug}`);
}

// Called after a post is created — if its Field is still PROVISIONAL and posts from enough
// distinct users have now landed in it, promote it to ACTIVE (main sidebar). This is the
// actual anti-spam mechanism: a spam Field simply never crosses this bar, no manual review
// needed. Cheap incremental check, not a batch job.
export async function maybePromoteField(boardId: string): Promise<void> {
  const board = await prisma.board.findUnique({ where: { id: boardId }, select: { status: true } });
  if (!board || board.status !== "PROVISIONAL") return;

  const posters = await prisma.post.findMany({
    where: { boardId, status: "PUBLISHED" },
    select: { authorId: true },
    distinct: ["authorId"],
  });

  if (posters.length >= PROMOTION_DISTINCT_AUTHOR_THRESHOLD) {
    await prisma.board.update({ where: { id: boardId }, data: { status: "ACTIVE" } });
    revalidatePath("/");
  }
}

export async function reportField(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const boardId = String(formData.get("boardId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!boardId) return "Missing Field.";
  if (!reason) return "Say briefly what's wrong with this Field.";

  const board = await prisma.board.findUnique({ where: { id: boardId }, select: { id: true } });
  if (!board) return "That Field doesn't exist.";

  await prisma.fieldReport.create({
    data: { boardId, reporterId: session.user.id, reason },
  });

  revalidatePath("/admin/fields");
  return undefined;
}
