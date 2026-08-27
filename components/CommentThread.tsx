import type { CommentNode } from "@/lib/comments";
import CommentVoteButtons from "@/components/CommentVoteButtons";
import CommentForm from "@/components/CommentForm";
import AuthorDisplay from "@/components/AuthorDisplay";
import { timeAgo } from "@/lib/utils";

export default function CommentThread({
  comment,
  postId,
  isLoggedIn,
  depth = 0,
}: {
  comment: CommentNode;
  postId: string;
  isLoggedIn: boolean;
  depth?: number;
}) {
  return (
    <div className={depth > 0 ? "pl-4 border-l border-border" : ""}>
      <div className="py-2">
        <div className="flex items-center gap-2 font-mono text-[11px] text-fg-muted flex-wrap">
          <AuthorDisplay
            userId={comment.author.id}
            name={comment.author.name}
            hasVerifiedAffiliation={comment.author._count.affiliations > 0}
            isAnonymous={comment.isAnonymous}
            cowNumber={comment.author.cowNumber}
          />
          <span>·</span>
          <span>{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-fg mt-1 whitespace-pre-wrap">{comment.body}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <CommentVoteButtons
            commentId={comment.id}
            postId={postId}
            score={comment.score}
            userVote={comment.userVote}
            isLoggedIn={isLoggedIn}
          />
          {isLoggedIn && (
            <details className="text-xs">
              <summary className="cursor-pointer text-fg-muted hover:text-fg transition-colors list-none">
                Reply
              </summary>
              <div className="mt-2 max-w-md">
                <CommentForm postId={postId} parentId={comment.id} autoFocus />
              </div>
            </details>
          )}
        </div>
      </div>
      {comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              postId={postId}
              isLoggedIn={isLoggedIn}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
