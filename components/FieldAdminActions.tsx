"use client";

import { useTransition } from "react";
import { promoteFieldAction, suspendFieldAction, dismissFieldReportsAction } from "@/lib/actions/admin";

export function PromoteFieldButton({ boardId }: { boardId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => promoteFieldAction(boardId))}
      className="px-3 py-1.5 rounded-md bg-moss text-ink text-xs font-medium hover:brightness-110 transition disabled:opacity-60"
    >
      Promote to Active
    </button>
  );
}

export function SuspendFieldButton({ boardId }: { boardId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => suspendFieldAction(boardId))}
      className="px-3 py-1.5 rounded-md border border-rose/40 text-rose text-xs font-medium hover:bg-rose/10 transition disabled:opacity-60"
    >
      Suspend
    </button>
  );
}

export function DismissReportsButton({ boardId }: { boardId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => dismissFieldReportsAction(boardId))}
      className="px-3 py-1.5 rounded-md border border-border-strong text-fg-muted text-xs font-medium hover:text-ink transition disabled:opacity-60"
    >
      Dismiss report{"s"}
    </button>
  );
}
