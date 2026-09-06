import { prisma } from "@/lib/prisma";

// One keyword matcher, used everywhere a paper can enter the library: The Combine's
// automated ingestion, "Add to Graze" from live search, manual submission, and the
// backfill that runs when a new Field is created.
//
// It's the comparison The Combine always did — a paper's own words against a Field's
// `searchKeywordsJson` — pulled out so the other three entry points stop each having their
// own answer (or, in two cases, no answer at all).
//
// Deliberately dumb and inspectable: substring matching on word boundaries, a title hit
// worth more than an abstract hit, and the matched keywords returned so the UI can show
// its work. Nothing here asks a model what a paper is about.

const TITLE_WEIGHT = 2;
const BODY_WEIGHT = 1;

/** Below this, a single incidental keyword hit isn't worth pre-selecting a Field over. */
export const MIN_SCORE_TO_SUGGEST = 2;
export const MAX_SUGGESTIONS = 3;

export type FieldSuggestion = {
  slug: string;
  name: string;
  score: number;
  /** The keywords that actually hit, so the UI can say why this Field is suggested. */
  matched: string[];
};

export type PaperText = {
  title: string;
  abstract?: string | null;
  /** Journal/venue name, and OpenAlex topic labels when the source gave us any. */
  venue?: string | null;
  topics?: string[];
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ");
}

// Word-boundary match, so "AI" doesn't fire on "said" and "gene" doesn't fire on "generic".
function containsKeyword(haystack: string, keyword: string): boolean {
  const term = normalize(keyword).trim();
  if (!term) return false;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
}

export function parseKeywords(searchKeywordsJson: string): string[] {
  try {
    const parsed = JSON.parse(searchKeywordsJson);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

export function scoreField(paper: PaperText, keywords: string[]): { score: number; matched: string[] } {
  const title = normalize(paper.title);
  const body = normalize(
    [paper.abstract ?? "", paper.venue ?? "", ...(paper.topics ?? [])].join(" "),
  );

  let score = 0;
  const matched: string[] = [];
  for (const keyword of keywords) {
    const inTitle = containsKeyword(title, keyword);
    const inBody = containsKeyword(body, keyword);
    if (!inTitle && !inBody) continue;
    score += inTitle ? TITLE_WEIGHT : BODY_WEIGHT;
    matched.push(keyword);
  }
  return { score, matched };
}

export type MatchableField = {
  id: string;
  slug: string;
  name: string;
  searchKeywordsJson: string;
};

// The pure half, so callers that already hold the Fields (The Combine mid-run, the
// backfill) don't re-query for each paper.
export function rankFields(
  paper: PaperText,
  fields: MatchableField[],
  opts: { minScore?: number; limit?: number } = {},
): (FieldSuggestion & { id: string })[] {
  const minScore = opts.minScore ?? MIN_SCORE_TO_SUGGEST;
  const limit = opts.limit ?? MAX_SUGGESTIONS;

  return fields
    .map((field) => {
      const { score, matched } = scoreField(paper, parseKeywords(field.searchKeywordsJson));
      return { id: field.id, slug: field.slug, name: field.name, score, matched };
    })
    .filter((match) => match.score >= minScore)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// Fields open to new papers. Archived and suspended ones are excluded for the same reason
// they're excluded from the Field picker: one is closed to new contributions, the other is
// a moderation action.
export async function assignableFields(): Promise<MatchableField[]> {
  return prisma.board.findMany({
    where: { status: { in: ["ACTIVE", "PROVISIONAL"] } },
    select: { id: true, slug: true, name: true, searchKeywordsJson: true },
    orderBy: { name: "asc" },
  });
}

export async function suggestFieldsFor(
  paper: PaperText,
  opts: { minScore?: number; limit?: number } = {},
): Promise<(FieldSuggestion & { id: string })[]> {
  return rankFields(paper, await assignableFields(), opts);
}
