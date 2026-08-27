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
  oaUrl: string | null;
  abstract: string | null;
};

type OpenAlexWork = {
  title?: string;
  doi?: string;
  publication_year?: number;
  cited_by_count?: number;
  abstract_inverted_index?: Record<string, number[]>;
  authorships?: { author: { display_name?: string } }[];
  open_access?: { oa_url?: string | null };
  primary_location?: {
    landing_page_url?: string;
    source?: { display_name?: string; issn_l?: string; host_organization_name?: string };
  };
};

export async function searchLiterature(query: string, page = 1): Promise<LiveSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", trimmed);
  url.searchParams.set("per-page", "20");
  url.searchParams.set("page", String(page));
  url.searchParams.set("mailto", "graze-search@example.com");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`OpenAlex search failed (${res.status})`);
  const data = (await res.json()) as { results?: OpenAlexWork[] };
  const items = data.results ?? [];

  return items.map((item) => {
    const source = item.primary_location?.source;
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
      oaUrl: item.open_access?.oa_url ?? item.primary_location?.landing_page_url ?? null,
      abstract: reconstructOpenAlexAbstract(item.abstract_inverted_index),
    };
  });
}
