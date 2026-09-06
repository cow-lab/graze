// Field slugs are what get shown as "F~Something" all over the UI and used in URLs, so
// they need an upper bound. Without one, a Combine-suggested Field named after a verbose
// OpenAlex topic ("Membrane Separation and Gas Transport") produces a 33-character
// PascalCase slug with no break opportunity — nothing in the layout can wrap it. The
// display layer truncates as a backstop; this keeps the stored value sane in the first
// place. The Field's full `name` is unaffected — only the short identifier is capped.
const MAX_SLUG_LENGTH = 24;

export function slugify(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

  let slug = "";
  for (const word of words) {
    const next = `${slug}${word}`.replace(/[^a-zA-Z0-9]/g, "");
    // Stop at a word boundary once adding the next word would exceed the cap — but always
    // take at least one word, so a single very long word still yields a (hard-cut) slug.
    if (slug && next.length > MAX_SLUG_LENGTH) break;
    slug = next;
  }

  return slug.slice(0, MAX_SLUG_LENGTH);
}
