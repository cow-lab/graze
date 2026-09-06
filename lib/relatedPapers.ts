import { fetchWithBackoff } from "@/lib/combine/fetchWithBackoff";

export type RelatedPaper = {
  title: string;
  authors: string;
  venue: string | null;
  year: number | null;
  citationCount: number;
  url: string | null;
  isOpenAccess: boolean;
};

type OpenAlexWork = {
  id?: string;
  title?: string;
  publication_year?: number;
  cited_by_count?: number;
  related_works?: string[];
  authorships?: { author: { display_name?: string } }[];
  open_access?: { is_oa?: boolean; oa_url?: string | null };
  primary_location?: { landing_page_url?: string; source?: { display_name?: string } };
};

function toRelated(item: OpenAlexWork): RelatedPaper {
  const oaUrl = item.open_access?.oa_url ?? null;
  return {
    title: item.title?.trim() ?? "Untitled",
    authors:
      (item.authorships ?? [])
        .map((a) => a.author.display_name)
        .filter(Boolean)
        .slice(0, 4)
        .join(", ") || "Unknown authors",
    venue: item.primary_location?.source?.display_name ?? null,
    year: item.publication_year ?? null,
    citationCount: item.cited_by_count ?? 0,
    url: oaUrl ?? item.primary_location?.landing_page_url ?? null,
    isOpenAccess: item.open_access?.is_oa ?? Boolean(oaUrl),
  };
}

// OpenAlex already computes a `related_works` list per work — papers sharing its concept
// and topic tags. That's exactly what this section wants, so no new integration is needed:
// one lookup by DOI, then one batched fetch for the related IDs.
export async function getRelatedPapers(doi: string, limit = 4): Promise<RelatedPaper[]> {
  try {
    const workRes = await fetchWithBackoff(
      `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}?mailto=graze-search@example.com`,
    );
    if (!workRes.ok) return [];
    const work = (await workRes.json()) as OpenAlexWork;

    const ids = (work.related_works ?? [])
      .map((url) => url.split("/").pop())
      .filter((id): id is string => !!id)
      .slice(0, limit);
    if (ids.length === 0) return [];

    // One request for all of them rather than N — `openalex_id` accepts a pipe-delimited OR.
    const listUrl = new URL("https://api.openalex.org/works");
    listUrl.searchParams.set("filter", `openalex_id:${ids.join("|")}`);
    listUrl.searchParams.set("per-page", String(limit));
    listUrl.searchParams.set("mailto", "graze-search@example.com");

    const listRes = await fetchWithBackoff(listUrl.toString());
    if (!listRes.ok) return [];
    const data = (await listRes.json()) as { results?: OpenAlexWork[] };
    return (data.results ?? []).map(toRelated);
  } catch (err) {
    // A related-papers section is a nice-to-have; never let it take down the post page.
    console.error("Related papers lookup failed", err);
    return [];
  }
}
