import { fetchWithBackoff } from "@/lib/combine/fetchWithBackoff";

// OpenAlex's Sources API: one free call covers DOAJ membership, a published APC, journal
// citation statistics, and output volume — for up to 50 journals at a time, which is what
// makes it affordable to show a signal on every row of a search page.
//
// Deliberately not used: OpenAlex's `is_core` flag. It reads like a quality marker and
// isn't one — Nature, PLOS ONE and a journal that appears on every predatory-list mirror
// all return `is_core: true`, so it separates nothing.

export type OpenAlexJournal = {
  issn: string;
  title: string | null;
  publisher: string | null;
  inDoaj: boolean;
  apcUsd: number | null;
  worksCount: number | null;
  citedByCount: number | null;
  meanCitedness: number | null;
  hIndex: number | null;
};

type SourceRecord = {
  display_name?: string;
  host_organization_name?: string;
  is_in_doaj?: boolean;
  apc_usd?: number | null;
  works_count?: number;
  cited_by_count?: number;
  summary_stats?: { "2yr_mean_citedness"?: number; h_index?: number };
  ids?: { issn_l?: string; issn?: string[] };
};

function toJournal(record: SourceRecord, issn: string): OpenAlexJournal {
  return {
    issn,
    title: record.display_name ?? null,
    publisher: record.host_organization_name ?? null,
    inDoaj: record.is_in_doaj ?? false,
    apcUsd: record.apc_usd ?? null,
    worksCount: record.works_count ?? null,
    citedByCount: record.cited_by_count ?? null,
    meanCitedness: record.summary_stats?.["2yr_mean_citedness"] ?? null,
    hIndex: record.summary_stats?.h_index ?? null,
  };
}

// Up to 50 ISSNs per request — OpenAlex's own page-size ceiling for a filtered list.
const MAX_PER_REQUEST = 50;

export async function fetchJournals(issns: string[]): Promise<Map<string, OpenAlexJournal>> {
  const found = new Map<string, OpenAlexJournal>();
  const unique = [...new Set(issns.filter(Boolean))];

  for (let i = 0; i < unique.length; i += MAX_PER_REQUEST) {
    const batch = unique.slice(i, i + MAX_PER_REQUEST);
    try {
      const url = new URL("https://api.openalex.org/sources");
      url.searchParams.set("filter", `issn:${batch.join("|")}`);
      url.searchParams.set("per-page", String(batch.length));
      url.searchParams.set("mailto", "grazeoutreach@gmail.com");

      const res = await fetchWithBackoff(url.toString());
      if (!res.ok) continue;
      const data = (await res.json()) as { results?: SourceRecord[] };

      for (const record of data.results ?? []) {
        // A source can carry several ISSNs; map every one we asked about to this record.
        const ids = [record.ids?.issn_l, ...(record.ids?.issn ?? [])].filter(
          (value): value is string => !!value,
        );
        for (const id of ids) {
          if (batch.includes(id)) found.set(id, toJournal(record, id));
        }
      }
    } catch (err) {
      // A journal we couldn't look up stays unknown rather than becoming a negative.
      console.error("[credibility] OpenAlex sources lookup failed", err);
    }
  }

  return found;
}
