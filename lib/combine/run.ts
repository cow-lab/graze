import { prisma } from "@/lib/prisma";
import { generateExplainer } from "@/lib/explainer";
import { searchCrossref } from "@/lib/combine/sources/crossref";
import { searchOpenAlex } from "@/lib/combine/sources/openalex";
import { searchSemanticScholar } from "@/lib/combine/sources/semanticScholar";
import { searchPubMed } from "@/lib/combine/sources/pubmed";
import { isJournalAllowlisted } from "@/lib/combine/allowlist";
import { truncate } from "@/lib/combine/utils";
import { maybePromoteField } from "@/lib/actions/fields";
import { suggestFieldsFromRun } from "@/lib/combine/suggestFields";
import { resolvePreprintDuplicate } from "@/lib/combine/preprintMatch";
import type { CombineCandidate } from "@/lib/combine/types";
import type { PostStatus } from "@prisma/client";

const MAX_CANDIDATES_PER_SOURCE = 5;
const MAX_INSERTS_PER_FIELD = 3;
// Hard ceiling on how many Fields one run touches at all, independent of the per-field
// caps above. Fields are user-creatable and expected to multiply, so without this a run
// scales unbounded with Field count — a spike in Fields would otherwise mean a spike in
// external API calls in a single job. Any Fields past this cap just get picked up on the
// next scheduled run instead.
const MAX_FIELDS_PER_RUN = 25;

export type CombineRunSummary = {
  fieldsScanned: number;
  fieldsSkippedRunCap: number;
  candidatesFound: number;
  droppedNotAllowlisted: number;
  droppedNoAbstract: number;
  droppedDuplicate: number;
  // Preprint/published pairs caught by title+maturity matching (lib/combine/preprintMatch.ts)
  // — split into skipped (the preprint arrived after its published version) and attached
  // (the published version arrived and its metadata was merged into the existing preprint
  // post) so the two outcomes stay distinguishable in the run summary.
  preprintSkipped: number;
  preprintAttached: number;
  inserted: number;
  fieldsProposed: number;
  proposedFieldNames: string[];
  tokensUsed: { inputTokens: number; outputTokens: number };
};

export type PromoteOutcome =
  | { status: "published"; postId: string; tokensUsed: { inputTokens: number; outputTokens: number } }
  | { status: "pending"; postId: string; tokensUsed: { inputTokens: number; outputTokens: number } }
  | { status: "duplicate"; existingPostId: string }
  | { status: "preprint-skipped"; existingPostId: string }
  | { status: "preprint-attached"; existingPostId: string }
  | { status: "rejected"; reason: "no-abstract" | "not-allowlisted" };

export async function runCombine(): Promise<CombineRunSummary> {
  const summary: CombineRunSummary = {
    fieldsScanned: 0,
    fieldsSkippedRunCap: 0,
    candidatesFound: 0,
    droppedNotAllowlisted: 0,
    droppedNoAbstract: 0,
    droppedDuplicate: 0,
    preprintSkipped: 0,
    preprintAttached: 0,
    inserted: 0,
    fieldsProposed: 0,
    proposedFieldNames: [],
    tokensUsed: { inputTokens: 0, outputTokens: 0 },
  };

  const allFields = await prisma.board.findMany({ where: { status: { not: "SUSPENDED" } } });
  const fields = allFields.slice(0, MAX_FIELDS_PER_RUN);
  summary.fieldsSkippedRunCap = allFields.length - fields.length;
  if (summary.fieldsSkippedRunCap > 0) {
    console.log(
      `[Combine] Run cap hit: processing ${fields.length}/${allFields.length} Fields this run, ${summary.fieldsSkippedRunCap} deferred to the next run.`,
    );
  }

  const systemAuthor = await getOrCreateCombineAuthor();
  const allCandidatesThisRun: CombineCandidate[] = [];

  for (const field of fields) {
    summary.fieldsScanned += 1;

    let keywords: string[] = [];
    try {
      keywords = JSON.parse(field.searchKeywordsJson);
    } catch {
      keywords = [];
    }
    if (keywords.length === 0) continue;

    const [crossref, openAlex, semanticScholar, pubMed] = await Promise.all([
      searchCrossref(keywords, MAX_CANDIDATES_PER_SOURCE),
      searchOpenAlex(keywords, MAX_CANDIDATES_PER_SOURCE),
      searchSemanticScholar(keywords, MAX_CANDIDATES_PER_SOURCE),
      searchPubMed(keywords, MAX_CANDIDATES_PER_SOURCE),
    ]);

    const candidates = [...crossref, ...openAlex, ...semanticScholar, ...pubMed];
    summary.candidatesFound += candidates.length;
    allCandidatesThisRun.push(...candidates);

    const seenDoisThisRun = new Set<string>();
    let insertedForField = 0;

    for (const candidate of candidates) {
      if (insertedForField >= MAX_INSERTS_PER_FIELD) break;
      if (candidate.doi && seenDoisThisRun.has(candidate.doi)) {
        summary.droppedDuplicate += 1;
        continue;
      }

      // The scheduled/batch pipeline is unattended, so a candidate that fails the
      // allowlist check is dropped outright — there's no human in the loop yet to
      // weigh in on it (that's what manual "Add to Graze" promotion is for).
      const outcome = await promoteCandidate(candidate, field.id, systemAuthor.id, {
        allowPendingWhenNotAllowlisted: false,
      });

      switch (outcome.status) {
        case "published":
          if (candidate.doi) seenDoisThisRun.add(candidate.doi);
          insertedForField += 1;
          summary.inserted += 1;
          summary.tokensUsed.inputTokens += outcome.tokensUsed.inputTokens;
          summary.tokensUsed.outputTokens += outcome.tokensUsed.outputTokens;
          break;
        case "pending":
          summary.tokensUsed.inputTokens += outcome.tokensUsed.inputTokens;
          summary.tokensUsed.outputTokens += outcome.tokensUsed.outputTokens;
          break;
        case "duplicate":
          summary.droppedDuplicate += 1;
          break;
        case "preprint-skipped":
          summary.preprintSkipped += 1;
          break;
        case "preprint-attached":
          summary.preprintAttached += 1;
          break;
        case "rejected":
          if (outcome.reason === "no-abstract") summary.droppedNoAbstract += 1;
          else summary.droppedNotAllowlisted += 1;
          break;
      }
    }
  }

  const fieldSuggestions = await suggestFieldsFromRun(allCandidatesThisRun);
  summary.fieldsProposed = fieldSuggestions.proposed;
  summary.proposedFieldNames = fieldSuggestions.fieldNames;
  summary.tokensUsed.inputTokens += fieldSuggestions.tokensUsed.inputTokens;
  summary.tokensUsed.outputTokens += fieldSuggestions.tokensUsed.outputTokens;

  console.log(
    `[Combine] Run complete: ${summary.inserted} inserted across ${summary.fieldsScanned} fields · ` +
      `${summary.preprintSkipped} preprint duplicates skipped, ${summary.preprintAttached} attached to ` +
      `existing preprint posts · ${summary.tokensUsed.inputTokens} input / ${summary.tokensUsed.outputTokens} ` +
      `output Claude tokens used.`,
  );

  return summary;
}

// Runs one candidate through every check The Combine makes — dedup by DOI, abstract
// required, DOAJ/allowlist verification — then inserts it if it passes. Shared by the
// scheduled batch pipeline (runCombine, above) and manual "Add to Graze" promotion from
// live literature search (lib/actions/search.ts).
//
// `allowPendingWhenNotAllowlisted` is the one behavioral difference between those two
// callers: the unattended batch pipeline drops a non-allowlisted candidate outright,
// while a human deliberately promoting one specific paper they've looked at gets it
// queued for admin review instead of a silent drop.
export async function promoteCandidate(
  candidate: CombineCandidate,
  boardId: string,
  authorId: string,
  opts: { allowPendingWhenNotAllowlisted: boolean },
): Promise<PromoteOutcome> {
  if (candidate.doi) {
    const existing = await prisma.post.findUnique({ where: { doi: candidate.doi } });
    if (existing) return { status: "duplicate", existingPostId: existing.id };
  }

  // Different DOIs (or no DOI on the preprint side) don't rule out this being a preprint
  // and its later peer-reviewed version — check before falling back to a plain title match,
  // since that fallback wouldn't know to skip/attach instead of treating it as a fresh post.
  const preprintMatch = await resolvePreprintDuplicate(candidate);
  if (preprintMatch?.kind === "skip-preprint-duplicate") {
    return { status: "preprint-skipped", existingPostId: preprintMatch.existingPostId };
  }
  if (preprintMatch?.kind === "attached-published-metadata") {
    return { status: "preprint-attached", existingPostId: preprintMatch.existingPostId };
  }

  if (!candidate.doi) {
    // No DOI to key off and not a preprint/published pair — fall back to an exact title
    // match so a paper that keeps surfacing without a DOI (some Semantic Scholar/PubMed
    // results lack one) doesn't get re-inserted, and critically doesn't trigger a second
    // Claude API call to regenerate an explainer it already has.
    const existing = await prisma.post.findFirst({
      where: { type: "RESEARCH", title: candidate.title },
      select: { id: true },
    });
    if (existing) return { status: "duplicate", existingPostId: existing.id };
  }

  if (!candidate.abstract || candidate.abstract.length < 40) {
    return { status: "rejected", reason: "no-abstract" };
  }

  const allowlisted = await isJournalAllowlisted({
    issn: candidate.issn,
    journal: candidate.journal,
  });
  if (!allowlisted && !opts.allowPendingWhenNotAllowlisted) {
    return { status: "rejected", reason: "not-allowlisted" };
  }

  const status: PostStatus = allowlisted ? "PUBLISHED" : "PENDING";
  const { postId, tokensUsed } = await insertCandidate(candidate, boardId, authorId, status);
  return status === "PUBLISHED"
    ? { status: "published", postId, tokensUsed }
    : { status: "pending", postId, tokensUsed };
}

async function insertCandidate(
  candidate: CombineCandidate,
  boardId: string,
  authorId: string,
  status: PostStatus,
): Promise<{ postId: string; tokensUsed: { inputTokens: number; outputTokens: number } }> {
  const abstract = truncate(candidate.abstract!, 2000);

  const post = await prisma.post.create({
    data: {
      type: "RESEARCH",
      title: candidate.title,
      authors: candidate.authors,
      field: candidate.journal ?? undefined,
      year: candidate.year ?? undefined,
      abstract,
      externalUrl: candidate.url || null,
      citationCount: candidate.citationCount,
      authorId,
      boardId,
      source: "COMBINE",
      sourceName: candidate.sourceName,
      status,
      doi: candidate.doi,
    },
  });

  // This is always a brand-new post at this point (the DOI/title dedup check above
  // already ran), so there's no existing explainer to skip — but generate it against this
  // specific new row, never speculatively ahead of insertion.
  const { explainer, isDemo, usage } = await generateExplainer({
    title: candidate.title,
    authors: candidate.authors,
    field: candidate.journal ?? "Research",
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

  if (status === "PUBLISHED") await maybePromoteField(boardId);

  return { postId: post.id, tokensUsed: usage };
}

// Combine-imported posts still need an `authorId` (the schema requires one) — attribute
// them to a dedicated system account rather than any real user.
async function getOrCreateCombineAuthor() {
  const email = "the-combine@graze.internal";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email,
      name: "The Combine",
      passwordHash: "!", // not a valid bcrypt hash — this account can never log in
      verified: true,
      role: "USER",
    },
  });
}
