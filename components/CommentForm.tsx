"use client";

import { useActionState, useEffect, useRef } from "react";
import { createComment } from "@/lib/actions/comments";

export default function CommentForm({
  postId,
  parentId,
  autoFocus,
  onDone,
}: {
  postId: string;
  parentId?: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const [error, formAction, pending] = useActionState(createComment, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      formRef.current?.reset();
      onDone?.();
    }
    wasPending.current = pending;
  }, [pending, error, onDone]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="postId" value={postId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <textarea
        name="body"
        required
        autoFocus={autoFocus}
        rows={parentId ? 2 : 3}
        placeholder={
          parentId
            ? "Write a reply…"
            : "What does this paper actually say? What did the summary miss? Which part is worth reading?"
        }
        className="bg-panel-2 border border-border rounded-md px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-moss resize-y"
      />
      <label className="flex items-center gap-1.5 text-xs text-fg-muted w-fit cursor-pointer">
        <input type="checkbox" name="anonymous" className="accent-moss" />
        Post anonymously
      </label>
      {error && <p className="text-xs text-rose">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={pending}
          className="px-3 py-1.5 rounded-md bg-moss text-white text-xs font-medium hover:brightness-110 transition disabled:opacity-60"
        >
          {pending ? "Posting…" : parentId ? "Reply" : "Comment"}
        </button>
      </div>
    </form>
  );
}
