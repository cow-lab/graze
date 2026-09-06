"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/actions/auth";
import { promoteCandidate, type FieldAssignment, type PromoteOutcome } from "@/lib/combine/run";
import { captureError } from "@/lib/errorReporting";
import type { LiveSearchResult } from "@/lib/liveSearch";

// "Add to Graze" on a live search result — any signed-in user can do this (not
// admin-only), same as anyone can submit a post. It runs the result through the exact
// same validity pipeline as The Combine's automated ingestion (DOAJ/allowlist check,
// dedup, explainer generation), the only difference being that a result whose journal
// isn't allowlisted lands in the moderation queue for review instead of being dropped —
// a human specifically chose this one paper, so it gets a second look rather than a
// silent rejection.
export async function promoteToGraze(
  result: LiveSearchResult,
  boardSlugs: string[],
  // Which of the chosen Fields the matcher proposed, so the assignment records how it was
  // made rather than crediting all of them to the person who clicked.
  suggestedSlugs: string[] = [],
): Promise<PromoteOutcome | { status: "error"; message: string }> {
  const userId = await requireUserId();

  const boards = await prisma.board.findMany({
    where: { slug: { in: boardSlugs }, status: { in: ["ACTIVE", "PROVISIONAL"] } },
    select: { id: true, slug: true },
  });
  if (boards.length === 0) return { status: "error", message: "Pick at least one Field first." };

  const suggested = new Set(suggestedSlugs);
  const assignments: FieldAssignment[] = boards.map((board) => ({
    boardId: board.id,
    assignedBy: suggested.has(board.slug) ? ("KEYWORD_MATCH" as const) : ("USER" as const),
  }));

  try {
    return await add(result, assignments, userId);
  } catch (error) {
    captureError({ error, source: "server" });
    return {
      status: "error",
      message: "Couldn't add that paper to Graze. Try again in a moment.",
    };
  }
}

async function add(
  result: LiveSearchResult,
  fields: FieldAssignment[],
  userId: string,
): Promise<PromoteOutcome> {
  const outcome = await promoteCandidate(
    {
      title: result.title,
      authors: result.authors,
      abstract: result.abstract,
      doi: result.doi,
      issn: result.issn,
      publisher: result.publisher,
      journal: result.venue,
      year: result.year,
      // Prefer the free full text so the stored entry points somewhere readable.
      url:
        result.oaUrl ??
        result.landingUrl ??
        (result.doi ? `https://doi.org/${result.doi}` : ""),
      sourceName: "OpenAlex",
      citationCount: result.citationCount,
      language: result.language,
      workType: result.workType,
    },
    fields,
    userId,
    { allowPendingWhenNotAllowlisted: true },
  );

  if (outcome.status === "published") {
    revalidatePath("/");
    revalidatePath("/research");
  } else if (outcome.status === "pending") {
    revalidatePath("/admin/queue");
  }

  return outcome;
}
