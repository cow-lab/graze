import type { CombineCandidate } from "@/lib/combine/types";
import { normalizeDoi, extractPubMedAbstract } from "@/lib/combine/utils";
import { fetchWithBackoff } from "@/lib/combine/fetchWithBackoff";
import { withApiCache } from "@/lib/combine/cache";

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

type PubMedSummary = {
  uid: string;
  title?: string;
  authors?: { name?: string }[];
  pubdate?: string;
  fulljournalname?: string;
  issn?: string;
  essn?: string;
  articleids?: { idtype: string; value: string }[];
};

export async function searchPubMed(keywords: string[], limit = 5): Promise<CombineCandidate[]> {
  const query = keywords.slice(0, 3).join(" ");
  if (!query) return [];

  // PubMed is by far the most call-heavy source per candidate (esearch + esummary, then
  // one extra efetch per article for the abstract), so caching the whole result set here
  // saves the most calls of any source when a run repeats within the TTL.
  return withApiCache("PubMed", keywords, limit, async () => {
    try {
      const searchUrl = new URL(`${EUTILS}/esearch.fcgi`);
      searchUrl.searchParams.set("db", "pubmed");
      searchUrl.searchParams.set("term", query);
      searchUrl.searchParams.set("retmode", "json");
      searchUrl.searchParams.set("retmax", String(limit));

      const searchRes = await fetchWithBackoff(searchUrl.toString());
      if (!searchRes.ok) return [];
      const searchData = (await searchRes.json()) as {
        esearchresult?: { idlist?: string[] };
      };
      const ids = searchData.esearchresult?.idlist ?? [];
      if (ids.length === 0) return [];

      const summaryUrl = new URL(`${EUTILS}/esummary.fcgi`);
      summaryUrl.searchParams.set("db", "pubmed");
      summaryUrl.searchParams.set("id", ids.join(","));
      summaryUrl.searchParams.set("retmode", "json");

      const summaryRes = await fetchWithBackoff(summaryUrl.toString());
      if (!summaryRes.ok) return [];
      const summaryData = (await summaryRes.json()) as { result?: Record<string, PubMedSummary> };
      const result = summaryData.result ?? {};

      const candidates: CombineCandidate[] = [];
      for (const id of ids) {
        const summary = result[id];
        if (!summary || summary.uid === undefined) continue;

        const abstractUrl = new URL(`${EUTILS}/efetch.fcgi`);
        abstractUrl.searchParams.set("db", "pubmed");
        abstractUrl.searchParams.set("id", id);
        abstractUrl.searchParams.set("rettype", "abstract");
        abstractUrl.searchParams.set("retmode", "text");

        let abstract: string | null = null;
        try {
          const abstractRes = await fetchWithBackoff(abstractUrl.toString());
          if (abstractRes.ok) abstract = extractPubMedAbstract(await abstractRes.text());
        } catch {
          // no abstract available — candidate will be dropped downstream if needed
        }

        const doi = summary.articleids?.find((a) => a.idtype === "doi")?.value ?? null;
        const year = summary.pubdate ? parseInt(summary.pubdate.slice(0, 4), 10) : null;

        candidates.push({
          title: summary.title?.replace(/\.$/, "").trim() || "Untitled",
          authors:
            (summary.authors ?? []).map((a) => a.name).filter(Boolean).join(", ") || "Unknown authors",
          abstract,
          doi: normalizeDoi(doi),
          issn: summary.essn || summary.issn || null,
          publisher: null,
          journal: summary.fulljournalname ?? null,
          year: Number.isFinite(year) ? year : null,
          url: doi ? `https://doi.org/${doi}` : `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          sourceName: "PubMed" as const,
          // PubMed's esummary doesn't expose a citation count directly.
          citationCount: null,
        });
      }

      return candidates;
    } catch (err) {
      console.error("Combine: PubMed search failed", err);
      return [];
    }
  });
}
