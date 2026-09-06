"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/actions/auth";
import { getUserReputation } from "@/lib/reputation";
import { moderateFieldSubmission } from "@/lib/fieldModeration";
import { PROMOTION_DISTINCT_AUTHOR_THRESHOLD } from "@/lib/fieldConstants";
import { slugify } from "@/lib/slug";
import { rankFields, MIN_SCORE_TO_SUGGEST } from "@/lib/fieldMatch";
import { guard } from "@/lib/actions/result";

// Soft friction, not a gatekeeper: a brand-new account can't spin up Fields, but there's
// no approval queue and no admin in the loop for the common case. A few days old OR some
// earned reputation is enough — either signals "not a same-session throwaway account."
const MIN_ACCOUNT_AGE_DAYS = 3;
const MIN_REPUTATION_TO_BYPASS_AGE = 5;

export async function createField(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const result = await guard(
    "Couldn't create that Field — nothing was saved. Try again in a moment.",
    () => createFieldInner(formData),
  );
  return result.ok ? result.data : result.message;
}

async function createFieldInner(formData: FormData): Promise<string | undefined> {
  const userId = await requireUserId();

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
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

  // Archived Fields are deliberately included here: a retired Field still reserves its
  // name, so someone shouldn't be able to recreate it as a near-duplicate. Only suspended
  // ones are excluded, since those shouldn't block a legitimate Field on the same topic.
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
      createdById: userId,
      status: "PROVISIONAL",
    },
  });

  await backfillExistingPapers(board);

  revalidatePath("/");
  redirect(`/?board=${board.slug}`);
}

// A new Field would otherwise open empty even when the library already holds papers that
// obviously belong in it — and an empty Field can't cross the traction threshold that
// promotes it out of "New fields". So its keywords run once against what's already here,
// using the same matcher every other entry point uses.
//
// Capped rather than unbounded: this runs inline on Field creation, and matching a few
// hundred recent papers is the difference between a Field that opens with something in it
// and one that doesn't. Older papers still get picked up by the next Combine run.
const BACKFILL_SCAN_LIMIT = 500;

async function backfillExistingPapers(board: {
  id: string;
  slug: string;
  name: string;
  searchKeywordsJson: string;
}): Promise<number> {
  const papers = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true, abstract: true, field: true },
    orderBy: { createdAt: "desc" },
    take: BACKFILL_SCAN_LIMIT,
  });

  const matches = papers.filter(
    (paper) =>
      rankFields(
        { title: paper.title, abstract: paper.abstract, venue: paper.field },
        [board],
        { minScore: MIN_SCORE_TO_SUGGEST, limit: 1 },
      ).length > 0,
  );

  if (matches.length === 0) return 0;

  await prisma.postField.createMany({
    data: matches.map((paper) => ({
      postId: paper.id,
      boardId: board.id,
      assignedBy: "BACKFILL" as const,
    })),
  });

  console.log(
    `[Fields] Backfilled ${matches.length} existing paper(s) into new Field F~${board.slug}.`,
  );
  await maybePromoteField(board.id);
  return matches.length;
}

// Called after a post is created — if its Field is still PROVISIONAL and posts from enough
// distinct users have now landed in it, promote it to ACTIVE (main sidebar). This is the
// actual anti-spam mechanism: a spam Field simply never crosses this bar, no manual review
// needed. Cheap incremental check, not a batch job.
export async function maybePromoteField(boardId: string): Promise<void> {
  const board = await prisma.board.findUnique({ where: { id: boardId }, select: { status: true } });
  if (!board || board.status !== "PROVISIONAL") return;

  const assignments = await prisma.postField.findMany({
    where: { boardId, post: { status: "PUBLISHED" } },
    select: { post: { select: { authorId: true } } },
  });
  const posters = new Set(assignments.map((a) => a.post.authorId));

  if (posters.size >= PROMOTION_DISTINCT_AUTHOR_THRESHOLD) {
    await prisma.board.update({ where: { id: boardId }, data: { status: "ACTIVE" } });
    revalidatePath("/");
  }
}

export async function reportField(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const result = await guard(
    "Couldn't send that report. Try again in a moment.",
    () => reportFieldInner(formData),
  );
  return result.ok ? result.data : result.message;
}

async function reportFieldInner(formData: FormData): Promise<string | undefined> {
  const userId = await requireUserId();

  const boardId = String(formData.get("boardId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!boardId) return "Missing Field.";
  if (!reason) return "Say briefly what's wrong with this Field.";

  const board = await prisma.board.findUnique({ where: { id: boardId }, select: { id: true } });
  if (!board) return "That Field doesn't exist.";

  await prisma.fieldReport.create({
    data: { boardId, reporterId: userId, reason },
  });

  revalidatePath("/admin/fields");
  return undefined;
}
