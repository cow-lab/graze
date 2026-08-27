import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPostDetail } from "@/lib/posts";
import { getCommentTree } from "@/lib/comments";
import { recordView } from "@/lib/actions/posts";
import TypeBadge from "@/components/TypeBadge";
import VoteButtons from "@/components/VoteButtons";
import ExplainerPanel from "@/components/ExplainerPanel";
import CommentForm from "@/components/CommentForm";
import CommentThread from "@/components/CommentThread";
import ResearchProvenance from "@/components/ResearchProvenance";
import RetractedBadge from "@/components/RetractedBadge";
import AuthorDisplay from "@/components/AuthorDisplay";
import { Quote } from "lucide-react";
import DeletePostButton from "@/components/DeletePostButton";
import { timeAgo } from "@/lib/utils";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const post = await getPostDetail(id, session?.user?.id);
  if (!post) notFound();

  const isLoggedIn = !!session?.user;
  const isAuthor = session?.user?.id === post.author.id;

  if (post.type === "RESEARCH") {
    await recordView(post.id);
  }

  const comments = await getCommentTree(post.id, session?.user?.id);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="bg-panel/95 border border-border-strong rounded-lg p-5 shadow-sm">
        <div className="flex gap-4">
          <VoteButtons
            postId={post.id}
            score={post.score}
            userVote={post.userVote}
            isLoggedIn={isLoggedIn}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
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
              {isAuthor && <DeletePostButton postId={post.id} />}
            </div>
            <h1 className="font-heading text-2xl font-semibold leading-tight">{post.title}</h1>
            <div className="flex items-center gap-2 mt-2 font-mono text-[11px] text-fg-muted flex-wrap">
              <AuthorDisplay
                userId={post.author.id}
                name={post.author.name}
                hasVerifiedAffiliation={post.author._count.affiliations > 0}
                isAnonymous={post.isAnonymous}
                cowNumber={post.author.cowNumber}
              />
              <span>·</span>
              <span>{timeAgo(post.createdAt)}</span>
              {post.type === "RESEARCH" && (
                <>
                  <span>·</span>
                  <span>{post.viewCount} views</span>
                </>
              )}
            </div>

            {post.type === "RESEARCH" && (
              <div className="mt-4 flex flex-col gap-4">
                <div className="font-mono text-xs text-fg-muted flex flex-wrap gap-x-4 gap-y-1">
                  <span>Authors: {post.authors}</span>
                  <span>Field: {post.field}</span>
                  <span>Year: {post.year}</span>
                  {post.doi && <span>DOI: {post.doi}</span>}
                  {post.citationCount != null && (
                    <span className="inline-flex items-center gap-1">
                      <Quote size={11} /> {post.citationCount.toLocaleString()} citations
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.abstract}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {post.externalUrl && (
                    <a
                      href={post.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-md border border-border text-sm text-fg hover:border-moss hover:text-moss transition"
                    >
                      View external link ↗
                    </a>
                  )}
                  {post.fileUrl && (
                    <a
                      href={post.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-md border border-border text-sm text-fg hover:border-moss hover:text-moss transition"
                    >
                      Download PDF ↓
                    </a>
                  )}
                  {post.explainer && (
                    <ExplainerPanel
                      postId={post.id}
                      summary={post.explainer.summary}
                      terms={JSON.parse(post.explainer.termsJson)}
                      quiz={JSON.parse(post.explainer.quizJson)}
                      isDemo={post.explainer.isDemo}
                    />
                  )}
                </div>

                {post.referencingPosts.length > 0 && (
                  <div>
                    <h3 className="font-mono text-[11px] uppercase tracking-wide text-fg-muted mb-2">
                      Posts referencing this paper ({post.referencingPosts.length})
                    </h3>
                    <ul className="flex flex-col gap-1.5">
                      {post.referencingPosts.map((s) => (
                        <li key={s.id}>
                          <Link
                            href={`/post/${s.id}`}
                            className="text-sm text-fg hover:text-moss transition-colors"
                          >
                            {s.title}
                          </Link>
                          <span className="font-mono text-[11px] text-fg-muted ml-2">
                            by{" "}
                            <AuthorDisplay
                              userId={s.author.id}
                              name={s.author.name}
                              hasVerifiedAffiliation={s.author._count.affiliations > 0}
                              isAnonymous={s.isAnonymous}
                              cowNumber={s.author.cowNumber}
                            />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {post.type === "POST" && (
              <div className="mt-4 flex flex-col gap-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.description}</p>
                {post.refPost && (
                  <Link
                    href={`/post/${post.refPost.id}`}
                    className="inline-flex items-center gap-1.5 text-sm text-teal hover:underline w-fit"
                  >
                    <TypeBadge type={post.refPost.type} />
                    Responding to: {post.refPost.title}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-panel/95 border border-border-strong rounded-lg p-5 shadow-sm">
        <h2 className="font-heading text-base font-semibold mb-3">
          {post._count.comments} Comments
        </h2>
        {isLoggedIn ? (
          <CommentForm postId={post.id} />
        ) : (
          <p className="text-sm text-fg-muted">
            <Link href="/login" className="text-moss hover:underline">
              Log in
            </Link>{" "}
            to join the discussion.
          </p>
        )}
        <div className="mt-4 flex flex-col divide-y divide-border">
          {comments.map((c) => (
            <CommentThread key={c.id} comment={c} postId={post.id} isLoggedIn={isLoggedIn} />
          ))}
        </div>
      </div>
    </div>
  );
}
