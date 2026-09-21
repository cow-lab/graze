import type { PredatoryEntryKind } from "@prisma/client";

// Stop Predatory Journals — the practical free successor to Beall's List.
//
// The site is a Google Sites page, which at first looks like an HTML scrape. It isn't: the
// lists are embedded Google Sheets, and a published sheet exports clean CSV from a stable
// endpoint. So this reads structured data, not markup that can be restyled out from under
// us. The sheet IDs are the one brittle part, and a changed ID fails loudly (zero rows)
// rather than quietly returning nothing useful — see the safety rails in sync().
//
// ─── The thing that makes this dangerous ────────────────────────────────────────────────
//
// The list identifies journals by NAME, not ISSN, and 343 of its ~2,780 journal entries are
// a single word. Many of those are also the names of entirely legitimate, DOAJ-listed
// journals: Acoustics, Agronomy, Aerospace, Aging, AI. A naive exact-name match would
// hard-flag and suppress real research — the worst failure this feature can have, and it
// would look exactly like the system working.
//
// Two defences, both applied at sync time so they're visible in the data rather than buried
// in matching logic:
//
//   1. An entry whose name is too generic to identify a journal on its own is marked
//      `ambiguous`. Ambiguous entries can never hard-flag; they produce a CAUTION flag,
//      which withholds VERIFIED and asks for a human look, but never suppresses a result.
//   2. A match against a journal that a reputable index already vouches for is a conflict
//      between two sources. This project's existing rule applies: it does not pick a
//      winner, it routes to a person.

const JOURNALS_SHEET = "1Qa1lAlSbl7iiKddYINNsDB4wxI7uUA4IVseeLnCc5U4";
const PUBLISHERS_SHEET = "1BHM4aJljhbOAzSpkX1kXDUEvy6vxREZu5WJaDH6M1Vk";

export const PREDATORY_LIST_SOURCE = "Stop Predatory Journals";
export const PREDATORY_LIST_URL = "https://www.predatoryjournals.org/the-list/journals";

/**
 * A name needs at least this many characters to hard-flag on its own, even with two tokens.
 * "AI" and "Air" are on the list; so are real journals with those names.
 */
const MIN_CONFIDENT_LENGTH = 14;

export type PredatoryEntry = { kind: PredatoryEntryKind; name: string; normalized: string; ambiguous: boolean };

/**
 * Normalised form used for matching.
 *
 * Deliberately conservative: it lowercases, strips punctuation and a leading article, and
 * collapses whitespace — but it does not stem, drop stopwords, or do anything fuzzy.
 * Matching is exact on this string. Substring or fuzzy matching would turn "Acoustics" into
 * a match for "Applied Acoustics", which is a different, legitimate journal.
 */
export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^(the|a|an)\s+/, "")
    .trim()
    .replace(/\s+/g, " ");
}

/** Whether a name is too generic to carry a hard flag by itself. */
export function isAmbiguousName(normalized: string): boolean {
  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  if (tokens.length === 1) return true;
  return normalized.length < MIN_CONFIDENT_LENGTH;
}

function csvUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
}

/**
 * Minimal CSV row splitter. The sheets are two columns — an index and a name — with names
 * that contain commas and quotes, so a naive split on "," corrupts them.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

async function fetchSheet(sheetId: string, kind: PredatoryEntryKind): Promise<PredatoryEntry[]> {
  const res = await fetch(csvUrl(sheetId), { redirect: "follow" });
  if (!res.ok) throw new Error(`${kind} sheet returned ${res.status}`);
  const text = await res.text();

  // A published sheet that has been unshared returns an HTML sign-in page with a 200, so
  // the status code alone isn't enough to know the fetch succeeded.
  if (/^\s*</.test(text)) {
    throw new Error(`${kind} sheet returned HTML, not CSV — the sheet may no longer be public`);
  }

  const seen = new Set<string>();
  const entries: PredatoryEntry[] = [];
  for (const row of parseCsv(text)) {
    // Column 0 is a row number; the name is the last non-empty cell.
    const name = [...row].reverse().find((c) => c.trim() && !/^\d+$/.test(c.trim()))?.trim();
    if (!name) continue;
    const normalized = normalizeName(name);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    entries.push({ kind, name, normalized, ambiguous: isAmbiguousName(normalized) });
  }
  return entries;
}

export async function fetchPredatoryList(): Promise<{
  journals: PredatoryEntry[];
  publishers: PredatoryEntry[];
}> {
  const [journals, publishers] = await Promise.all([
    fetchSheet(JOURNALS_SHEET, "JOURNAL"),
    fetchSheet(PUBLISHERS_SHEET, "PUBLISHER"),
  ]);
  return { journals, publishers };
}
