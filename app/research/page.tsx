import Link from "next/link";
import { Telescope } from "lucide-react";
import { auth } from "@/lib/auth";
import { getResearchPosts, type SortOption } from "@/lib/posts";
import ResearchCard from "@/components/ResearchCard";
import { tabClass } from "@/lib/tabStyles";

const SORT_OPTIONS: SortOption[] = ["hot", "new", "top"];

export default async function ResearchLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const sort: SortOption = SORT_OPTIONS.includes(params.sort as SortOption)
    ? (params.sort as SortOption)
    : "hot";

  const posts = await getResearchPosts({
    search: params.q,
    sort,
    viewerId: session?.user?.id,
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-panel/95 border border-border-strong rounded-lg p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-1">
          <h1 className="font-heading text-2xl font-semibold">Research library</h1>
          <Link
            href="/submit?type=RESEARCH"
            className="px-3 py-1.5 rounded-md bg-teal text-ink text-sm font-medium hover:brightness-110 transition"
          >
            Submit a paper
          </Link>
        </div>
        <p className="text-sm text-fg-muted mb-1">
          A searchable index of research posted across every field.
        </p>
        <p className="text-sm mb-4">
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 text-moss hover:underline font-medium"
          >
            <Telescope size={14} /> Search all literature (250M+ works via OpenAlex) →
          </Link>
        </p>

        <form action="/research" className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={params.q}
            placeholder="Search by title, author, or field…"
            className="flex-1 bg-panel-2 border border-border rounded-md px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-moss"
          />
          {sort !== "hot" && <input type="hidden" name="sort" value={sort} />}
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-panel-2 border border-border text-sm text-fg hover:border-moss transition"
          >
            Search
          </button>
        </form>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Link
          href={{ pathname: "/research", query: { q: params.q, sort: "hot" } }}
          className={tabClass(sort === "hot")}
        >
          Hot
        </Link>
        <Link
          href={{ pathname: "/research", query: { q: params.q, sort: "top" } }}
          className={tabClass(sort === "top")}
        >
          Top
        </Link>
        <Link
          href={{ pathname: "/research", query: { q: params.q, sort: "new" } }}
          className={tabClass(sort === "new")}
        >
          Recent
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-fg-muted">No papers match your search yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {posts.map((post) => (
            <ResearchCard key={post.id} post={post} isLoggedIn={!!session?.user} />
          ))}
        </div>
      )}
    </div>
  );
}
