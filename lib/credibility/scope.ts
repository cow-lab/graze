// A journal title that claims to cover everything is a documented pattern among low-quality
// publishers ("International Journal of Advanced Research in Science, Engineering and
// Technology"). It is also, on its own, close to meaningless: the International Journal of
// Cancer is a real and well-regarded journal, and half the respectable literature is
// published in something calling itself "international".
//
// So this returns an observation, never a verdict. The rule the assessment applies is that
// a broad-sounding name matters only when every index we can check has also failed to find
// the journal — the pattern plus an absence, not the pattern alone. Nothing here can hide a
// result by itself.

// Words that claim reach rather than describe a subject.
const REACH_WORDS = [
  "international",
  "global",
  "world",
  "universal",
  "advanced",
  "innovative",
  "modern",
  "emerging",
  "novel",
  "pioneering",
];

// Words that name no field at all.
const VAGUE_WORDS = [
  "multidisciplinary",
  "interdisciplinary",
  "all sciences",
  "general science",
  "applied sciences",
  "scientific research",
  "academic research",
  "current research",
  "research and development",
];

// Distinct domains conjoined in one title — "Science, Engineering and Technology".
const DOMAIN_WORDS = [
  "science",
  "sciences",
  "engineering",
  "technology",
  "management",
  "medicine",
  "humanities",
  "education",
  "computing",
  "mathematics",
  "business",
  "arts",
];

export type ScopeObservation = { score: number; matched: string[] };

function has(haystack: string, term: string): boolean {
  return new RegExp(`(^|[^a-z])${term}([^a-z]|$)`, "i").test(haystack);
}

export function scopeBreadth(title: string | null | undefined): ScopeObservation {
  if (!title) return { score: 0, matched: [] };
  const name = title.toLowerCase();
  const matched: string[] = [];
  let score = 0;

  for (const word of REACH_WORDS) {
    if (has(name, word)) {
      matched.push(word);
      score += 1;
    }
  }
  for (const phrase of VAGUE_WORDS) {
    if (name.includes(phrase)) {
      matched.push(phrase);
      score += 2;
    }
  }

  // Three or more domains in one title is the "we publish anything" tell. Two is normal
  // and legitimate — "Science and Technology", "Business and Management".
  const domains = DOMAIN_WORDS.filter((domain) => has(name, domain));
  if (domains.length >= 3) {
    matched.push(`${domains.length} fields in one title`);
    score += 2;
  }

  return { score, matched };
}

// Chosen against real journal names rather than picked from the air — see the check in the
// commit that added this. Below 3, legitimate journals dominate the matches.
export const BROAD_SCOPE_THRESHOLD = 3;
