"use client";

import { useState, useTransition } from "react";
import { approveQueueEntry, rejectQueueEntry } from "@/lib/actions/admin";
import InlineError from "@/components/InlineError";
import type { ActionResult } from "@/lib/actions/result";

export default function QueueActions({ postId }: { postId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        disabled={isPending}
        onClick={() => run(() => approveQueueEntry(postId))}
        className="px-3 py-1.5 rounded-md bg-moss text-white text-xs font-medium hover:brightness-110 transition disabled:opacity-60"
      >
        Approve
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => run(() => rejectQueueEntry(postId))}
        className="px-3 py-1.5 rounded-md border border-rose/40 text-rose text-xs font-medium hover:bg-rose/10 transition disabled:opacity-60"
      >
        Reject
      </button>
      <InlineError message={error} />
    </div>
  );
}
