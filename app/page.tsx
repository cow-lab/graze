import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getFeedPosts, getResearchPosts, getSidebarFields, parseSort } from "@/lib/posts";
import { getBoardedPostIds } from "@/lib/board";
import BoardSidebar from "@/components/BoardSidebar";
import DiscoverHero from "@/components/DiscoverHero";
import DiscoverSearch from "@/components/DiscoverSearch";
import FeedFilters from "@/components/FeedFilters";
import LiveResults, { LiveResultsSkeleton } from "@/components/LiveResults";
import PostCard from "@/components/PostCard";
import SectionHeading from "@/components/SectionHeading";
import EmptyState from "@/components/EmptyState";

const QUICK_LINK_FIELDS = 7;

// Discover is the homepage, and it's also the search page — there is no separate route for
// either. Three states, one component:
//
//   no params     the landing: wordmark, one search box, horizon strip.
//   ?q=…          the same page in its results state: library matches, then the live
//                 OpenAlex tier underneath.
//   ?board=…      browsing one Field, with the sidebar.
export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    oa?: string | string[];
    board?: string;
    sort?: string;
    flagged?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const viewerId = session?.user?.id;
  const query = params.q?.trim() ?? "";
  const sort = parseSort(params.sort);

  // The form posts a hidden "0" alongside the checkbox's "1", so an unchecked box still
  // sends a value; the last one wins.
  const oaRaw = Array.isArray(params.oa) ? params.oa[params.oa.length - 1] : params.oa;
  const openAccessOnly = oaRaw !== "0";

  // ---------------------------------------------------------------- results state
  if (query) {
    const libraryHits = await getResearchPosts({ search: query, sort: "cited", viewerId });
    const boardedIds = await getBoardedPostIds(viewerId, libraryHits.map((p) => p.id));

    return (
      <div className="mx-auto max-w-3xl">
        {/* On a panel, like every other page header: the results view sits on the full
            illustrated background, and bare text over hills and grass is unreadable. */}
        <div className="mb-6 flex items-center gap-4 rounded-lg border border-border-strong bg-panel/95 p-4 shadow-sm">
          <Link href="/" className="font-hand text-3xl font-bold leading-none text-ink">
            Graze
          </Link>
          <div className="min-w-0 flex-1">
            <DiscoverSearch initialQuery={query} openAccessOnly={openAccessOnly} size="compact" />
          </div>
        </div>

        <section aria-labelledby="library-heading" className="mb-8">
          <h2
            id="library-heading"
            className="mb-2 inline-flex rounded-md border border-border-strong bg-panel/95 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide text-fg-muted shadow-sm"
          >
            In Graze&apos;s library ({libraryHits.length})
          </h2>
          {libraryHits.length === 0 ? (
            <EmptyState>
              Nothing in the library matches &ldquo;{query}&rdquo; yet — the whole literature is
              below.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-2">
              {libraryHits.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isLoggedIn={!!session?.user}
                  isOnBoard={boardedIds.has(post.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="live-heading">
          <div className="mb-3 rounded-lg border border-border-strong bg-panel/95 px-3 py-2 shadow-sm">
            <h2
              id="live-heading"
              className="font-mono text-[11px] uppercase tracking-wide text-fg-muted"
            >
              Across all literature · OpenAlex
            </h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              Live results from 250M+ works. Nothing here is stored unless you keep it — adding
              one to the library runs it through the peer-review, DOAJ, and retraction checks.
            </p>
          </div>
          {/* Keyed on the query so a new search shows the loader again rather than leaving
              the previous results sitting there looking current. */}
          <Suspense
            key={`${query}:${openAccessOnly}:${params.flagged ?? ""}`}
            fallback={<LiveResultsSkeleton />}
          >
            <LiveResults
              query={query}
              openAccessOnly={openAccessOnly}
              showFlagged={params.flagged === "1"}
            />
          </Suspense>
        </section>
      </div>
    );
  }

  // ---------------------------------------------------------------- browse states
  const posts = await getFeedPosts({ boardSlug: params.board, sort, viewerId });
  const boardedIds = await getBoardedPostIds(viewerId, posts.map((p) => p.id));

  const list =
    posts.length === 0 ? (
      <EmptyState>No papers here yet.</EmptyState>
    ) : (
      <div className="flex flex-col gap-2">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            isLoggedIn={!!session?.user}
            isOnBoard={boardedIds.has(post.id)}
          />
        ))}
      </div>
    );

  // ---------------------------------------------------------------- landing
  // The hero is sized to end exactly at the fold, so the first screen is the search box and
  // nothing else — no heading or row of cards peeking up from below to pull the eye off it.
  // The papers are still here for anyone who scrolls.
  if (!params.board) {
    const { active } = await getSidebarFields();
    const quickLinks = [...active]
      .sort((a, b) => b._count.posts - a._count.posts)
      .slice(0, QUICK_LINK_FIELDS)
      .map((field) => ({ slug: field.slug, name: field.name }));

    return (
      <>
        <DiscoverHero fields={quickLinks} />
        <section className="mx-auto mt-10 max-w-3xl" aria-labelledby="latest-heading">
          <SectionHeading title={<span id="latest-heading">Across every field</span>} />
          <div className="mb-4">
            <FeedFilters activeSort={sort} />
          </div>
          {list}
        </section>
      </>
    );
  }

  // ---------------------------------------------------------------- one Field
  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
      <BoardSidebar activeSlug={params.board} />
      <div className="flex-1 min-w-0">
        <FeedFilters boardSlug={params.board} activeSort={sort} />
        {list}
      </div>
    </div>
  );
}
