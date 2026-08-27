import Link from "next/link";
import { Quote } from "lucide-react";
import type { PostListItem } from "@/lib/posts";
import TypeBadge from "@/components/TypeBadge";
import VoteButtons from "@/components/VoteButtons";
import ResearchProvenance from "@/components/ResearchProvenance";
import RetractedBadge from "@/components/RetractedBadge";
import AuthorDisplay from "@/components/AuthorDisplay";
import { timeAgo } from "@/lib/utils";

function snippetFor(post: PostListItem): string {
  const text = post.type === "RESEARCH" ? post.abstract : post.description;
  if (!text) return "";
  return text.length > 160 ? `${text.slice(0, 160)}…` : text;
}

export default function PostCard({
  post,
  isLoggedIn,
}: {
  post: PostListItem;
  isLoggedIn: boolean;
}) {
  return (
    <div className="flex gap-3 bg-panel/95 border border-border-strong rounded-lg px-3 py-3 shadow-sm hover:border-moss/50 transition-colors">
      <VoteButtons
        postId={post.id}
        score={post.score}
        userVote={post.userVote}
        isLoggedIn={isLoggedIn}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <TypeBadge type={post.type} />
          <Link
            href={`/?board=${post.board.slug}`}
            className="font-mono text-[10px] uppercase tracking-wide text-fg-muted hover:text-fg transition-colors"
          >
            F~{post.board.slug}
          </Link>
          {post.type === "RESEARCH" && (
            <ResearchProvenance source={post.source} sourceName={post.sourceName} />
          )}
          {post.retractedAt && <RetractedBadge />}
        </div>
        <Link href={`/post/${post.id}`} className="block">
          <h3 className="font-heading text-base font-medium text-fg leading-snug hover:text-moss transition-colors">
            {post.title}
          </h3>
        </Link>
        {snippetFor(post) && (
          <p className="text-sm text-fg-muted mt-1 line-clamp-2">{snippetFor(post)}</p>
        )}
        <div className="flex items-center gap-2 mt-2 font-mono text-[11px] text-fg-muted flex-wrap">
          <AuthorDisplay
            userId={post.author.id}
            name={post.author.name}
            hasVerifiedAffiliation={post.author._count.affiliations > 0}
            isAnonymous={post.isAnonymous}
            cowNumber={post.author.cowNumber}
          />
          <span>·</span>
          <span>{post._count.comments} comments</span>
          <span>·</span>
          <span>{timeAgo(post.createdAt)}</span>
          {post.type === "RESEARCH" && post.citationCount != null && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Quote size={11} /> {post.citationCount.toLocaleString()} citations
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
