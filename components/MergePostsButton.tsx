"use client";

import { useState, useTransition } from "react";
import { Merge } from "lucide-react";
import { mergePostsAction } from "@/lib/actions/admin";

export default function MergePostsButton({
  keepPostId,
  otherPostIds,
}: {
  keepPostId: string;
  otherPostIds: string[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const count = otherPostIds.length;
    if (
      !window.confirm(
        `Keep this post and merge ${count} other${count === 1 ? "" : "s"} into it? Their votes and comments move over; the other post${count === 1 ? "" : "s"} will be deleted. This can't be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await mergePostsAction(keepPostId, otherPostIds);
      } catch {
        setError("Merge failed — check the server logs.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-moss text-ink text-xs font-medium hover:brightness-110 transition disabled:opacity-60"
      >
        <Merge size={12} />
        {isPending ? "Merging…" : "Keep this, merge others in"}
      </button>
      {error && <p className="text-xs text-rose">{error}</p>}
    </div>
  );
}
