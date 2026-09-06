import type { ReliabilityStatus } from "@prisma/client";
import type { CombineCandidate } from "@/lib/combine/types";
import { isJournalAllowlisted } from "@/lib/combine/allowlist";
import {
  isDoiRetracted,
  journalRetractionProfile,
  describeProfile,
} from "@/lib/combine/retractionWatch";

// The policy layer: takes the checkable facts (work type, DOAJ listing, Retraction Watch
// records) and decides what happens to a candidate. Every branch here is a rule stated in
// advance — nothing weighs the facts against each other on the fly, and nothing asks a
// model what it thinks of the paper.
//
// The one rule that governs the rest: when two independent sources disagree about a
// journal, this does not pick a winner. It routes the paper to a person.

// Crossref/OpenAlex work types that mean "this went through peer review". Everything the
// automated import publishes has to be one of these.
const PEER_REVIEWED_TYPES = new Set(["journal-article", "article", "proceedings-article"]);
// Types that explicitly mean "not yet peer reviewed".
const PREPRINT_TYPES = new Set(["posted-content", "preprint"]);

export type WorkKind = "peer-reviewed" | "preprint" | "unknown";

// `version` is the preprint/published hint the sources already carried (OpenAlex location
// versions, Crossref posted-content); `workType` is the type field this addendum adds. The
// type field wins when both are present — it's the publisher's own declaration.
export function classifyWork(candidate: {
  workType?: string | null;
  version?: "preprint" | "published" | null;
}): WorkKind {
  const type = candidate.workType?.toLowerCase().trim();
  if (type && PREPRINT_TYPES.has(type)) return "preprint";
  if (type && PEER_REVIEWED_TYPES.has(type)) return "peer-reviewed";
  if (candidate.version === "preprint") return "preprint";
  if (candidate.version === "published") return "peer-reviewed";
  return "unknown";
}

export type ReliabilityDecision =
  | { outcome: "reject"; reason: "retracted" | "not-peer-reviewed" | "not-allowlisted" }
  | { outcome: "publish"; reliability: ReliabilityStatus }
  | { outcome: "review"; reliability: ReliabilityStatus; reviewReason: string };

export async function assessCandidate(
  candidate: CombineCandidate,
  // True for a paper a person specifically chose from live search. It changes what happens
  // to a near miss — a queue entry rather than a silent drop — but never lowers the bar for
  // what publishes automatically.
  opts: { humanChose: boolean },
): Promise<ReliabilityDecision> {
  const kind = classifyWork(candidate);

  // 1. Already retracted. Checked before anything else and never overridable: a paper known
  //    to be withdrawn has no business entering the library, whoever asked for it.
  if (candidate.doi && (await isDoiRetracted(candidate.doi))) {
    return { outcome: "reject", reason: "retracted" };
  }

  // 2. Peer-review status. The curated library is meant to mean something; a preprint that
  //    nobody has reviewed doesn't get folded into it silently. It stays fully readable
  //    through live search, labelled as what it is.
  if (kind === "preprint") {
    if (!opts.humanChose) return { outcome: "reject", reason: "not-peer-reviewed" };
    return {
      outcome: "review",
      reliability: "PREPRINT",
      reviewReason:
        "Preprint — not yet peer reviewed. Someone chose it from live search, so it's here rather than dropped.",
    };
  }

  // 3. The two independent journal checks, run together.
  const [allowlisted, profile] = await Promise.all([
    isJournalAllowlisted({ issn: candidate.issn, journal: candidate.journal }),
    journalRetractionProfile(candidate.issn),
  ]);

  // 4. Sources disagree: DOAJ vets this journal, Retraction Watch shows it as a retraction
  //    outlier. Both are legitimate sources and this code has no basis for overruling
  //    either, so it doesn't try.
  if (allowlisted && profile.isOutlier) {
    return {
      outcome: "review",
      reliability: "FLAGGED",
      reviewReason: `Sources disagree: DOAJ lists this journal, but Retraction Watch shows ${describeProfile(
        profile,
      )} — an outlier. Needs a human call.`,
    };
  }

  if (allowlisted) {
    // The only path that publishes without a person: peer-reviewed type, DOAJ-listed
    // journal, no retraction against the paper or an outlying history behind the journal.
    return {
      outcome: "publish",
      reliability: kind === "unknown" ? "PEER_REVIEWED" : "PEER_REVIEWED_LISTED",
    };
  }

  // 5. Not DOAJ-listed. Automated ingestion drops it; a paper a person picked goes to the
  //    queue, with the retraction history attached if there is any.
  if (!opts.humanChose) return { outcome: "reject", reason: "not-allowlisted" };

  return {
    outcome: "review",
    reliability: profile.isOutlier ? "FLAGGED" : "PEER_REVIEWED",
    reviewReason: profile.isOutlier
      ? `Journal isn't DOAJ-listed, and Retraction Watch shows ${describeProfile(profile)} — an outlier.`
      : "Journal isn't DOAJ-listed. No retraction history against it; needs a look before it joins the library.",
  };
}
