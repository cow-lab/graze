export function normalizeDoi(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .toLowerCase();
}

export function stripHtml(input: string | null | undefined): string | null {
  if (!input) return null;
  const text = input
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text : null;
}

// OpenAlex stores abstracts as an "inverted index" — {word: [positions]} — to save space.
// Reconstruct the plain-text abstract from it.
export function reconstructOpenAlexAbstract(
  invertedIndex: Record<string, number[]> | null | undefined,
): string | null {
  if (!invertedIndex) return null;
  const positions: { word: string; pos: number }[] = [];
  for (const [word, idxs] of Object.entries(invertedIndex)) {
    for (const pos of idxs) positions.push({ word, pos });
  }
  if (positions.length === 0) return null;
  positions.sort((a, b) => a.pos - b.pos);
  return positions.map((p) => p.word).join(" ");
}

// PubMed's efetch (rettype=abstract, retmode=text) returns a human-readable citation
// block: a header line, blank line, title, blank line, author line, blank line,
// "Author information:" block, blank line, then the abstract body, then trailing
// DOI/PMID footer lines. Pull out just the abstract body heuristically.
export function extractPubMedAbstract(rawText: string): string | null {
  const blocks = rawText
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // Skip the citation line, title, author line, and "Author information:" block —
  // the abstract is the first remaining block of substantial prose after those,
  // stopping before trailing DOI/PMID/© footer lines.
  const bodyBlocks = blocks.filter((b, i) => {
    if (i === 0) return false; // citation line
    if (/^Author information:/i.test(b)) return false;
    if (/^(DOI|PMID|PMCID|Copyright|©|Conflict of interest)/i.test(b)) return false;
    if (b.split(" ").length < 15) return false; // title/author lines are short
    return true;
  });

  const abstract = bodyBlocks.join(" ").trim();
  return abstract.length > 40 ? abstract : null;
}

export function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

// Shared join key for matching the same paper across two different DOIs (or no DOI at
// all) — a preprint and its later peer-reviewed version almost always share an exact (or
// near-exact) title even when every other identifier differs.
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PREPRINT_SERVER_NAMES = [
  "arxiv",
  "biorxiv",
  "medrxiv",
  "ssrn",
  "chemrxiv",
  "preprints.org",
  "research square",
  "researchsquare",
];

// Fallback for sources that don't expose an explicit version field (only OpenAlex and,
// partially, Crossref do) — a venue name matching a known preprint server is still a real
// signal, not a guess.
export function looksLikePreprintVenue(venue: string | null | undefined): boolean {
  if (!venue) return false;
  const v = venue.toLowerCase();
  return PREPRINT_SERVER_NAMES.some((name) => v.includes(name));
}
