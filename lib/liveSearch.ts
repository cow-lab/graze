import { normalizeDoi, reconstructOpenAlexAbstract } from "@/lib/combine/utils";

// A single result from a live, on-demand OpenAlex query — never stored in the database.
// This is the "search the whole literature, Scholar-style" tier: unlimited breadth, no
// vetting, same trust level as clicking through to OpenAlex/the publisher directly. The
// curated library (The Combine + user uploads) is the separate, smaller, vetted tier.
export type LiveSearchResult = {
  title: string;
  authors: string;
  venue: string | null;
  issn: string | null;
  publisher: string | null;
  year: number | null;
  citationCount: number;
  doi: string | null;
  // Whether a free-to-read version exists anywhere, per OpenAlex's `is_oa`.
  isOpenAccess: boolean;
  // ISO 639-1 code of the work's original language, when OpenAlex reports one.
  language: string | null;
  // The source's own work type. Live search deliberately does not filter preprints out —
  // the whole literature is the point of this tier — so the type is carried through and
  // shown on the result instead.
  workType: string | null;
  // The free full text, when there is one. Kept strictly separate from `landingUrl` —
  // previously the two were collapsed with `??`, which meant a paywalled work's publisher
  // page masqueraded as an open-access link.
  oaUrl: string | null;
  // The publisher's page for the work. May well be paywalled.
  landingUrl: string | null;
  abstract: string | null;
  /**
   * Author verification, counted from what OpenAlex already returns.
   *
   * ROR and ORCID were scoped as a second phase needing their own API clients and a
   * background job, because ORCID is per-author and a page of twenty results can mean a
   * hundred lookups. That turned out to be unnecessary: OpenAlex embeds the author's ORCID
   * iD and the ROR id of their institution in the same response as the search results —
   * measured at 81.6% ORCID and 99.3% ROR coverage across a sample of 152 authors. So this
   * costs nothing extra and never touches the request path.
   */
  authors_total: number;
  authorsWithOrcid: number;
  /** Authors whose stated affiliation OpenAlex resolved to a registered ROR organisation. */
  authorsWithRor: number;
};

type OpenAlexWork = {
  title?: string;
  doi?: string;
  type?: string;
  type_crossref?: string;
  publication_year?: number;
  cited_by_count?: number;
  abstract_inverted_index?: Record<string, number[]>;
  authorships?: {
    author: { display_name?: string; orcid?: string | null };
    institutions?: { ror?: string | null; display_name?: string }[];
  }[];
  language?: string | null;
  open_access?: { is_oa?: boolean; oa_url?: string | null };
  primary_location?: {
    landing_page_url?: string;
    source?: { display_name?: string; issn_l?: string; host_organization_name?: string };
  };
};

export async function searchLiterature(
  query: string,
  page = 1,
  opts: { openAccessOnly?: boolean } = {},
): Promise<LiveSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", trimmed);
  url.searchParams.set("per-page", "20");
  url.searchParams.set("page", String(page));
  url.searchParams.set("mailto", "grazeoutreach@gmail.com");
  // Filter at the API rather than post-hoc, so an open-access-only search still returns a
  // full page of results instead of a page thinned out by client-side filtering.
  if (opts.openAccessOnly) url.searchParams.set("filter", "is_oa:true");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`OpenAlex search failed (${res.status})`);
  const data = (await res.json()) as { results?: OpenAlexWork[] };
  const items = data.results ?? [];

  return items.map((item) => {
    const source = item.primary_location?.source;
    const oaUrl = item.open_access?.oa_url ?? null;
    return {
      title: item.title?.trim() ?? "Untitled",
      authors:
        (item.authorships ?? [])
          .map((a) => a.author.display_name)
          .filter(Boolean)
          .join(", ") || "Unknown authors",
      venue: source?.display_name ?? null,
      issn: source?.issn_l ?? null,
      publisher: source?.host_organization_name ?? null,
      year: item.publication_year ?? null,
      citationCount: item.cited_by_count ?? 0,
      doi: normalizeDoi(item.doi),
      isOpenAccess: item.open_access?.is_oa ?? Boolean(oaUrl),
      language: item.language ?? null,
      workType: item.type_crossref ?? item.type ?? null,
      oaUrl,
      landingUrl: item.primary_location?.landing_page_url ?? null,
      abstract: reconstructOpenAlexAbstract(item.abstract_inverted_index),
      authors_total: (item.authorships ?? []).length,
      authorsWithOrcid: (item.authorships ?? []).filter((a) => !!a.author.orcid).length,
      authorsWithRor: (item.authorships ?? []).filter((a) =>
        (a.institutions ?? []).some((i) => !!i.ror),
      ).length,
    };
  });
}
