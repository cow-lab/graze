import { fetchWithBackoff } from "@/lib/combine/fetchWithBackoff";

// MEDLINE indexing, via NLM's public E-utilities. Free, no API key, and a genuinely
// curated signal: journals are selected by NLM's Literature Selection Technical Review
// Committee rather than by anything automated.
//
// Its blind spot is the important part — MEDLINE is biomedical. A first-rate journal in
// economics, law or literature will not be in it. So this answers "yes, a curator vetted
// this" and never "no, this journal is bad".
//
// One request per journal and NCBI asks for ≤3/second unguarded, so this runs for a single
// journal on a paper's page or as background enrichment — never inline across a whole page
// of search results.

const ESEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";

export async function isIndexedInMedline(issn: string): Promise<boolean | null> {
  try {
    const url = new URL(ESEARCH);
    url.searchParams.set("db", "nlmcatalog");
    // "currentlyindexed" is NLM's own term for journals presently selected for MEDLINE.
    url.searchParams.set("term", `"${issn}"[ISSN] AND currentlyindexed[All Fields]`);
    url.searchParams.set("retmode", "json");
    url.searchParams.set("tool", "graze");
    url.searchParams.set("email", "grazeoutreach@gmail.com");

    const res = await fetchWithBackoff(url.toString());
    if (!res.ok) return null;
    const data = (await res.json()) as { esearchresult?: { count?: string } };
    const count = Number.parseInt(data.esearchresult?.count ?? "", 10);
    return Number.isNaN(count) ? null : count > 0;
  } catch (err) {
    // Unknown, not absent.
    console.error(`[credibility] MEDLINE lookup failed for ${issn}`, err);
    return null;
  }
}
