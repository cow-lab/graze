import type { JournalCredibility, JournalFlag } from "@prisma/client";
import { BROAD_SCOPE_THRESHOLD } from "@/lib/credibility/scope";

// The single credibility classifier.
//
// This replaces two overlapping vocabularies — the journal-level tier in assess.ts and the
// paper-level state in fieldTested.ts — which were computed independently from overlapping
// facts and could therefore disagree about the same paper. There is now one function, one
// set of rules, and one answer that both the badge and the search ranking read.
//
// Three properties it has to keep:
//
//   1. It is pure. Every branch is a rule written down in advance; the same facts always
//      produce the same tier. Nothing here asks a model what it thinks of a paper.
//   2. Absence of evidence is never evidence. "Not found in the indexes we check" is a
//      statement about our coverage as much as about the journal — Nature isn't in DOAJ,
//      and a good law review isn't in MEDLINE. It produces UNVERIFIED, which is a neutral
//      tier, never FLAGGED and never suppressed.
//   3. Every tier comes with the specific signals that produced it, in plain language.
//      A classification nobody can inspect is a black-box score with extra steps.

export type CredibilityTier = "VERIFIED" | "UNVERIFIED" | "FLAGGED";

/**
 * How much weight a signal is allowed to carry.
 *
 * 1 — can force FLAGGED on its own, regardless of everything else.
 * 2 — moves a paper between VERIFIED and UNVERIFIED. Can never reach FLAGGED alone.
 * 3 — context for the reader and an input to ranking. Never changes the tier at all.
 *
 * The split exists so that a low citation count can never make a paper look disreputable,
 * which would defeat the point of surfacing good but underused research.
 */
export type SignalWeight = 1 | 2 | 3;

export type Signal = {
  /** Stable key, for ranking and tests — not shown to readers. */
  id: string;
  weight: SignalWeight;
  direction: "positive" | "negative" | "neutral";
  /** What fired, in plain language. Shown to the reader. */
  label: string;
  /** What the check actually covers, including its limits. */
  detail?: string;
  source: string;
  evidenceUrl?: string | null;
};

export type Classification = {
  tier: CredibilityTier;
  /**
   * Orthogonal to the tier. A preprint hasn't been through peer review, so it can't be
   * VERIFIED — but it isn't UNVERIFIED in the "we couldn't check" sense either, and it is
   * certainly not FLAGGED. The UI needs both facts to say something honest.
   */
  isPreprint: boolean;
  signals: Signal[];
  /** The weight-1 signal that forced FLAGGED, when one did. */
  decisive: Signal | null;
};

export type PaperFacts = {
  workKind: "peer-reviewed" | "preprint" | "unknown";
  /** null means the check hasn't run — which is not the same as "clean". */
  retracted: boolean | null;
  citationCount: number | null;
  /** False only when sources positively disagree about this DOI, not when unchecked. */
  metadataConsistent?: boolean | null;
  /** Author verification, from the ORCID and ROR ids OpenAlex embeds. Omit when unknown. */
  authors?: { total: number; withOrcid: number; withRor: number };
};

export type JournalFacts = (JournalCredibility & { flags: JournalFlag[] }) | null;

/**
 * Journal-level flags that hard-flag a paper, *when their severity says they're confirmed*.
 *
 * A PREDATORY_LIST flag at CAUTION is deliberately not one of these: the sync downgrades a
 * match to CAUTION when the listed name is too generic to identify one journal, or when a
 * reputable index vouches for the journal and the two sources therefore disagree. Those are
 * held for a person to look at, not used to hide a result.
 */
const HARD_FLAG_KINDS = new Set<JournalFlag["kind"]>(["PREDATORY_LIST", "HIJACKED"]);

function isConfirmedHardFlag(flag: JournalFlag): boolean {
  if (flag.severity === "EXCLUDE") return true;
  return HARD_FLAG_KINDS.has(flag.kind) && flag.severity !== "CAUTION";
}

export function classify(paper: PaperFacts, journal: JournalFacts): Classification {
  const signals: Signal[] = [];
  let decisive: Signal | null = null;

  const isPreprint = paper.workKind === "preprint";

  // ── Weight 1 — can force FLAGGED on its own ──────────────────────────────────────────

  if (paper.retracted === true) {
    const signal: Signal = {
      id: "crossref.retracted",
      weight: 1,
      direction: "negative",
      label: "This paper has been retracted",
      detail:
        "A retraction notice for this DOI exists in the Retraction Watch records Crossref distributes. A retracted paper has been withdrawn by its journal or authors.",
      source: "Crossref",
    };
    signals.push(signal);
    decisive ??= signal;
  } else if (paper.retracted === false) {
    signals.push({
      id: "crossref.not-retracted",
      weight: 1,
      direction: "positive",
      label: "No retraction found in Crossref",
      detail:
        "Checked against the Retraction Watch records Crossref distributes. This covers retractions those records know about — it is not a guarantee that no concern exists.",
      source: "Crossref",
    });
  }

  for (const flag of journal?.flags ?? []) {
    if (isConfirmedHardFlag(flag)) {
      const signal: Signal = {
        id: `flag.${flag.kind.toLowerCase()}`,
        weight: 1,
        direction: "negative",
        label:
          flag.kind === "PREDATORY_LIST"
            ? "This journal appears on a predatory-publisher list"
            : flag.kind === "HIJACKED"
              ? "This journal has been reported as hijacked — a fake site impersonating a real journal"
              : "This journal has been flagged by an operator review",
        detail: flag.note ?? undefined,
        source: flag.source,
        evidenceUrl: flag.evidenceUrl,
      };
      signals.push(signal);
      decisive ??= signal;
    }
  }

  if (paper.metadataConsistent === false) {
    const signal: Signal = {
      id: "metadata.inconsistent",
      weight: 1,
      direction: "negative",
      label: "Sources disagree about this paper's basic details",
      detail:
        "The journal, title or publication details recorded for this DOI differ between sources, which can indicate a hijacked journal or a fabricated record.",
      source: "Crossref / OpenAlex",
    };
    signals.push(signal);
    decisive ??= signal;
  }

  // ── Weight 2 — moves between VERIFIED and UNVERIFIED, never to FLAGGED ───────────────

  const listedIn: string[] = [];
  if (journal?.inDoaj === true) listedIn.push("DOAJ");
  if (journal?.inMedline === true) listedIn.push("MEDLINE");
  if (journal?.inScopus === true) listedIn.push("Scopus");
  if (journal?.inWebOfScience === true) listedIn.push("Web of Science");

  for (const name of listedIn) {
    signals.push({
      id: `index.${name.toLowerCase().replace(/\s+/g, "-")}`,
      weight: 2,
      direction: "positive",
      label: `Listed in ${name}`,
      detail: INDEX_DETAIL[name],
      source: name,
    });
  }

  if (journal && listedIn.length === 0) {
    signals.push({
      id: "index.none",
      weight: 2,
      direction: "neutral",
      label: "Not found in the indexes we check",
      detail:
        "This is a statement about our coverage as much as about the journal. We check DOAJ (open-access only) and MEDLINE (biomedical only), so plenty of good journals are absent by definition. It is not a mark against the work.",
      source: "Graze",
    });
  }

  if (paper.workKind === "peer-reviewed") {
    signals.push({
      id: "work.peer-reviewed",
      weight: 2,
      direction: "positive",
      label: "Published as a peer-reviewed article",
      detail: "From the publisher's own work type in Crossref or OpenAlex.",
      source: "Crossref / OpenAlex",
    });
  } else if (isPreprint) {
    signals.push({
      id: "work.preprint",
      weight: 2,
      direction: "neutral",
      label: "Preprint — posted before peer review",
      detail:
        "Not a failure state and not a lesser paper, just an earlier one. Plenty of important work appears as a preprint first.",
      source: "Crossref / OpenAlex",
    });
  }

  // A journal-level retraction rate is deliberately weight 2, not weight 1. It says
  // something about the journal's standards, but hard-flagging every paper in a journal
  // because of other papers' retractions would punish authors for their venue.
  for (const flag of journal?.flags ?? []) {
    if (!isConfirmedHardFlag(flag)) {
      signals.push({
        id: `flag.${flag.kind.toLowerCase()}`,
        weight: 2,
        direction: "negative",
        label:
          flag.kind === "PREDATORY_LIST"
            ? "This journal matches a predatory-publisher list, but the match is disputed"
            : flag.kind === "RETRACTION_OUTLIER"
            ? "This journal retracts papers far more often than average"
            : flag.kind === "REMOVED_FROM_INDEX"
              ? "This journal was removed from an index it used to be listed in"
              : "This journal carries an operator note",
        detail: flag.note ?? undefined,
        source: flag.source,
        evidenceUrl: flag.evidenceUrl,
      });
    }
  }

  if (journal?.apcUsd != null) {
    signals.push({
      id: "transparency.apc",
      weight: 2,
      direction: "positive",
      label: `Publishes its article fee: $${journal.apcUsd.toLocaleString()}`,
      detail: "Disclosing the fee up front is one of the things DOAJ checks for.",
      source: "DOAJ",
    });
  }
  if (journal?.reviewProcess) {
    signals.push({
      id: "transparency.review-process",
      weight: 2,
      direction: "positive",
      label: `Discloses its review process: ${journal.reviewProcess}`,
      source: "DOAJ",
    });
  }
  if (journal?.publicationTimeWeeks != null && journal.publicationTimeWeeks <= 2) {
    signals.push({
      id: "transparency.fast-publication",
      weight: 2,
      direction: "negative",
      label: `Says it publishes in about ${journal.publicationTimeWeeks} weeks — unusually fast for peer review`,
      detail: "The journal's own published figure. Very short turnarounds are a common pattern among paper mills.",
      source: "DOAJ",
    });
  }
  if (
    journal &&
    listedIn.length === 0 &&
    (journal.broadScopeScore ?? 0) >= BROAD_SCOPE_THRESHOLD
  ) {
    signals.push({
      id: "scope.implausibly-broad",
      weight: 2,
      direction: "negative",
      label: "The journal's title claims an unusually broad scope",
      detail:
        "A pattern common among low-quality publishers. Only mentioned because nothing else vouched for this journal.",
      source: "Graze",
    });
  }

  // Author verification. Positive when present, silent when absent — never negative.
  // ORCID launched in 2012, so a genuine 1998 paper has none, and penalising that would
  // punish age rather than quality. ROR presence means OpenAlex resolved the author's
  // stated affiliation to a registered organisation, not merely that a string was typed.
  if (paper.authors && paper.authors.total > 0) {
    const { total, withOrcid, withRor } = paper.authors;
    if (withOrcid > 0) {
      signals.push({
        id: "authors.orcid",
        weight: 2,
        direction: "positive",
        label:
          withOrcid === total
            ? `All ${total} authors have an ORCID iD`
            : `${withOrcid} of ${total} authors have an ORCID iD`,
        detail:
          "An ORCID iD is a persistent identifier a researcher registers for themselves. Having one doesn't vouch for the work, and plenty of real researchers — especially before 2012 — don't have one.",
        source: "ORCID via OpenAlex",
      });
    }
    if (withRor > 0) {
      signals.push({
        id: "authors.ror",
        weight: 2,
        direction: "positive",
        label:
          withRor === total
            ? `All ${total} authors list an institution in the Research Organization Registry`
            : `${withRor} of ${total} authors list an institution in the Research Organization Registry`,
        detail:
          "The stated affiliation resolves to a registered organisation rather than being an unmatched string. It confirms the institution exists — not that the person works there.",
        source: "ROR via OpenAlex",
      });
    }
  }

  // ── Weight 3 — context and ranking input only. Never changes the tier. ───────────────

  if (paper.citationCount != null) {
    signals.push({
      id: "citations.count",
      weight: 3,
      direction: "neutral",
      label: `Cited ${paper.citationCount.toLocaleString()} ${paper.citationCount === 1 ? "time" : "times"}`,
      detail:
        "How many other works cite this paper, per OpenAlex. A low count is normal for recent or specialised work and says nothing about quality.",
      source: "OpenAlex",
    });
  }

  // ── Tier ────────────────────────────────────────────────────────────────────────────

  if (decisive) {
    return { tier: "FLAGGED", isPreprint, signals, decisive: decisive };
  }

  // A weight-2 negative doesn't flag anything, but it does withhold VERIFIED: "listed in
  // DOAJ" and "retracts far more often than average" together is not a clean bill.
  const hasBlockingConcern = signals.some((s) => s.weight === 2 && s.direction === "negative");

  // VERIFIED used to require an index listing. Measured over 100 results from five real
  // queries, that made 75% of them UNVERIFIED for a single reason: not in DOAJ — and DOAJ
  // only covers open-access journals, so Nature, Science, Cell and every subscription
  // venue are excluded by definition, not by any finding about them. Calling a
  // peer-reviewed, non-retracted paper in one of those "unverified" was simply inaccurate,
  // and it made the tier useless: a label 90% of results carry tells a reader nothing.
  //
  // So VERIFIED now means what it should have meant all along — we checked, and what we
  // could check came back clean:
  //
  //   - the publisher records it as peer-reviewed, and
  //   - the retraction check actually ran and found nothing, and
  //   - at least one independent source corroborates the venue or the people, and
  //   - nothing we check raised a concern.
  //
  // Corroboration is deliberately satisfiable two ways. An index listing vouches for the
  // venue; an ORCID iD or a ROR-resolved affiliation vouches for the authors. Requiring
  // the venue route alone is what produced the artifact. Note this does not weaken the
  // FLAGGED path at all: a predatory-list match, a retraction or a hijacked journal is
  // weight 1 and overrides every one of these.
  const corroborated =
    listedIn.length > 0 ||
    (paper.authors ? paper.authors.withOrcid > 0 || paper.authors.withRor > 0 : false);
  const checkedClean = paper.retracted === false;
  const peerReviewed = paper.workKind === "peer-reviewed";

  if (peerReviewed && checkedClean && corroborated && !hasBlockingConcern) {
    return { tier: "VERIFIED", isPreprint, signals, decisive: null };
  }
  return { tier: "UNVERIFIED", isPreprint, signals, decisive: null };
}

const INDEX_DETAIL: Record<string, string> = {
  DOAJ: "The Directory of Open Access Journals vets peer-review practice, licensing and editorial governance before listing a journal. It only covers open-access journals, so absence isn't a mark against a paper.",
  MEDLINE:
    "Selected by the US National Library of Medicine's review committee. Biomedical only, so journals in other fields are absent by definition.",
  Scopus: "Elsevier's index, which applies its own selection criteria.",
  "Web of Science": "Clarivate's index, which applies its own selection criteria.",
};
