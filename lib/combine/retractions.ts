import { prisma } from "@/lib/prisma";
import { isDoiRetracted } from "@/lib/combine/retractionWatch";

export type RetractionCheckSummary = {
  checked: number;
  newlyRetracted: string[];
};

// The periodic half of retraction checking. The other half runs at import time
// (lib/combine/reliability.ts), so a paper already known to be retracted never enters the
// library at all; this catches the ones retracted after they were imported.
//
// A lightweight, periodic re-sync — not real-time — against already-imported papers.
// Every Combine-imported post has a DOI (it's the dedup key), and Crossref indexes
// retraction notices for essentially the whole DOI space regardless of which source
// originally surfaced the paper, so one Crossref lookup per DOI covers Crossref-,
// OpenAlex-, Semantic Scholar-, and PubMed-sourced imports alike. User-submitted papers
// aren't checked — there's no DOI guarantee for those.
export async function checkRetractions(): Promise<RetractionCheckSummary> {
  const summary: RetractionCheckSummary = { checked: 0, newlyRetracted: [] };

  const posts = await prisma.post.findMany({
    where: { source: "COMBINE", doi: { not: null }, retractedAt: null },
    select: { id: true, doi: true, title: true },
  });

  for (const post of posts) {
    summary.checked += 1;
    try {
      if (await isDoiRetracted(post.doi!)) {
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
