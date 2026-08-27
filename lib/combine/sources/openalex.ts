import type { CombineCandidate } from "@/lib/combine/types";
import { normalizeDoi, reconstructOpenAlexAbstract } from "@/lib/combine/utils";
import { fetchWithBackoff } from "@/lib/combine/fetchWithBackoff";
import { withApiCache } from "@/lib/combine/cache";

type OpenAlexLocation = {
  version?: string; // "publishedVersion" | "acceptedVersion" | "submittedVersion"
  landing_page_url?: string;
  source?: { display_name?: string; issn_l?: string; host_organization_name?: string };
};

type OpenAlexWork = {
  title?: string;
  doi?: string;
  publication_year?: number;
  cited_by_count?: number;
  abstract_inverted_index?: Record<string, number[]>;
  authorships?: { author: { display_name?: string } }[];
  primary_location?: OpenAlexLocation;
  // The rest of the work's known hosting locations — when OpenAlex has already linked a
  // preprint to its published version, both show up here under the same Work/DOI, which
  // is the real "relationship data" signal: prefer the published location's venue over
  // whatever happened to be primary, and use it to tell a still-preprint-only work apart
  // from one that already has a peer-reviewed version (see lib/combine/preprintMatch.ts).
  locations?: OpenAlexLocation[];
  topics?: { display_name?: string }[];
};

export async function searchOpenAlex(keywords: string[], limit = 5): Promise<CombineCandidate[]> {
  const query = keywords.slice(0, 3).join(" ");
  if (!query) return [];

  return withApiCache("OpenAlex", keywords, limit, async () => {
    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", query);
    url.searchParams.set("per-page", String(limit));
    url.searchParams.set("filter", "has_abstract:true,type:article");
    url.searchParams.set("mailto", "graze-combine@example.com");

    try {
      const res = await fetchWithBackoff(url.toString());
      if (!res.ok) return [];
      const data = (await res.json()) as { results?: OpenAlexWork[] };
      const items = data.results ?? [];

      return items.map((item) => {
        const locations = item.locations?.length
          ? item.locations
          : item.primary_location
            ? [item.primary_location]
            : [];
        const publishedLocation = locations.find(
          (l) => l.version === "publishedVersion" || l.version === "acceptedVersion",
        );
        // Prefer the actual peer-reviewed location's venue/link when OpenAlex has already
        // linked one, rather than defaulting to primary_location (which is sometimes the
        // preprint host even after a published version exists).
        const best = publishedLocation ?? item.primary_location ?? locations[0];
        const source = best?.source;
        const stillPreprintOnly = !publishedLocation && item.primary_location?.version === "submittedVersion";

        return {
          title: item.title?.trim() ?? "Untitled",
          authors:
            (item.authorships ?? [])
              .map((a) => a.author.display_name)
              .filter(Boolean)
              .join(", ") || "Unknown authors",
          abstract: reconstructOpenAlexAbstract(item.abstract_inverted_index),
          doi: normalizeDoi(item.doi),
          issn: source?.issn_l ?? null,
          publisher: source?.host_organization_name ?? null,
          journal: source?.display_name ?? null,
          year: item.publication_year ?? null,
          url: best?.landing_page_url ?? (item.doi ?? ""),
          sourceName: "OpenAlex" as const,
          citationCount: item.cited_by_count ?? null,
          topics: (item.topics ?? []).map((t) => t.display_name).filter((t): t is string => !!t),
          version: stillPreprintOnly ? "preprint" : best?.version ? "published" : null,
        };
      });
    } catch (err) {
      console.error("Combine: OpenAlex search failed", err);
      return [];
    }
  });
}
