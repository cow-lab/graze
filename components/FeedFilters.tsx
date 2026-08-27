import Link from "next/link";
import type { PostType } from "@prisma/client";
import { tabClass } from "@/lib/tabStyles";
import type { SortOption } from "@/lib/posts";

const TYPE_TABS: { label: string; type?: PostType }[] = [
  { label: "Feed" },
  { label: "Research", type: "RESEARCH" },
  { label: "Posts", type: "POST" },
];

// "Hot" (time-decayed) is the default landing sort — "Top" (all-time votes) and "New"
// (pure recency) stay as explicit, separate options rather than replacing it.
const SORT_TABS: { label: string; sort: SortOption }[] = [
  { label: "Hot", sort: "hot" },
  { label: "Top", sort: "top" },
  { label: "New", sort: "new" },
];

function buildHref(params: { board?: string; type?: PostType; sort?: SortOption }) {
  const search = new URLSearchParams();
  if (params.board) search.set("board", params.board);
  if (params.type) search.set("type", params.type);
  if (params.sort && params.sort !== "hot") search.set("sort", params.sort);
  const qs = search.toString();
  return qs ? `/?${qs}` : "/";
}

export default function FeedFilters({
  boardSlug,
  activeType,
  activeSort,
}: {
  boardSlug?: string;
  activeType?: PostType;
  activeSort: SortOption;
}) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
      <div className="flex items-center gap-2">
        {TYPE_TABS.map((tab) => (
          <Link
            key={tab.label}
            href={buildHref({ board: boardSlug, type: tab.type, sort: activeSort })}
            className={tabClass(activeType === tab.type)}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {SORT_TABS.map((tab) => (
          <Link
            key={tab.label}
            href={buildHref({ board: boardSlug, type: activeType, sort: tab.sort })}
            className={tabClass(activeSort === tab.sort)}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
