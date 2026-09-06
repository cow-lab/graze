import { classifyWork } from "@/lib/combine/reliability";
import { isJournalAllowlisted } from "@/lib/combine/allowlist";
import { isDoiRetracted, journalRetractionProfile } from "@/lib/combine/retractionWatch";
import type { FieldTestedBreakdown, FieldTestedState } from "@/lib/fieldTested";
import type { LiveSearchResult } from "@/lib/liveSearch";

// Discover is where Graze promises "checked" research — showing every live result as
// "Not yet checked" until someone happens to click "Add to Graze" undersells the one thing
// the product is for. So a live result gets run through the exact same reliability policy
// The Combine applies at import time (lib/combine/reliability.ts): peer-review
// classification from the publisher's own work type, the per-DOI retraction lookup, the
// DOAJ allowlist, and the journal's retraction profile.
//
// This is read-only and mirrors assessCandidate's branches exactly, so the badge shown here
// matches what the paper's `reliability` will actually be set to if someone adds it —
// nothing here writes to the database or decides whether a paper CAN be added; that
// insertion policy (what happens with a non-allowlisted journal, in particular) still
// belongs to promoteCandidate, decided fresh at that point.
export type LiveFieldTested = { state: FieldTestedState; breakdown: FieldTestedBreakdown };

export async function assessLiveResult(result: LiveSearchResult): Promise<LiveFieldTested> {
  const kind = classifyWork({ workType: result.workType });
  const citationCount = result.citationCount;

  if (kind === "preprint") {
    return {
      state: "PREPRINT",
      breakdown: {
        peerReviewed: false,
        doajListed: null,
        retracted: false,
        retractionChecked: false,
        citationCount,
      },
    };
  }

  const [retracted, allowlisted, profile] = await Promise.all([
    result.doi ? isDoiRetracted(result.doi) : Promise.resolve(false),
    isJournalAllowlisted({ issn: result.issn, journal: result.venue }),
    journalRetractionProfile(result.issn),
  ]);

  const peerReviewed = kind === "peer-reviewed" ? true : null;
  const doajListed = allowlisted ? true : null;

  let state: FieldTestedState;
  if (retracted) {
    state = "FLAGGED";
  } else if (allowlisted && profile.isOutlier) {
    state = "FLAGGED";
  } else if (allowlisted) {
    state = kind === "peer-reviewed" ? "TESTED" : "PARTIAL";
  } else if (profile.isOutlier) {
    state = "FLAGGED";
  } else {
    state = "PARTIAL";
  }

  return {
    state,
    breakdown: {
      peerReviewed,
      doajListed,
      retracted,
      retractionChecked: !!result.doi,
      citationCount,
    },
  };
}

export async function assessLiveResults(results: LiveSearchResult[]): Promise<LiveFieldTested[]> {
  return Promise.all(results.map(assessLiveResult));
}
