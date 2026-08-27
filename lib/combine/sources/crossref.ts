import type { CombineCandidate } from "@/lib/combine/types";
import { normalizeDoi, stripHtml } from "@/lib/combine/utils";
import { fetchWithBackoff } from "@/lib/combine/fetchWithBackoff";
import { withApiCache } from "@/lib/combine/cache";

type CrossrefWork = {
  title?: string[];
  author?: { given?: string; family?: string }[];
  DOI?: string;
  ISSN?: string[];
  "container-title"?: string[];
  publisher?: string;
  abstract?: string;
  URL?: string;
  type?: string;
  "is-referenced-by-count"?: number;
  published?: { "date-parts"?: number[][] };
};

export async function searchCrossref(keywords: string[], limit = 5): Promise<CombineCandidate[]> {
  const query = keywords.slice(0, 3).join(" ");
  if (!query) return [];

  return withApiCache("Crossref", keywords, limit, async () => {
    const url = new URL("https://api.crossref.org/works");
    url.searchParams.set("query.bibliographic", query);
    url.searchParams.set("rows", String(limit));
    url.searchParams.set("filter", "type:journal-article");
    url.searchParams.set("mailto", "graze-combine@example.com");

    try {
      const res = await fetchWithBackoff(url.toString(), {
        headers: { "User-Agent": "Graze/1.0 (The Combine; mailto:graze-combine@example.com)" },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { message?: { items?: CrossrefWork[] } };
      const items = data.message?.items ?? [];

      return items.map((item) => {
        const authors = (item.author ?? [])
          .map((a) => [a.given, a.family].filter(Boolean).join(" "))
          .filter(Boolean)
          .join(", ");

        return {
          title: item.title?.[0]?.trim() ?? "Untitled",
          authors: authors || "Unknown authors",
          abstract: stripHtml(item.abstract ?? null),
          doi: normalizeDoi(item.DOI),
          issn: item.ISSN?.[0] ?? null,
          publisher: item.publisher ?? null,
          journal: item["container-title"]?.[0] ?? null,
          year: item.published?.["date-parts"]?.[0]?.[0] ?? null,
          url: item.URL ?? (item.DOI ? `https://doi.org/${item.DOI}` : ""),
          sourceName: "Crossref" as const,
          citationCount: item["is-referenced-by-count"] ?? null,
        };
      });
    } catch (err) {
      console.error("Combine: Crossref search failed", err);
      return [];
    }
  });
}
