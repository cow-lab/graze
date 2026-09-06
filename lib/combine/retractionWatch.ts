import { fetchWithBackoff } from "@/lib/combine/fetchWithBackoff";
import { withCachedFact } from "@/lib/combine/cache";

// The second, independent reliability source, alongside the DOAJ allowlist.
//
// Retraction Watch's database is distributed through Crossref — Crossref acquired it in
// 2023 and merges its records into the retraction metadata served by the REST API — so
// these lookups are Retraction Watch data reached through a queryable per-DOI and
// per-journal API rather than a multi-megabyte CSV download on every import. A deployment
// that wants the bulk file instead can pull
// https://api.labs.crossref.org/data/retractionwatch?<contact-email> on a schedule and
// swap the two functions below; nothing above this layer would change.
//
// Everything here is a count of records that exist or don't. There is deliberately no
// scoring, weighting, or model judgment of a journal's "quality" — the same reason this
// project has no automated bias checker.

const CACHE_SOURCE = "RetractionWatch";

// Below this many retractions, a count says more about the journal's size than its
// standards, so it isn't treated as evidence either way.
const MIN_RETRACTIONS_TO_JUDGE = 5;
// Retraction rates across the literature sit in the 0.02–0.08% range. Half a percent is
// roughly an order of magnitude above that — an outlier by arithmetic, not by opinion.
const OUTLIER_RETRACTION_RATE = 0.005;

export type JournalRetractionProfile = {
  /** False when the lookup failed or the journal has no ISSN — "no evidence", not "clean". */
  available: boolean;
  retractions: number;
  works: number;
  rate: number;
  /** True only when there is enough data to call it, and the rate is an outlier. */
  isOutlier: boolean;
};

type CrossrefCount = { message?: { "total-results"?: number } };
type CrossrefWorkLookup = { message?: { "update-to"?: { type?: string }[] } };

async function crossrefCount(url: string): Promise<number | null> {
  const res = await fetchWithBackoff(url);
  if (!res.ok) return null;
  const data = (await res.json()) as CrossrefCount;
  return data.message?.["total-results"] ?? null;
}

// Is this specific paper already known to be retracted? Used at import time (so a retracted
// paper never enters the curated library) and by the periodic re-sync (so one that gets
// retracted later is caught).
export async function isDoiRetracted(doi: string): Promise<boolean> {
  return withCachedFact(CACHE_SOURCE, `doi:${doi}`, async () => {
    try {
      const res = await fetchWithBackoff(
        `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
      );
      if (!res.ok) return false;
      const data = (await res.json()) as CrossrefWorkLookup;
      return (data.message?.["update-to"] ?? []).some((u) =>
        (u.type ?? "").toLowerCase().includes("retraction"),
      );
    } catch (err) {
      console.error(`[Combine] Retraction lookup failed for DOI ${doi}`, err);
      return false;
    }
  });
}

// How much retraction history does this journal carry, as a share of what it publishes?
// Two counts, no interpretation beyond the stated threshold.
export async function journalRetractionProfile(
  issn: string | null,
): Promise<JournalRetractionProfile> {
  const empty: JournalRetractionProfile = {
    available: false,
    retractions: 0,
    works: 0,
    rate: 0,
    isOutlier: false,
  };
  if (!issn) return empty;

  return withCachedFact(CACHE_SOURCE, `journal:${issn}`, async () => {
    try {
      const base = `https://api.crossref.org/journals/${encodeURIComponent(issn)}/works`;
      const [retractions, works] = await Promise.all([
        crossrefCount(`${base}?filter=has-update:true,update-type:retraction&rows=0`),
        crossrefCount(`${base}?rows=0`),
      ]);

      if (retractions === null || works === null || works === 0) return empty;

      const rate = retractions / works;
      return {
        available: true,
        retractions,
        works,
        rate,
        isOutlier: retractions >= MIN_RETRACTIONS_TO_JUDGE && rate >= OUTLIER_RETRACTION_RATE,
      };
    } catch (err) {
      console.error(`[Combine] Journal retraction profile failed for ISSN ${issn}`, err);
      return empty;
    }
  });
}

export function describeProfile(profile: JournalRetractionProfile): string {
  if (!profile.available) return "no Retraction Watch record available";
  return `${profile.retractions} retractions across ${profile.works.toLocaleString()} works (${(
    profile.rate * 100
  ).toFixed(2)}%)`;
}
