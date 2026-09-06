import { prisma } from "@/lib/prisma";
import { generateExplainer } from "@/lib/explainer";
import { searchCrossref } from "@/lib/combine/sources/crossref";
import { searchOpenAlex } from "@/lib/combine/sources/openalex";
import { searchSemanticScholar } from "@/lib/combine/sources/semanticScholar";
import { searchPubMed } from "@/lib/combine/sources/pubmed";
import { assessCandidate } from "@/lib/combine/reliability";
import { truncate } from "@/lib/combine/utils";
import { maybePromoteField } from "@/lib/actions/fields";
import { suggestFieldsFromRun } from "@/lib/combine/suggestFields";
import { resolvePreprintDuplicate } from "@/lib/combine/preprintMatch";
import { rankFields, type MatchableField } from "@/lib/fieldMatch";
import type { CombineCandidate } from "@/lib/combine/types";
import type { FieldAssignmentSource, PostStatus, ReliabilityStatus } from "@prisma/client";

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
  | {
      status: "rejected";
      reason: "no-abstract" | "not-allowlisted" | "not-peer-reviewed" | "retracted";
    };

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

  // Only Fields open to new content. Archived Fields are skipped alongside suspended ones
  // — there's no point ingesting fresh papers into a Field that's been retired.
  const allFields = await prisma.board.findMany({
    where: { status: { in: ["ACTIVE", "PROVISIONAL"] } },
  });
  const fields = allFields.slice(0, MAX_FIELDS_PER_RUN);
  summary.fieldsSkippedRunCap = allFields.length - fields.length;
  if (summary.fieldsSkippedRunCap > 0) {
    console.log(
      `[Combine] Run cap hit: processing ${fields.length}/${allFields.length} Fields this run, ${summary.fieldsSkippedRunCap} deferred to the next run.`,
    );
  }

  // Held once per run: every candidate is matched against all of these, not just the Field
  // whose search turned it up.
  const assignableFields: MatchableField[] = allFields.map((f) => ({
    id: f.id,
    slug: f.slug,
    name: f.name,
    searchKeywordsJson: f.searchKeywordsJson,
  }));

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
      // The Field whose keywords surfaced this paper, plus any other Field the same
      // matcher says it belongs in. A paper on AI in clinical triage shouldn't be visible
      // only to whichever Field's search happened to find it first.
      const alsoMatches = rankFields(
        {
          title: candidate.title,
          abstract: candidate.abstract,
          venue: candidate.journal,
          topics: candidate.topics,
        },
        assignableFields.filter((f) => f.id !== field.id),
      );
      const assignments: FieldAssignment[] = [
        { boardId: field.id, assignedBy: "COMBINE" as const },
        ...alsoMatches.map((m) => ({ boardId: m.id, assignedBy: "KEYWORD_MATCH" as const })),
      ];

      const outcome = await promoteCandidate(candidate, assignments, systemAuthor.id, {
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
  fields: FieldAssignment[],
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
      where: { title: candidate.title },
      select: { id: true },
    });
    if (existing) return { status: "duplicate", existingPostId: existing.id };
  }

  if (!candidate.abstract || candidate.abstract.length < 40) {
    return { status: "rejected", reason: "no-abstract" };
  }

  // Peer-review status, the DOAJ allowlist, and Retraction Watch, applied as one stated
  // policy (lib/combine/reliability.ts). Anything the checks disagree about lands in the
  // review queue rather than being resolved here.
  const decision = await assessCandidate(candidate, {
    humanChose: opts.allowPendingWhenNotAllowlisted,
  });

  if (decision.outcome === "reject") {
    return { status: "rejected", reason: decision.reason };
  }

  const status: PostStatus = decision.outcome === "publish" ? "PUBLISHED" : "PENDING";
  const { postId, tokensUsed } = await insertCandidate(candidate, fields, authorId, status, {
    reliability: decision.reliability,
    reviewReason: decision.outcome === "review" ? decision.reviewReason : null,
  });
  return status === "PUBLISHED"
    ? { status: "published", postId, tokensUsed }
    : { status: "pending", postId, tokensUsed };
}

// One Field assignment: which Field, and how the paper came to be filed under it.
export type FieldAssignment = { boardId: string; assignedBy: FieldAssignmentSource };

async function insertCandidate(
  candidate: CombineCandidate,
  fields: FieldAssignment[],
  authorId: string,
  status: PostStatus,
  signal: { reliability: ReliabilityStatus; reviewReason: string | null },
): Promise<{ postId: string; tokensUsed: { inputTokens: number; outputTokens: number } }> {
  const abstract = truncate(candidate.abstract!, 2000);

  const post = await prisma.post.create({
    data: {
      title: candidate.title,
      authors: candidate.authors,
      field: candidate.journal ?? undefined,
      year: candidate.year ?? undefined,
      abstract,
      externalUrl: candidate.url || null,
      citationCount: candidate.citationCount,
      language: candidate.language ?? null,
      authorId,
      fields: {
        create: fields.map((f) => ({ boardId: f.boardId, assignedBy: f.assignedBy })),
      },
      source: "COMBINE",
      sourceName: candidate.sourceName,
      status,
      doi: candidate.doi,
      issn: candidate.issn,
      workType: candidate.workType ?? null,
      reliability: signal.reliability,
      reviewReason: signal.reviewReason,
    },
  });

  // Someone may already have hit "Chew on this" on this paper from live search, which
  // stores a DOI-keyed explainer with no post attached. Adopt it rather than paying for
  // an identical second generation.
  if (candidate.doi) {
    const orphaned = await prisma.researchExplainer.findUnique({
      where: { doi: candidate.doi },
      select: { id: true, postId: true },
    });
    if (orphaned && !orphaned.postId) {
      await prisma.researchExplainer.update({
        where: { id: orphaned.id },
        data: { postId: post.id },
      });
      if (status === "PUBLISHED") {
        for (const f of fields) await maybePromoteField(f.boardId);
      }
      return { postId: post.id, tokensUsed: { inputTokens: 0, outputTokens: 0 } };
    }
  }

  const { explainer, isDemo, usage } = await generateExplainer({
    title: candidate.title,
    authors: candidate.authors,
    field: candidate.journal ?? "Research",
    abstract,
  });

  await prisma.researchExplainer.create({
    data: {
      postId: post.id,
      doi: candidate.doi,
      tldr: explainer.tldr,
      summary: explainer.summary,
      keyFindingsJson: JSON.stringify(explainer.keyFindings),
      termsJson: JSON.stringify(explainer.terms),
      quizJson: JSON.stringify(explainer.quiz),
      isDemo,
    },
  });

  if (status === "PUBLISHED") {
    for (const f of fields) await maybePromoteField(f.boardId);
  }

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
