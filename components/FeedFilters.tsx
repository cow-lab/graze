import Link from "next/link";
import { tabClass } from "@/lib/tabStyles";
import { DEFAULT_SORT, SORT_LABELS, type SortOption } from "@/lib/posts";

const SORT_TABS: SortOption[] = ["cited", "discussed", "new"];

function buildHref(params: { board?: string; sort?: SortOption }) {
  const search = new URLSearchParams();
  if (params.board) search.set("board", params.board);
  if (params.sort && params.sort !== DEFAULT_SORT) search.set("sort", params.sort);
  const qs = search.toString();
  return qs ? `/?${qs}` : "/";
}

export default function FeedFilters({
  boardSlug,
  activeSort,
}: {
  boardSlug?: string;
  activeSort: SortOption;
}) {
  return (
    <div className="flex items-center justify-end gap-2 flex-wrap mb-4">
      {SORT_TABS.map((sort) => (
        <Link
          key={sort}
          href={buildHref({ board: boardSlug, sort })}
          className={tabClass(activeSort === sort)}
        >
          {SORT_LABELS[sort]}
        </Link>
      ))}
    </div>
  );
}
