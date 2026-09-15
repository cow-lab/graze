import type { Classification } from "@/lib/credibility/classify";

// Credibility as a ranking input, not just a badge.
//
// Until now `assessMany` was called in exactly one place — to draw badges on results that
// were rendered in whatever order OpenAlex returned them. Nothing moved, nothing was held
// back. That made credibility a decoration on search rather than part of it.
//
// What this does, and deliberately does not do:
//
//   - FLAGGED results are held back from the default list. Not deleted, not silently
//     dropped: the caller is told how many were held and can ask for them.
//   - VERIFIED work that is under-cited relative to the rest of the page moves up. This is
//     the "surface underused research" mechanic, and it is the only place a citation count
//     is allowed to influence anything.
//   - UNVERIFIED results are never penalised. They are the ordinary case for a new,
//     niche or non-open-access journal, and burying them would punish exactly the work
//     Graze exists to surface.
//
// The movement is bounded on purpose. OpenAlex's relevance ordering is the product of a
// real ranking system over the full corpus; this reorders within a page it already chose.
// A paper can climb, but it cannot climb past results that are far more relevant — someone
// searching for the canonical paper on a topic should still find it near the top.

/** Positions a result may gain at most. On a 20-result page this is a visible but bounded move. */
const MAX_SHIFT = 6;
/** Credit for being VERIFIED at all, before any under-use adjustment. */
const VERIFIED_CREDIT = 1.5;
/** Additional credit for a VERIFIED paper cited far less than its page peers. */
const UNDERUSE_CREDIT = 4.5;

export type Rankable<T> = {
  item: T;
  classification: Classification;
  citationCount: number | null;
};

export type RankedResults<T> = {
  /** In display order, flagged results removed unless `includeFlagged`. */
  results: T[];
  /** How many were held back. Zero when `includeFlagged` is set. */
  flaggedHeld: number;
  /** Per-item explanation of why it moved, keyed by its index in the returned list. */
  movements: RankMovement[];
};

export type RankMovement = {
  from: number;
  to: number;
  reason: string | null;
};

/**
 * Reorders one page of search results.
 *
 * `input` must arrive in the upstream relevance order — position in the array *is* the
 * relevance signal, since OpenAlex doesn't hand back a comparable score.
 */
export function rankByCredibility<T>(
  input: Rankable<T>[],
  opts: { includeFlagged?: boolean } = {},
): RankedResults<T> {
  const kept = opts.includeFlagged
    ? input
    : input.filter((entry) => entry.classification.tier !== "FLAGGED");
  const flaggedHeld = input.length - kept.length;

  // Compare each result against the page it appears on rather than a global constant. A
  // page of recent preprints and a page of decades-old classics have completely different
  // citation scales, and a fixed threshold would call one of them uniformly under-used.
  const counts = kept
    .map((entry) => entry.citationCount)
    .filter((count): count is number => count != null && count > 0)
    .sort((a, b) => a - b);
  const median = counts.length > 0 ? counts[Math.floor(counts.length / 2)] : null;

  const scored = kept.map((entry, position) => {
    let shift = 0;
    let reason: string | null = null;

    if (entry.classification.tier === "VERIFIED") {
      shift += VERIFIED_CREDIT;
      reason = "Checks passed";

      if (median != null && median > 0) {
        const count = entry.citationCount ?? 0;
        // How far below the page's median this sits, as a 0–1 fraction. A paper with no
        // citations on a page whose median is 100 scores 1; one at the median scores 0.
        const underuse = Math.max(0, Math.min(1, (median - count) / median));
        if (underuse > 0) {
          shift += UNDERUSE_CREDIT * underuse;
          reason = "Checks passed, and cited less than others on this page";
        }
      }
    }

    shift = Math.min(shift, MAX_SHIFT);
    return { entry, position, shift, adjusted: position - shift, reason };
  });

  // Sort by adjusted position, falling back to the original order so the sort is stable
  // and two results that moved by the same amount keep their relevance ordering.
  scored.sort((a, b) => a.adjusted - b.adjusted || a.position - b.position);

  return {
    results: scored.map((s) => s.entry.item),
    flaggedHeld,
    movements: scored.map((s, index) => ({
      from: s.position,
      to: index,
      reason: index < s.position ? s.reason : null,
    })),
  };
}
