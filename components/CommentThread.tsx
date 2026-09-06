import { BookOpenCheck, CircleCheck } from "lucide-react";
import type { CommentNode } from "@/lib/comments";
import CommentVoteButtons from "@/components/CommentVoteButtons";
import CommentForm from "@/components/CommentForm";
import AuthorDisplay from "@/components/AuthorDisplay";
import { timeAgo } from "@/lib/utils";

// Deliberately not a badge: no colour block, no border, no level. It answers one question —
// did this person go past the summary before writing — and then gets out of the way. The
// same signal is weighted into comment ranking (see lib/comments.ts), which is where it
// does most of its work.
function EngagementMarker({
  readSource,
  passedCheck,
}: {
  readSource: boolean;
  passedCheck: boolean;
}) {
  if (readSource) {
    return (
      <span
        className="inline-flex items-center gap-1 text-moss"
        title="This person opened the original source for this paper."
      >
        <BookOpenCheck size={11} aria-hidden="true" /> read the source
      </span>
    );
  }
  if (passedCheck) {
    return (
      <span
        className="inline-flex items-center gap-1 text-moss"
        title="This person answered every question in this paper's comprehension check correctly."
      >
        <CircleCheck size={11} aria-hidden="true" /> passed the check
      </span>
    );
  }
  return null;
}

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
            isAnonymous={comment.isAnonymous}
            cowNumber={comment.author.cowNumber}
          />
          <span>·</span>
          <span>{timeAgo(comment.createdAt)}</span>
          <EngagementMarker readSource={comment.readSource} passedCheck={comment.passedCheck} />
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
