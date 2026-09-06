"use client";

import { useState, useTransition } from "react";
import { deletePost } from "@/lib/actions/posts";
import InlineError from "@/components/InlineError";

export default function DeletePostButton({ postId }: { postId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("Delete this paper? This can't be undone.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deletePost(postId);
      // On success this redirects, so reaching here at all means it failed.
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={handleClick}
        className="px-3 py-1.5 rounded-md border border-rose/40 text-rose text-xs font-medium hover:bg-rose/10 transition disabled:opacity-60"
      >
        {isPending ? "Deleting…" : "Delete paper"}
      </button>
      <InlineError message={error} />
    </div>
  );
}
