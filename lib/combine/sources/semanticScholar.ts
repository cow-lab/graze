import type { CombineCandidate } from "@/lib/combine/types";
import { normalizeDoi } from "@/lib/combine/utils";
import { fetchWithBackoff } from "@/lib/combine/fetchWithBackoff";
import { withApiCache } from "@/lib/combine/cache";

type S2Paper = {
  title?: string;
  abstract?: string;
  year?: number;
  authors?: { name?: string }[];
  externalIds?: { DOI?: string };
  venue?: string;
  citationCount?: number;
  openAccessPdf?: { url?: string } | null;
  publicationVenue?: { name?: string; issn?: string };
};

export async function searchSemanticScholar(
  keywords: string[],
  limit = 5,
): Promise<CombineCandidate[]> {
  const query = keywords.slice(0, 3).join(" ");
  if (!query) return [];

  return withApiCache("Semantic Scholar", keywords, limit, async () => {
    const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
    url.searchParams.set("query", query);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set(
      "fields",
      "title,abstract,year,authors,externalIds,venue,citationCount,openAccessPdf,publicationVenue",
    );

    try {
      const res = await fetchWithBackoff(url.toString());
      // Semantic Scholar's unauthenticated tier is aggressively rate-limited (429s are
      // common even after backoff retries) — treat that as "no results this run" rather
      // than an error.
      if (!res.ok) return [];
      const data = (await res.json()) as { data?: S2Paper[] };
      const items = data.data ?? [];

      return items
        .filter((item) => item.abstract)
        .map((item) => ({
          title: item.title?.trim() ?? "Untitled",
          authors:
            (item.authors ?? []).map((a) => a.name).filter(Boolean).join(", ") || "Unknown authors",
          abstract: item.abstract ?? null,
          doi: normalizeDoi(item.externalIds?.DOI),
          issn: item.publicationVenue?.issn ?? null,
          publisher: null,
          journal: item.publicationVenue?.name ?? item.venue ?? null,
          year: item.year ?? null,
          url:
            item.openAccessPdf?.url ??
            (item.externalIds?.DOI ? `https://doi.org/${item.externalIds.DOI}` : ""),
          sourceName: "Semantic Scholar" as const,
          citationCount: item.citationCount ?? null,
        }));
    } catch (err) {
      console.error("Combine: Semantic Scholar search failed", err);
      return [];
    }
  });
}
