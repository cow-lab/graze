import Link from "next/link";
import { Quote } from "lucide-react";
import type { PostListItem } from "@/lib/posts";
import ResearchProvenance from "@/components/ResearchProvenance";
import RetractedBadge from "@/components/RetractedBadge";
import AuthorDisplay from "@/components/AuthorDisplay";
import VoteButtons from "@/components/VoteButtons";

export default function ResearchCard({
  post,
  isLoggedIn,
}: {
  post: PostListItem;
  isLoggedIn: boolean;
}) {
  return (
    <div className="flex gap-3 bg-panel/95 border border-border-strong rounded-lg px-4 py-3 shadow-sm hover:border-moss/50 transition">
      <VoteButtons
        postId={post.id}
        score={post.score}
        userVote={post.userVote}
        isLoggedIn={isLoggedIn}
      />
      <Link href={`/post/${post.id}`} className="flex-1 min-w-0 block">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <ResearchProvenance source={post.source} sourceName={post.sourceName} />
          {post.retractedAt && <RetractedBadge />}
        </div>
        <h3 className="font-heading text-base font-semibold leading-snug text-ink">{post.title}</h3>
        <p className="text-sm text-fg-muted mt-0.5">
          {post.authors} · {post.field} · {post.year}
          {post.citationCount != null && (
            <>
              {" · "}
              <span className="inline-flex items-center gap-1 align-middle">
                <Quote size={11} /> {post.citationCount.toLocaleString()} citations
              </span>
            </>
          )}
        </p>
        <div className="flex items-center gap-3 mt-2 font-mono text-[11px] text-fg-muted flex-wrap">
          <AuthorDisplay
            userId={post.author.id}
            name={post.author.name}
            hasVerifiedAffiliation={post.author._count.affiliations > 0}
            isAnonymous={post.isAnonymous}
            cowNumber={post.author.cowNumber}
            linkToProfile={false}
          />
          <span>·</span>
          <span>{post.viewCount} views</span>
          <span>·</span>
          <span>F~{post.board.slug}</span>
        </div>
      </Link>
    </div>
  );
}
