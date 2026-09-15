import type { ReliabilityStatus } from "@prisma/client";

// The Field-Tested state machine, kept in a plain module rather than beside the component.
// components/FieldTested.tsx is "use client", and a server component calling a function
// exported from a client module fails at runtime — only components cross that boundary,
// not plain functions. The cards are server-rendered, so this lives here.

export type FieldTestedState =
  | "TESTED"
  | "PARTIAL"
  | "UNCHECKED"
  /** Checks ran, nothing vouched, nothing was wrong. The unified classifier's middle tier. */
  | "UNVERIFIED"
  | "FLAGGED"
  | "PREPRINT";

export type FieldTestedBreakdown = {
  /** null when nothing has told us either way. */
  peerReviewed: boolean | null;
  doajListed: boolean | null;
  retracted: boolean;
  /** False for live results, which haven't been through the retraction check yet. */
  retractionChecked: boolean;
  citationCount: number | null;
};

export function fieldTestedState(input: {
  reliability: ReliabilityStatus;
  retracted: boolean;
}): FieldTestedState {
  if (input.retracted || input.reliability === "FLAGGED") return "FLAGGED";
  if (input.reliability === "PREPRINT") return "PREPRINT";
  if (input.reliability === "PEER_REVIEWED_LISTED") return "TESTED";
  if (input.reliability === "PEER_REVIEWED") return "PARTIAL";
  return "UNCHECKED";
}
