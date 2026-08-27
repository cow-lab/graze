"use client";

import { useTransition } from "react";
import { approveQueueEntry, rejectQueueEntry } from "@/lib/actions/admin";

export default function QueueActions({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => approveQueueEntry(postId))}
        className="px-3 py-1.5 rounded-md bg-moss text-ink text-xs font-medium hover:brightness-110 transition disabled:opacity-60"
      >
        Approve
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => rejectQueueEntry(postId))}
        className="px-3 py-1.5 rounded-md border border-rose/40 text-rose text-xs font-medium hover:bg-rose/10 transition disabled:opacity-60"
      >
        Reject
      </button>
    </div>
  );
}
