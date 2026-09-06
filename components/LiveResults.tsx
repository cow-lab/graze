import { prisma } from "@/lib/prisma";
import { parseTerms } from "@/lib/jargon";
import { recordMetric } from "@/lib/metrics";
import { getCurrentUser } from "@/lib/session";
import { assignableFields, rankFields } from "@/lib/fieldMatch";
import { assessMany } from "@/lib/credibility";
import { searchLiterature } from "@/lib/liveSearch";
import { captureError } from "@/lib/errorReporting";
import LiveSearchResults from "@/components/LiveSearchResults";
import EmptyState from "@/components/EmptyState";
import RunningCowLoader from "@/components/RunningCowLoader";

// The live OpenAlex tier of a Discover search: everything in the literature, not just what
// Graze has imported. Split out of the old /search route when search stopped being a page
// of its own and became Discover's other half.

export default async function LiveResults({
  query,
  openAccessOnly,
  showFlagged = false,
}: {
  query: string;
  openAccessOnly: boolean;
  /** Set by the "show hidden" link — see the exclusion note below. */
  showFlagged?: boolean;
}) {
  const viewer = await getCurrentUser();

  let results;
  try {
    results = await searchLiterature(query, 1, { openAccessOnly });
  } catch (error) {
    // OpenAlex being down is not this person's problem to decode. No stack trace, no
    // error screen — just what happened and what to do.
    captureError({ error, source: "server", path: "/" });
    return (
      <EmptyState>
        The literature index isn&apos;t responding right now. This is on their end, not
        yours — try that search again in a minute.
      </EmptyState>
    );
  }

  recordMetric(openAccessOnly ? "search.open_access_only" : "search.all_results", {
    results: results.length,
  });

  if (results.length === 0) {
    return (
      <EmptyState>
        No {openAccessOnly && "free-to-read "}results for &ldquo;{query}&rdquo;.
        {openAccessOnly && " Try unchecking “Open access only” to include paywalled work."}
      </EmptyState>
    );
  }

  // Journal credibility for every result on the page: cached rows plus one bulk OpenAlex
  // call for journals we haven't seen. The per-journal sources (MEDLINE, DOAJ's full
  // record) are left for the paper page, where it's one lookup instead of twenty.
  const credibility = await assessMany(results.map((result) => result.issn));

  // Results whose journal carries an EXCLUDE-severity flag are held back rather than shown.
  // Held back, not deleted: the count and a way to see them stay on the page, because a
  // research tool that silently pretends papers don't exist is its own kind of dishonest.
  const flagged = results.filter(
    (result) => result.issn && credibility.get(result.issn)?.tier === "EXCLUDED",
  );
  const visible = showFlagged ? results : results.filter((result) => !flagged.includes(result));

  // Glossaries already generated for any of these papers (by someone opening "Chew on
  // this" earlier) let cards underline jargon for free. One batched lookup keyed by DOI —
  // no Claude call, and nothing is generated speculatively for a page of search results.
  const dois = visible.map((r) => r.doi).filter((d): d is string => !!d);
  const [fields, cachedGlossaries, boardRows] = await Promise.all([
    assignableFields(),
    dois.length
      ? prisma.researchExplainer.findMany({
          where: { doi: { in: dois } },
          select: { doi: true, termsJson: true },
        })
      : [],
    // Which of these results are already on the viewer's board — matched on DOI, covering
    // both external cards and results that have since been imported as posts.
    viewer && dois.length
      ? prisma.canvasCard.findMany({
          where: {
            userId: viewer.id,
            OR: [{ externalDoi: { in: dois } }, { post: { doi: { in: dois } } }],
          },
          select: { externalDoi: true, post: { select: { doi: true } } },
        })
      : [],
  ]);

  // The same keyword matcher The Combine runs, applied to every result up front, so each
  // "Add to Graze" opens with the Fields it belongs in already ticked. Pure string work
  // against Fields already in memory — no extra queries, no model call.
  const suggestionsByResult = visible.map((result) =>
    rankFields(
      { title: result.title, abstract: result.abstract, venue: result.venue },
      fields,
    ).map(({ slug, name, matched }) => ({ slug, name, matched })),
  );

  const termsByDoi = Object.fromEntries(
    cachedGlossaries.map((g) => [g.doi as string, parseTerms(g.termsJson)]),
  );
  const boardedDois = boardRows
    .map((r) => r.externalDoi ?? r.post?.doi)
    .filter((d): d is string => !!d);

  return (
    <>
      {flagged.length > 0 && !showFlagged && (
        <p className="mb-3 rounded-lg border border-border-strong bg-panel/95 px-3 py-2 text-xs text-fg-muted shadow-sm">
          {flagged.length} {flagged.length === 1 ? "result is" : "results are"} hidden — published
          in {flagged.length === 1 ? "a journal" : "journals"} flagged by a source we track.{" "}
          <a href="?flagged=1" className="text-moss underline">
            Show {flagged.length === 1 ? "it" : "them"} anyway
          </a>
        </p>
      )}
      <LiveSearchResults
        results={visible}
        credibility={Object.fromEntries(credibility)}
        boards={fields.map((f) => ({ slug: f.slug, name: f.name }))}
        suggestionsByResult={suggestionsByResult}
        isLoggedIn={!!viewer}
        boardedDois={boardedDois}
        termsByDoi={termsByDoi}
      />
    </>
  );
}

// Shown while OpenAlex is being queried — a live call over the network, routinely a second
// or two, and one of the two waits people actually watch. Card-shaped below the animation
// so the page doesn't jump when the real results land.
export function LiveResultsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <RunningCowLoader message="Grazing the archives…" className="mb-3" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className="bg-panel/95 border border-border-strong rounded-lg p-4 shadow-sm"
        >
          <span className="block h-3 w-24 rounded bg-panel-2 motion-safe:animate-pulse" />
          <span className="mt-3 block h-4 w-3/4 rounded bg-panel-2 motion-safe:animate-pulse" />
          <span className="mt-2 block h-3 w-1/2 rounded bg-panel-2 motion-safe:animate-pulse" />
          <span className="mt-3 block h-3 w-full rounded bg-panel-2 motion-safe:animate-pulse" />
          <span className="mt-1.5 block h-3 w-5/6 rounded bg-panel-2 motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  );
}
