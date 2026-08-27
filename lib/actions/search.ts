"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { promoteCandidate, type PromoteOutcome } from "@/lib/combine/run";
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
  boardSlug: string,
): Promise<PromoteOutcome | { status: "error"; message: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const board = await prisma.board.findUnique({ where: { slug: boardSlug } });
  if (!board) return { status: "error", message: "Choose a Field first." };

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
      url: result.oaUrl ?? (result.doi ? `https://doi.org/${result.doi}` : ""),
      sourceName: "OpenAlex",
      citationCount: result.citationCount,
    },
    board.id,
    session.user.id,
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
