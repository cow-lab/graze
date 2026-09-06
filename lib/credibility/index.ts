import { prisma } from "@/lib/prisma";
import { fetchJournals } from "@/lib/credibility/sources/openalexSource";
import { fetchDoajJournal } from "@/lib/credibility/sources/doajJournal";
import { isIndexedInMedline } from "@/lib/credibility/sources/medline";
import {
  isIndexedInScopus,
  isIndexedInWebOfScience,
} from "@/lib/credibility/sources/subscriptionIndexes";
import { journalRetractionProfile } from "@/lib/combine/retractionWatch";
import { scopeBreadth } from "@/lib/credibility/scope";
import { assess, type Assessment } from "@/lib/credibility/assess";
import { captureError } from "@/lib/errorReporting";
import type { JournalCredibility } from "@prisma/client";

export type { Assessment, CredibilityTier } from "@/lib/credibility/assess";

// Journal facts change on the scale of months — a journal doesn't leave Scopus on a
// Tuesday — so a long TTL keeps a page of search results down to one upstream call.
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function isFresh(record: JournalCredibility): boolean {
  return Date.now() - record.checkedAt.getTime() < TTL_MS;
}

// The fast path, for a page of search results: whatever is already cached, plus one bulk
// OpenAlex call for the journals we've never seen. The slower per-journal sources (MEDLINE,
// DOAJ's full record) are deliberately not called here — twenty sequential lookups would
// hold up the results — so a brand-new journal shows its OpenAlex-derived signals first and
// gains the rest when someone opens the paper.
export async function assessMany(
  issns: (string | null | undefined)[],
): Promise<Map<string, Assessment>> {
  try {
    return await lookupMany(issns);
  } catch (error) {
    // This is a decoration on a search result, and a decoration must never be able to take
    // the results down with it. Whatever went wrong — the database, a migration not yet
    // applied on a running server, an upstream outage — the search still returns papers,
    // just without credibility badges on them.
    captureError({ error, source: "server", path: "/" });
    return new Map();
  }
}

async function lookupMany(
  issns: (string | null | undefined)[],
): Promise<Map<string, Assessment>> {
  const wanted = [...new Set(issns.filter((issn): issn is string => !!issn))];
  const out = new Map<string, Assessment>();
  if (wanted.length === 0) return out;

  const cached = await prisma.journalCredibility.findMany({
    where: { issn: { in: wanted } },
    include: { flags: true },
  });
  const byIssn = new Map(cached.map((record) => [record.issn, record]));

  const missing = wanted.filter((issn) => {
    const record = byIssn.get(issn);
    return !record || !isFresh(record);
  });

  if (missing.length > 0) {
    const fetched = await fetchJournals(missing);
    for (const [issn, journal] of fetched) {
      const scope = scopeBreadth(journal.title);
      const data = {
        title: journal.title,
        publisher: journal.publisher,
        inDoaj: journal.inDoaj,
        apcUsd: journal.apcUsd,
        worksCount: journal.worksCount,
        citedByCount: journal.citedByCount,
        meanCitedness: journal.meanCitedness,
        hIndex: journal.hIndex,
        broadScopeScore: scope.score,
        checkedAt: new Date(),
      };
      const saved = await prisma.journalCredibility.upsert({
        where: { issn },
        update: data,
        create: { issn, ...data },
        include: { flags: true },
      });
      byIssn.set(issn, saved);
    }
  }

  for (const issn of wanted) {
    out.set(issn, assess(byIssn.get(issn) ?? null));
  }
  return out;
}

// The thorough path, for one journal on a paper's page: everything the fast path has, plus
// the per-journal sources it skips. Still cheap, because it's one journal and the result is
// cached for a month.
export async function assessJournal(issn: string | null | undefined): Promise<Assessment> {
  if (!issn) return assess(null);
  try {
    return await lookupJournal(issn);
  } catch (error) {
    // Same rule on the paper page: the paper renders even if we can't say anything about
    // its journal.
    captureError({ error, source: "server", path: `/post` });
    return assess(null);
  }
}

async function lookupJournal(issn: string): Promise<Assessment> {

  const existing = await prisma.journalCredibility.findUnique({
    where: { issn },
    include: { flags: true },
  });
  // Fresh *and* already enriched — inMedline is the marker that the slow path has run.
  if (existing && isFresh(existing) && existing.inMedline !== null) return assess(existing);

  const [openAlex, doaj, medline, scopus, wos, retraction] = await Promise.all([
    fetchJournals([issn]),
    fetchDoajJournal(issn),
    isIndexedInMedline(issn),
    isIndexedInScopus(issn),
    isIndexedInWebOfScience(issn),
    journalRetractionProfile(issn),
  ]);

  const source = openAlex.get(issn);
  const title = doaj?.title ?? source?.title ?? existing?.title ?? null;
  const scope = scopeBreadth(title);

  const data = {
    title,
    publisher: doaj?.publisher ?? source?.publisher ?? existing?.publisher ?? null,
    // DOAJ's own record is authoritative for DOAJ membership; OpenAlex mirrors it.
    inDoaj: doaj ? true : (source?.inDoaj ?? existing?.inDoaj ?? null),
    inMedline: medline,
    inScopus: scopus,
    inWebOfScience: wos,
    // Prefer the journal's own published figure over OpenAlex's derived one.
    apcUsd: doaj?.apcUsd ?? source?.apcUsd ?? null,
    apcDisclosureUrl: doaj?.apcDisclosureUrl ?? null,
    reviewProcess: doaj?.reviewProcess ?? null,
    reviewUrl: doaj?.reviewUrl ?? null,
    publicationTimeWeeks: doaj?.publicationTimeWeeks ?? null,
    worksCount: source?.worksCount ?? existing?.worksCount ?? null,
    citedByCount: source?.citedByCount ?? existing?.citedByCount ?? null,
    meanCitedness: source?.meanCitedness ?? existing?.meanCitedness ?? null,
    hIndex: source?.hIndex ?? existing?.hIndex ?? null,
    retractions: retraction.available ? retraction.retractions : (existing?.retractions ?? null),
    retractionRate: retraction.available ? retraction.rate : (existing?.retractionRate ?? null),
    broadScopeScore: scope.score,
    checkedAt: new Date(),
  };

  const saved = await prisma.journalCredibility.upsert({
    where: { issn },
    update: data,
    create: { issn, ...data },
    include: { flags: true },
  });

  // A journal whose retraction rate is an outlier gets a flag with the arithmetic attached,
  // rather than a silent downgrade — same threshold the ingestion pipeline already uses.
  if (retraction.available && retraction.isOutlier) {
    await prisma.journalFlag.upsert({
      where: {
        issn_source_kind: {
          issn,
          source: "Retraction Watch (via Crossref)",
          kind: "RETRACTION_OUTLIER",
        },
      },
      update: {},
      create: {
        issn,
        kind: "RETRACTION_OUTLIER",
        severity: "CAUTION",
        source: "Retraction Watch (via Crossref)",
        note: `${retraction.retractions} retractions across ${retraction.works.toLocaleString()} works (${(
          retraction.rate * 100
        ).toFixed(2)}%)`,
      },
    });
    return assess(
      await prisma.journalCredibility.findUniqueOrThrow({
        where: { issn },
        include: { flags: true },
      }),
    );
  }

  return assess(saved);
}
