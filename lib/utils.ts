export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export function scoreFromVotes(upCount: number, downCount: number): number {
  return upCount - downCount;
}

// Author lists on a card, shortened the way a citation would be. Papers with hundreds of
// listed authors are normal in astronomy and particle physics — the Gaia mission paper in
// the seed data has over a hundred — and printing all of them turned one card into ten
// screens of names. The paper's own page still shows the full list, where it belongs.
const MAX_CARD_AUTHORS = 5;

export function formatAuthors(authors: string | null, max = MAX_CARD_AUTHORS): string {
  if (!authors) return "";
  const names = authors
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} + ${names.length - max} more`;
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
