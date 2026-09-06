"use client";

import { useState, useTransition } from "react";
import {
  promoteFieldAction,
  suspendFieldAction,
  archiveFieldAction,
  restoreFieldAction,
  dismissFieldReportsAction,
} from "@/lib/actions/admin";
import InlineError from "@/components/InlineError";
import type { ActionResult } from "@/lib/actions/result";

// Every Field action is the same shape — one button, one server action, a pending label,
// and a failure that has to say something rather than throwing an error screen at an
// admin mid-moderation. Written once here instead of five times.
function AdminActionButton({
  action,
  label,
  pendingLabel,
  className,
}: {
  action: () => Promise<ActionResult>;
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await action();
            if (!result.ok) setError(result.message);
          });
        }}
        className={`${className} disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss`}
      >
        {isPending ? pendingLabel : label}
      </button>
      <InlineError message={error} />
    </div>
  );
}

const PRIMARY = "px-3 py-1.5 rounded-md bg-moss text-white text-xs font-medium hover:brightness-110 transition";
const DANGER = "px-3 py-1.5 rounded-md border border-rose/40 text-rose text-xs font-medium hover:bg-rose/10 transition";
const QUIET = "px-3 py-1.5 rounded-md border border-border-strong text-fg-muted text-xs font-medium hover:text-ink transition";

export function PromoteFieldButton({ boardId }: { boardId: string }) {
  return (
    <AdminActionButton
      action={() => promoteFieldAction(boardId)}
      label="Promote to Active"
      pendingLabel="Promoting…"
      className={PRIMARY}
    />
  );
}

export function SuspendFieldButton({ boardId }: { boardId: string }) {
  return (
    <AdminActionButton
      action={() => suspendFieldAction(boardId)}
      label="Suspend"
      pendingLabel="Suspending…"
      className={DANGER}
    />
  );
}

export function ArchiveFieldButton({ boardId }: { boardId: string }) {
  return (
    <AdminActionButton
      action={() => archiveFieldAction(boardId)}
      label="Archive"
      pendingLabel="Archiving…"
      className={QUIET}
    />
  );
}

// Shared by both reinstate paths — un-archiving and un-suspending are the same operation
// (back through the traction gate), so only the label differs.
export function RestoreFieldButton({
  boardId,
  label = "Restore Field",
}: {
  boardId: string;
  label?: string;
}) {
  return (
    <AdminActionButton
      action={() => restoreFieldAction(boardId)}
      label={label}
      pendingLabel="Restoring…"
      className={PRIMARY}
    />
  );
}

export function DismissReportsButton({ boardId }: { boardId: string }) {
  return (
    <AdminActionButton
      action={() => dismissFieldReportsAction(boardId)}
      label="Dismiss reports"
      pendingLabel="Dismissing…"
      className={QUIET}
    />
  );
}
