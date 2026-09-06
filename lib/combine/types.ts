// A candidate article surfaced by one of The Combine's source APIs, before it has
// passed the DOAJ/allowlist check or been deduped against existing posts.
export type CombineCandidate = {
  title: string;
  authors: string;
  abstract: string | null;
  doi: string | null;
  issn: string | null;
  publisher: string | null;
  journal: string | null;
  year: number | null;
  url: string;
  sourceName: "Crossref" | "OpenAlex" | "Semantic Scholar" | "PubMed";
  // The real trust signal now that account verification isn't in play for research — how
  // many other works cite this one, per the source API. Not every source exposes it.
  citationCount: number | null;
  // ISO 639-1 code of the work's original language, when the source reports one.
  language?: string | null;
  // OpenAlex-only: the work's top topic labels, used to detect subject clusters that don't
  // match any existing Field well (see lib/combine/suggestFields.ts).
  topics?: string[];
  // Where this candidate sits in the preprint→published lifecycle, when the source exposes
  // it (OpenAlex's location `version`, Crossref's `type: posted-content`). Null when the
  // source doesn't say — lib/combine/preprintMatch.ts falls back to a known-preprint-server
  // name check in that case.
  version?: "preprint" | "published" | null;
  // The source's own type string ("journal-article", "posted-content", "preprint"). This is
  // the peer-review signal: it comes from the publisher's own record rather than being
  // inferred from where the file happens to be hosted.
  workType?: string | null;
};
