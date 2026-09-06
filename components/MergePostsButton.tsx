"use client";

import { useState, useTransition } from "react";
import { Merge } from "lucide-react";
import { mergePostsAction } from "@/lib/actions/admin";
import InlineError from "@/components/InlineError";
import { buttonClass } from "@/lib/controls";

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
      const result = await mergePostsAction(keepPostId, otherPostIds);
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={buttonClass("primary", "sm")}
      >
        <Merge size={12} aria-hidden="true" />
        {isPending ? "Merging…" : "Keep this, merge others in"}
      </button>
      <InlineError message={error} />
    </div>
  );
}
