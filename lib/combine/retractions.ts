import { prisma } from "@/lib/prisma";
import { fetchWithBackoff } from "@/lib/combine/fetchWithBackoff";

export type RetractionCheckSummary = {
  checked: number;
  newlyRetracted: string[];
};

type CrossrefWorkLookup = {
  message?: {
    "update-to"?: { type?: string; DOI?: string }[];
  };
};

// A lightweight, periodic re-sync — not real-time — against already-imported papers.
// Every Combine-imported post has a DOI (it's the dedup key), and Crossref indexes
// retraction notices for essentially the whole DOI space regardless of which source
// originally surfaced the paper, so one Crossref lookup per DOI covers Crossref-,
// OpenAlex-, Semantic Scholar-, and PubMed-sourced imports alike. User-submitted papers
// aren't checked — there's no DOI guarantee for those.
export async function checkRetractions(): Promise<RetractionCheckSummary> {
  const summary: RetractionCheckSummary = { checked: 0, newlyRetracted: [] };

  const posts = await prisma.post.findMany({
    where: { type: "RESEARCH", source: "COMBINE", doi: { not: null }, retractedAt: null },
    select: { id: true, doi: true, title: true },
  });

  for (const post of posts) {
    summary.checked += 1;
    try {
      const res = await fetchWithBackoff(`https://api.crossref.org/works/${encodeURIComponent(post.doi!)}`);
      if (!res.ok) continue;
      const data = (await res.json()) as CrossrefWorkLookup;
      const updates = data.message?.["update-to"] ?? [];
      const isRetracted = updates.some((u) => (u.type ?? "").toLowerCase().includes("retraction"));

      if (isRetracted) {
        await prisma.post.update({ where: { id: post.id }, data: { retractedAt: new Date() } });
        summary.newlyRetracted.push(post.title);
      }
    } catch (err) {
      console.error(`Combine: retraction check failed for DOI ${post.doi}`, err);
    }
  }

  console.log(
    `[Combine] Retraction check: ${summary.checked} imported papers checked, ${summary.newlyRetracted.length} newly flagged.`,
  );

  return summary;
}
