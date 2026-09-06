// Did this reader open "Chew on this" for this paper in this sitting? The source link and
// the explainer are siblings in different parts of the page (and on the search page, in
// different cards), so the flag is parked in sessionStorage rather than threaded through
// props. Session-scoped on purpose: "clicked through after reading the summary" is a claim
// about one visit, not a permanent property of the user.

const KEY = "graze.chewed";

function read(): string[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    // Private-mode browsers and blocked storage both throw here. Losing the flag just
    // means a click-through is counted without the "after chew" qualifier.
    return [];
  }
}

export function markChewed(paperKey: string | null | undefined) {
  if (!paperKey) return;
  try {
    const list = read();
    if (!list.includes(paperKey)) sessionStorage.setItem(KEY, JSON.stringify([...list, paperKey]));
  } catch {
    /* see above */
  }
}

export function hasChewed(paperKey: string | null | undefined): boolean {
  if (!paperKey) return false;
  return read().includes(paperKey);
}
