import type { JournalCredibility, JournalFlag } from "@prisma/client";
import { BROAD_SCOPE_THRESHOLD } from "@/lib/credibility/scope";

// Turns the stored facts into what a reader sees. A pure function on purpose: every branch
// is a rule written down in advance, and the same inputs always produce the same badge.
//
// The rule that shapes the rest: absence of evidence is not evidence. "We couldn't find
// this journal in the indexes we check" is a statement about our coverage as much as about
// the journal — Nature isn't in DOAJ, and a good law review isn't in MEDLINE. It is never
// rendered as an accusation, and it never hides a result.

export type CredibilityTier = "INDEXED" | "UNVERIFIED" | "CAUTION" | "EXCLUDED" | "UNKNOWN";

export type IndexState = { name: string; state: "in" | "absent" | "unchecked"; why: string };
export type CredibilityNote = { label: string; tone: "good" | "neutral" | "warn" };

export type Assessment = {
  tier: CredibilityTier;
  /** One short line for the badge. */
  headline: string;
  indexes: IndexState[];
  notes: CredibilityNote[];
  flags: Pick<JournalFlag, "source" | "kind" | "note" | "evidenceUrl" | "severity">[];
};

type Input =
  | (JournalCredibility & { flags: JournalFlag[] })
  | null
  | undefined;

const INDEX_LABELS: { key: keyof JournalCredibility; name: string; why: string }[] = [
  { key: "inDoaj", name: "DOAJ", why: "Directory of Open Access Journals — only lists open-access journals, so a subscription journal is absent by definition." },
  { key: "inMedline", name: "MEDLINE", why: "Selected by NLM's review committee — biomedical only, so journals in other fields are absent by definition." },
  { key: "inScopus", name: "Scopus", why: "Elsevier's index. Checking it needs a paid key, which this deployment doesn't have set." },
  { key: "inWebOfScience", name: "Web of Science", why: "Clarivate's index. Checking it needs a paid key, which this deployment doesn't have set." },
];

export function assess(record: Input): Assessment {
  if (!record) {
    return {
      tier: "UNKNOWN",
      headline: "Journal not identified",
      indexes: [],
      // No note here: the plain-language line in the panel already says exactly this, and
      // repeating it under "About this journal" reads like two different findings.
      notes: [],
      flags: [],
    };
  }

  const indexes: IndexState[] = INDEX_LABELS.map(({ key, name, why }) => {
    const value = record[key] as boolean | null;
    return { name, state: value === true ? "in" : value === false ? "absent" : "unchecked", why };
  });

  const listedIn = indexes.filter((index) => index.state === "in").map((index) => index.name);
  const checkedAny = indexes.some((index) => index.state !== "unchecked");

  const excluding = record.flags.filter((flag) => flag.severity === "EXCLUDE");
  const cautioning = record.flags.filter((flag) => flag.severity === "CAUTION");

  const notes: CredibilityNote[] = [];

  // --- Transparency ---
  if (record.apcUsd != null) {
    notes.push({
      label: `Publishes its article fee: $${record.apcUsd.toLocaleString()}`,
      tone: "good",
    });
  } else {
    notes.push({
      label: "No article fee published in the sources we read — which may mean there's no fee, or that it isn't disclosed up front",
      tone: "neutral",
    });
  }
  if (record.reviewProcess) {
    notes.push({ label: `Review process: ${record.reviewProcess}`, tone: "good" });
  }
  if (record.publicationTimeWeeks != null) {
    // Peer review that finishes in under a fortnight is the single most cited red flag for
    // a paper mill, so it's called out — as the journal's own published figure.
    notes.push({
      label: `Says it publishes in about ${record.publicationTimeWeeks} weeks${
        record.publicationTimeWeeks <= 2 ? " — unusually fast for peer review" : ""
      }`,
      tone: record.publicationTimeWeeks <= 2 ? "warn" : "neutral",
    });
  }

  // --- Citation signals, as context rather than a bar to clear ---
  if (record.meanCitedness != null) {
    notes.push(
      record.meanCitedness === 0
        ? { label: "Papers in this journal are almost never cited by other work", tone: "warn" }
        : {
            label: `Papers here are cited ${record.meanCitedness.toFixed(1)} times on average in their first two years`,
            tone: "neutral",
          },
    );
  }
  if (record.retractions != null && record.retractions > 0) {
    // A big journal's handful of retractions rounds to 0.00%, and printing that reads as
    // false precision — the share is only worth showing when it's large enough to mean
    // something.
    const rate = record.retractionRate ?? 0;
    const share = rate >= 0.0001 ? ` (${(rate * 100).toFixed(2)}% of published work)` : "";
    notes.push({
      label: `${record.retractions} retractions on record${share}`,
      tone: rate >= 0.005 ? "warn" : "neutral",
    });
  }

  // --- The naming pattern, which only earns a mention when nothing vouched for the journal ---
  const unverified = checkedAny && listedIn.length === 0;
  if (unverified && (record.broadScopeScore ?? 0) >= BROAD_SCOPE_THRESHOLD) {
    notes.push({
      label:
        "The journal's title claims an unusually broad scope, a pattern common among low-quality publishers",
      tone: "warn",
    });
  }

  if (excluding.length > 0) {
    return {
      tier: "EXCLUDED",
      headline: `Flagged by ${excluding[0].source}`,
      indexes,
      notes,
      flags: record.flags,
    };
  }
  if (cautioning.length > 0) {
    return {
      tier: "CAUTION",
      headline: `Flagged by ${cautioning[0].source}`,
      indexes,
      notes,
      flags: record.flags,
    };
  }
  if (listedIn.length > 0) {
    return {
      tier: "INDEXED",
      headline: `Indexed in ${listedIn.join(" · ")}`,
      indexes,
      notes,
      flags: [],
    };
  }
  if (unverified) {
    return {
      tier: "UNVERIFIED",
      headline: "Not found in the indexes we check",
      indexes,
      notes,
      flags: [],
    };
  }
  return { tier: "UNKNOWN", headline: "Journal not yet checked", indexes, notes, flags: [] };
}
