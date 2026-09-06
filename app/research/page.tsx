import Link from "next/link";
import { auth } from "@/lib/auth";
import { getResearchPosts, parseSort, DEFAULT_SORT, SORT_LABELS, type SortOption } from "@/lib/posts";
import { getBoardedPostIds } from "@/lib/board";
import ResearchCard from "@/components/ResearchCard";
import { tabClass } from "@/lib/tabStyles";
import EmptyState from "@/components/EmptyState";

const SORT_TABS: SortOption[] = ["cited", "discussed", "new"];

export default async function ResearchLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const sort = parseSort(params.sort);

  const posts = await getResearchPosts({
    search: params.q,
    sort,
    viewerId: session?.user?.id,
  });
  const boardedIds = await getBoardedPostIds(session?.user?.id, posts.map((p) => p.id));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-panel/95 border border-border-strong rounded-lg p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-1">
          <h1 className="font-heading text-2xl font-semibold">Research library</h1>
          <Link
            href="/submit"
            className="px-3 py-1.5 rounded-md bg-teal text-white text-sm font-medium hover:brightness-110 transition"
          >
            Submit a paper
          </Link>
        </div>
        <p className="text-sm text-fg-muted mb-4">
          Everything here was posted deliberately — imported by The Combine and approved,
          submitted by someone, or added from a search. Nothing appears in this library just
          because it exists in an academic index.
        </p>

        {/* A filter over what's already here, not a search of the literature. The one box
            that queries OpenAlex lives on the homepage; putting a second, near-identical
            box here would blur exactly the line this page exists on one side of. */}
        <form action="/research" className="flex gap-2">
          <label htmlFor="library-filter" className="sr-only">
            Filter this library by title, author, or field
          </label>
          <input
            id="library-filter"
            type="text"
            name="q"
            defaultValue={params.q}
            placeholder="Filter this library…"
            className="flex-1 bg-panel-2 border border-border rounded-md px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-moss"
          />
          {sort !== DEFAULT_SORT && <input type="hidden" name="sort" value={sort} />}
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-panel-2 border border-border text-sm text-fg hover:border-moss transition"
          >
            Filter
          </button>
        </form>
        <p className="mt-2 text-xs text-fg-muted">
          Looking for something that isn&apos;t here yet?{" "}
          <Link href="/" className="text-moss hover:underline">
            Search the whole literature from the homepage
          </Link>{" "}
          — anything you add there lands in this library.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {SORT_TABS.map((option) => (
          <Link
            key={option}
            href={{
              pathname: "/research",
              query: { q: params.q, sort: option === DEFAULT_SORT ? undefined : option },
            }}
            className={tabClass(sort === option)}
          >
            {SORT_LABELS[option]}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <EmptyState>
          {params.q
            ? `Nothing in the library matches “${params.q}”. It may still be out there — search the whole literature from the homepage.`
            : "No papers in the library yet."}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {posts.map((post) => (
            <ResearchCard
              key={post.id}
              post={post}
              isLoggedIn={!!session?.user}
              isOnBoard={boardedIds.has(post.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
