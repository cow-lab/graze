import { auth } from "@/lib/auth";
import { getFeedPosts, type SortOption } from "@/lib/posts";
import BoardSidebar from "@/components/BoardSidebar";
import FeedFilters from "@/components/FeedFilters";
import PostCard from "@/components/PostCard";
import type { PostType } from "@prisma/client";

const SORT_OPTIONS: SortOption[] = ["hot", "new", "top"];

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string; type?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();

  const type = ["RESEARCH", "POST"].includes(params.type ?? "")
    ? (params.type as PostType)
    : undefined;
  const sort: SortOption = SORT_OPTIONS.includes(params.sort as SortOption)
    ? (params.sort as SortOption)
    : "hot";

  const posts = await getFeedPosts({
    boardSlug: params.board,
    type,
    sort,
    viewerId: session?.user?.id,
  });

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
      <BoardSidebar activeSlug={params.board} />
      <div className="flex-1 min-w-0">
        <FeedFilters boardSlug={params.board} activeType={type} activeSort={sort} />
        {posts.length === 0 ? (
          <p className="text-sm text-fg-muted px-1">No posts here yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} isLoggedIn={!!session?.user} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
