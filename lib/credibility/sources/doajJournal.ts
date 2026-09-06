import { fetchWithBackoff } from "@/lib/combine/fetchWithBackoff";

// DOAJ's journal record, read properly this time. The existing allowlist check
// (lib/combine/allowlist.ts) asks DOAJ one yes/no question and throws the rest away —
// but the same free response already carries the transparency payload this feature wants:
// whether an APC exists and where it's published, what the review process is and where it's
// described, and how long the journal says publication takes.
//
// DOAJ only covers open-access journals. A subscription journal is absent from it by
// definition, so absence carries no meaning on its own.

export type DoajJournal = {
  title: string | null;
  publisher: string | null;
  apcUsd: number | null;
  apcDisclosureUrl: string | null;
  reviewProcess: string | null;
  reviewUrl: string | null;
  publicationTimeWeeks: number | null;
};

type Bibjson = {
  title?: string;
  publisher?: { name?: string } | string;
  apc?: { has_apc?: boolean; max?: { price?: number; currency?: string }[]; url?: string };
  editorial?: { review_process?: string[]; review_url?: string };
  publication_time_weeks?: number;
};

export async function fetchDoajJournal(issn: string): Promise<DoajJournal | null> {
  try {
    const res = await fetchWithBackoff(
      `https://doaj.org/api/search/journals/issn%3A${encodeURIComponent(issn)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { total?: number; results?: { bibjson: Bibjson }[] };
    const record = data.results?.[0]?.bibjson;
    if (!record || (data.total ?? 0) === 0) return null;

    // DOAJ lists prices per currency; the USD one is the comparable figure, and if there
    // isn't one we'd rather show nothing than convert a number ourselves and present the
    // result as the journal's own published price.
    const usd = record.apc?.max?.find((entry) => entry.currency === "USD")?.price ?? null;

    return {
      title: record.title ?? null,
      publisher:
        typeof record.publisher === "string" ? record.publisher : (record.publisher?.name ?? null),
      apcUsd: usd,
      apcDisclosureUrl: record.apc?.url ?? null,
      reviewProcess: record.editorial?.review_process?.join(", ") ?? null,
      reviewUrl: record.editorial?.review_url ?? null,
      publicationTimeWeeks: record.publication_time_weeks ?? null,
    };
  } catch (err) {
    console.error(`[credibility] DOAJ journal lookup failed for ${issn}`, err);
    return null;
  }
}
