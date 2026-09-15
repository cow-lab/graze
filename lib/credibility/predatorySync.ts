import { prisma } from "@/lib/prisma";
import { fetchDoajJournal } from "@/lib/credibility/sources/doajJournal";
import { isIndexedInMedline } from "@/lib/credibility/sources/medline";
import {
  fetchPredatoryList,
  normalizeName,
  PREDATORY_LIST_SOURCE,
  PREDATORY_LIST_URL,
  type PredatoryEntry,
} from "@/lib/credibility/sources/predatoryList";

// Keeping the predatory list current, automatically, without letting a bad fetch quietly
// change what gets hidden from readers.
//
// This flags journals — the most consequential thing the credibility system does, since a
// hard flag suppresses a result from the default list. So the failure mode that matters
// isn't "the sync errored", which is visible; it's "the sync succeeded against garbage",
// which isn't. The rails below exist for that case, and every run is recorded whether it
// applied or not, so a refusal shows up in the admin page rather than in a log nobody reads.

/** Below this, assume the fetch or the parser is broken rather than that the list shrank. */
const MIN_PLAUSIBLE_JOURNALS = 1500;
const MIN_PLAUSIBLE_PUBLISHERS = 700;
/** A real edit session adds or removes tens of entries, not thousands. */
const MAX_PLAUSIBLE_DELTA_FRACTION = 0.25;

export type SyncOutcome = {
  ok: boolean;
  journalCount: number;
  publisherCount: number;
  delta: number;
  message: string;
  applied: boolean;
};

export async function syncPredatoryList(opts: { force?: boolean } = {}): Promise<SyncOutcome> {
  const previousTotal = await prisma.predatoryListEntry.count();

  let fetched: { journals: PredatoryEntry[]; publishers: PredatoryEntry[] };
  try {
    fetched = await fetchPredatoryList();
  } catch (error) {
    return record({
      ok: false,
      journalCount: 0,
      publisherCount: 0,
      delta: 0,
      applied: false,
      message: `Fetch failed, nothing changed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  const { journals, publishers } = fetched;
  const total = journals.length + publishers.length;
  const delta = total - previousTotal;

  // ── Rails ───────────────────────────────────────────────────────────────────────────
  if (journals.length < MIN_PLAUSIBLE_JOURNALS || publishers.length < MIN_PLAUSIBLE_PUBLISHERS) {
    return record({
      ok: false,
      journalCount: journals.length,
      publisherCount: publishers.length,
      delta,
      applied: false,
      message: `Refused: parsed ${journals.length} journals and ${publishers.length} publishers, below the plausible floor (${MIN_PLAUSIBLE_JOURNALS}/${MIN_PLAUSIBLE_PUBLISHERS}). The sheet format has probably changed. Nothing was written.`,
    });
  }

  if (previousTotal > 0 && !opts.force) {
    const fraction = Math.abs(delta) / previousTotal;
    if (fraction > MAX_PLAUSIBLE_DELTA_FRACTION) {
      return record({
        ok: false,
        journalCount: journals.length,
        publisherCount: publishers.length,
        delta,
        applied: false,
        message: `Refused: entry count moved by ${(fraction * 100).toFixed(0)}% (${delta > 0 ? "+" : ""}${delta}), beyond the ${MAX_PLAUSIBLE_DELTA_FRACTION * 100}% limit. Re-run with force to accept it after checking the list yourself.`,
      });
    }
  }

  // ── Apply ───────────────────────────────────────────────────────────────────────────
  const entries = [...journals, ...publishers];
  await prisma.$transaction([
    prisma.predatoryListEntry.deleteMany({}),
    prisma.predatoryListEntry.createMany({ data: entries }),
  ]);

  const applied = await applyFlags();

  return record({
    ok: true,
    journalCount: journals.length,
    publisherCount: publishers.length,
    delta,
    applied: true,
    message: `Synced ${journals.length} journals and ${publishers.length} publishers (${delta >= 0 ? "+" : ""}${delta}). ${applied.hard} hard flags, ${applied.caution} sent for review.`,
  });
}

/**
 * Match known journals against the freshly synced list.
 *
 * Only journals already in JournalCredibility are checked — the list is keyed by name and
 * we are keyed by ISSN, so this is the set where a name can actually be resolved to one
 * journal. Anything matched at search time goes through the same function.
 */
async function applyFlags(): Promise<{ hard: number; caution: number }> {
  const journals = await prisma.journalCredibility.findMany({
    select: { issn: true, title: true, publisher: true, inDoaj: true, inMedline: true, inScopus: true, inWebOfScience: true },
  });

  let hard = 0;
  let caution = 0;

  for (const journal of journals) {
    const verdict = await matchJournal(journal);
    if (!verdict) continue;

    await prisma.journalFlag.upsert({
      where: {
        issn_source_kind: { issn: journal.issn, source: PREDATORY_LIST_SOURCE, kind: "PREDATORY_LIST" },
      },
      update: { severity: verdict.severity, note: verdict.note, evidenceUrl: PREDATORY_LIST_URL },
      create: {
        issn: journal.issn,
        kind: "PREDATORY_LIST",
        severity: verdict.severity,
        source: PREDATORY_LIST_SOURCE,
        evidenceUrl: PREDATORY_LIST_URL,
        note: verdict.note,
      },
    });
    if (verdict.severity === "EXCLUDE") hard++;
    else caution++;
  }

  return { hard, caution };
}

type JournalLike = {
  issn?: string;
  title: string | null;
  publisher: string | null;
  inDoaj: boolean | null;
  inMedline: boolean | null;
  inScopus: boolean | null;
  inWebOfScience: boolean | null;
};

export type MatchVerdict = { severity: "EXCLUDE" | "CAUTION"; note: string };

/**
 * Decide what a predatory-list match means for one journal.
 *
 * Returns null when there's no match at all. The two downgrade paths — an ambiguous name,
 * and a conflict with an index that vouches for the journal — are the whole point: both
 * produce CAUTION, which withholds VERIFIED and asks for a human look, rather than
 * suppressing a result on evidence that can't carry that weight.
 */
export async function matchJournal(journal: JournalLike): Promise<MatchVerdict | null> {
  const indexedBy = [
    journal.inDoaj && "DOAJ",
    journal.inMedline && "MEDLINE",
    journal.inScopus && "Scopus",
    journal.inWebOfScience && "Web of Science",
  ].filter((x): x is string => !!x);

  const byName = journal.title
    ? await prisma.predatoryListEntry.findUnique({
        where: { kind_normalized: { kind: "JOURNAL", normalized: normalizeName(journal.title) } },
      })
    : null;

  const byPublisher = journal.publisher
    ? await prisma.predatoryListEntry.findUnique({
        where: { kind_normalized: { kind: "PUBLISHER", normalized: normalizeName(journal.publisher) } },
      })
    : null;

  const hit = byName ?? byPublisher;
  if (!hit) return null;

  const what = hit.kind === "JOURNAL" ? "This journal" : `Its publisher, ${hit.name},`;

  // Before suppressing anything, make sure "no index vouches for this" is a finding rather
  // than a gap in our data. The fast search path only fills in what OpenAlex's bulk call
  // returns, so inMedline is almost always null and inDoaj is often null — and null means
  // "not checked", not "not listed".
  //
  // This is not hypothetical. Treating unchecked as absent hard-flagged IJERPH, a journal
  // with tens of thousands of papers: DOAJ genuinely doesn't list it, but it is indexed in
  // MEDLINE, which we had simply never asked about. Suppressing every paper in a
  // PubMed-indexed journal on a contested name match is exactly the failure this whole
  // design is meant to prevent. Only runs for the handful of journals a match would
  // otherwise suppress, so the cost is a few lookups.
  if (indexedBy.length === 0 && journal.issn) {
    const checks: Promise<string | null>[] = [];
    if (journal.inDoaj == null) {
      checks.push(fetchDoajJournal(journal.issn).then((r) => (r ? "DOAJ" : null)));
    }
    if (journal.inMedline == null) {
      checks.push(isIndexedInMedline(journal.issn).then((r) => (r ? "MEDLINE" : null)));
    }
    if (checks.length > 0) {
      try {
        for (const name of await Promise.all(checks)) if (name) indexedBy.push(name);
      } catch {
        // Couldn't check. Not being able to confirm is the definition of not being
        // confident enough to suppress, so hold it for review instead of guessing.
        return {
          severity: "CAUTION",
          note: `${what} appears on the ${PREDATORY_LIST_SOURCE} list. We couldn't reach the indexes to check whether one of them also lists it, so this is held for review rather than acted on.`,
        };
      }
    }
  }

  if (indexedBy.length > 0) {
    return {
      severity: "CAUTION",
      note: `${what} appears on the ${PREDATORY_LIST_SOURCE} list, but the journal is also listed in ${indexedBy.join(" and ")}. Two sources disagree, so this is held for a person to look at rather than resolved automatically.`,
    };
  }

  if (hit.ambiguous) {
    return {
      severity: "CAUTION",
      note: `${what} matches "${hit.name}" on the ${PREDATORY_LIST_SOURCE} list, but that name is generic enough that it may be a different publication. Held for review rather than treated as confirmed.`,
    };
  }

  return {
    severity: "EXCLUDE",
    note: `${what} appears on the ${PREDATORY_LIST_SOURCE} list as "${hit.name}".`,
  };
}

async function record(outcome: Omit<SyncOutcome, "ok"> & { ok: boolean }): Promise<SyncOutcome> {
  await prisma.predatoryListSync.create({
    data: {
      ok: outcome.ok,
      journalCount: outcome.journalCount,
      publisherCount: outcome.publisherCount,
      delta: outcome.delta,
      message: outcome.message,
    },
  });
  return outcome;
}
