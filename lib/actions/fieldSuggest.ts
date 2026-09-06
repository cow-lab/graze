"use server";

import { suggestFieldsFor } from "@/lib/fieldMatch";
import { captureError } from "@/lib/errorReporting";

export type SuggestResult = { slug: string; name: string; matched: string[] }[];

// Live Field suggestions for the submit form, recomputed as the paper's title and abstract
// take shape. Same matcher as The Combine and "Add to Graze" — this is just the path that
// needs a round trip, since the Fields' keywords live in the database.
export async function suggestFieldsForPaper(paper: {
  title: string;
  abstract?: string | null;
  venue?: string | null;
}): Promise<SuggestResult> {
  try {
    if (!paper.title.trim() && !paper.abstract?.trim()) return [];
    const ranked = await suggestFieldsFor(paper);
    return ranked.map(({ slug, name, matched }) => ({ slug, name, matched }));
  } catch (error) {
    // A failed suggestion shouldn't block submitting a paper — the picker just shows the
    // full Field list instead.
    captureError({ error, source: "server" });
    return [];
  }
}
