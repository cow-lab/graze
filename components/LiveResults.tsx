import { prisma } from "@/lib/prisma";
import { parseTerms } from "@/lib/jargon";
import { recordMetric } from "@/lib/metrics";
import { getCurrentUser } from "@/lib/session";
import { assignableFields, rankFields } from "@/lib/fieldMatch";
import { journalFactsMany } from "@/lib/credibility";
import { classify } from "@/lib/credibility/classify";
import { assess } from "@/lib/credibility/assess";
import { rankByCredibility } from "@/lib/credibility/rank";
import { classifyWork } from "@/lib/combine/reliability";
import { isDoiRetracted } from "@/lib/combine/retractionWatch";
import { assessLiveResults } from "@/lib/liveFieldTested";
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
  const facts = await journalFactsMany(results.map((result) => result.issn));

  // The per-DOI retraction lookup, batched. Cached for a week by withCachedFact, so a
  // repeated search costs nothing — but it has to happen before ranking, because a
  // retraction is the one signal allowed to remove a result from the default list.
  const retractions = await Promise.all(
    results.map((result) => (result.doi ? isDoiRetracted(result.doi) : Promise.resolve(null))),
  );

  // One classification per result, from the paper's own facts plus its journal's. This is
  // the same function the badge reads, so what someone is told about a paper and where it
  // ends up in the list can't disagree.
  const classified = results.map((result, i) =>
    classify(
      {
        workKind: classifyWork({ workType: result.workType }),
        retracted: retractions[i],
        citationCount: result.citationCount,
      },
      (result.issn && facts.get(result.issn)) || null,
    ),
  );

  // Credibility as a ranking input rather than a badge: FLAGGED held back (not deleted —
  // the count and a way to see them stay on the page), and VERIFIED work that is cited
  // less than its page peers moves up. UNVERIFIED is never penalised.
  const ranked = rankByCredibility(
    results.map((result, i) => ({
      item: result,
      classification: classified[i],
      citationCount: result.citationCount,
    })),
    { includeFlagged: showFlagged },
  );
  const visible = ranked.results;
  const flaggedHeld = ranked.flaggedHeld;
  // The badge UI still reads the older Assessment shape. Derived from the same facts here
  // rather than re-fetched, so the badge and the ranking are looking at one set of data —
  // migrating the badge to render classify()'s signal list directly is the next step.
  const credibility = new Map([...facts].map(([issn, record]) => [issn, assess(record)]));

  // Glossaries already generated for any of these papers (by someone opening "Chew on
  // this" earlier) let cards underline jargon for free. One batched lookup keyed by DOI —
  // no Claude call, and nothing is generated speculatively for a page of search results.
  const dois = visible.map((r) => r.doi).filter((d): d is string => !!d);
  const [fields, cachedGlossaries, boardRows, fieldTestedByResult] = await Promise.all([
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
    // Discover is where Graze promises checked research — run the same reliability policy
    // The Combine applies at import time against every visible result now, so the badge
    // shows the real state instead of a "Not yet checked" placeholder that only resolves
    // once someone clicks "Add to Graze".
    assessLiveResults(visible),
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
      {flaggedHeld > 0 && !showFlagged && (
        <p className="mb-3 rounded-lg border border-border-strong bg-panel/95 px-3 py-2 text-xs text-fg-muted shadow-sm">
          {flaggedHeld} {flaggedHeld === 1 ? "result is" : "results are"} hidden — either
          retracted, or published in {flaggedHeld === 1 ? "a journal" : "journals"} flagged by
          a source we track.{" "}
          <a href="?flagged=1" className="text-moss underline">
            Show {flaggedHeld === 1 ? "it" : "them"} anyway
          </a>
        </p>
      )}
      <LiveSearchResults
        results={visible}
        credibility={Object.fromEntries(credibility)}
        boards={fields.map((f) => ({ slug: f.slug, name: f.name }))}
        suggestionsByResult={suggestionsByResult}
        fieldTestedByResult={fieldTestedByResult}
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
