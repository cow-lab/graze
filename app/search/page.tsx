import { searchLiterature } from "@/lib/liveSearch";
import { getBoardsWithCounts } from "@/lib/posts";
import LiveSearchResults from "@/components/LiveSearchResults";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";

  const [boards, results] = await Promise.all([
    getBoardsWithCounts(),
    query ? searchLiterature(query) : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-panel/95 border border-border-strong rounded-lg p-5 shadow-sm mb-6">
        <h1 className="font-heading text-2xl font-semibold mb-1">Search all literature</h1>
        <p className="text-sm text-fg-muted mb-4">
          Live results from OpenAlex&apos;s open index of 250M+ scholarly works — the whole
          literature, not just what&apos;s been added to Graze. Nothing here is stored unless
          you click &ldquo;Add to Graze&rdquo; on a specific result.
        </p>

        <form action="/search" className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search titles, authors, topics…"
            className="flex-1 bg-panel-2 border border-border rounded-md px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-moss"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-panel-2 border border-border text-sm text-fg hover:border-moss transition"
          >
            Search
          </button>
        </form>
      </div>

      {!query ? (
        <p className="text-sm text-fg-muted">Enter a search to query the live literature index.</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-fg-muted">No results for &ldquo;{query}&rdquo;.</p>
      ) : (
        <LiveSearchResults results={results} boards={boards.map((b) => ({ slug: b.slug, name: b.name }))} />
      )}
    </div>
  );
}
