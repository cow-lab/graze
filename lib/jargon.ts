export type GlossaryTerm = { term: string; definition: string };

export type TextSegment =
  | { kind: "text"; text: string }
  | { kind: "term"; text: string; definition: string };

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Splits a title/snippet into plain runs and glossary matches, so the caller can render
// the matches with a definition attached.
//
// Terms are matched longest-first: "graph neural network" should win over a bare "network"
// that also happens to be in the glossary, and once a span is consumed it can't be matched
// again. Matching is case-insensitive and whole-word (\b) so "a" or "ion" can't light up
// fragments inside unrelated words.
export function segmentJargon(text: string, terms: GlossaryTerm[]): TextSegment[] {
  if (!text) return [];

  const usable = terms
    .filter((t) => t.term.trim().length > 2)
    .sort((a, b) => b.term.length - a.term.length);
  if (usable.length === 0) return [{ kind: "text", text }];

  const claimed: { start: number; end: number; definition: string }[] = [];

  for (const { term, definition } of usable) {
    const pattern = new RegExp(`\\b${escapeRegex(term.trim())}\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = claimed.some((c) => start < c.end && end > c.start);
      if (!overlaps) claimed.push({ start, end, definition });
    }
  }

  if (claimed.length === 0) return [{ kind: "text", text }];
  claimed.sort((a, b) => a.start - b.start);

  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const { start, end, definition } of claimed) {
    if (start > cursor) segments.push({ kind: "text", text: text.slice(cursor, start) });
    segments.push({ kind: "term", text: text.slice(start, end), definition });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ kind: "text", text: text.slice(cursor) });

  return segments;
}

export function parseTerms(termsJson: string | null | undefined): GlossaryTerm[] {
  if (!termsJson) return [];
  try {
    const parsed = JSON.parse(termsJson);
    return Array.isArray(parsed) ? (parsed as GlossaryTerm[]) : [];
  } catch {
    return [];
  }
}
