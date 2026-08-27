import { prisma } from "@/lib/prisma";
import type { CombineCandidate } from "@/lib/combine/types";
import { normalizeTitle, looksLikePreprintVenue } from "@/lib/combine/utils";

function isCandidatePreprint(candidate: CombineCandidate): boolean {
  if (candidate.version === "preprint") return true;
  if (candidate.version === "published") return false;
  return looksLikePreprintVenue(candidate.journal);
}

function isPostPreprint(post: { field: string | null; doi: string | null }): boolean {
  if (looksLikePreprintVenue(post.field)) return true;
  return !post.doi;
}

export type PreprintMatchResult =
  | { kind: "skip-preprint-duplicate"; existingPostId: string }
  | { kind: "attached-published-metadata"; existingPostId: string }
  | null;

// Deduping by DOI alone misses a preprint and its later peer-reviewed version — same
// underlying work, two different identifiers (or the preprint has none at all). This
// looks for an existing research post that's the *other* maturity level of the same
// paper, by normalized title, so they don't end up as two posts splitting votes and
// comments. A same-maturity title match (two published copies, say) returns null and
// falls through to the caller's plain DOI/title dedup instead — this is specifically the
// preprint↔published case, not a general duplicate check.
export async function resolvePreprintDuplicate(
  candidate: CombineCandidate,
): Promise<PreprintMatchResult> {
  const normalizedTitle = normalizeTitle(candidate.title);
  if (!normalizedTitle) return null;

  const existingResearch = await prisma.post.findMany({
    where: { type: "RESEARCH", status: { not: "REJECTED" } },
    select: { id: true, title: true, field: true, doi: true, citationCount: true },
    take: 1000,
  });

  const match = existingResearch.find((p) => normalizeTitle(p.title) === normalizedTitle);
  if (!match) return null;

  const candidateIsPreprint = isCandidatePreprint(candidate);
  const matchIsPreprint = isPostPreprint(match);
  if (candidateIsPreprint === matchIsPreprint) return null;

  if (candidateIsPreprint) {
    // The candidate is the preprint; a (more mature) version is already posted — don't
    // insert a duplicate.
    return { kind: "skip-preprint-duplicate", existingPostId: match.id };
  }

  // The candidate is the published version; the existing post is the preprint. Attach the
  // published metadata to it instead of creating a second post.
  await prisma.post.update({
    where: { id: match.id },
    data: {
      doi: candidate.doi ?? undefined,
      field: candidate.journal ?? undefined,
      citationCount: candidate.citationCount ?? match.citationCount ?? undefined,
      externalUrl: candidate.url || undefined,
      source: "COMBINE",
      sourceName: candidate.sourceName,
    },
  });

  return { kind: "attached-published-metadata", existingPostId: match.id };
}
