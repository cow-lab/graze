"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Flag } from "lucide-react";
import { reportField } from "@/lib/actions/fields";

export default function ReportFieldForm({ boardId }: { boardId: string }) {
  const [error, formAction, pending] = useActionState(reportField, undefined);
  const [reported, setReported] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) setReported(true);
    wasPending.current = pending;
  }, [pending, error]);

  if (reported) {
    return <p className="text-[11px] text-fg-muted px-2">Reported — thanks, an admin will take a look.</p>;
  }

  return (
    <details className="group">
      <summary className="flex items-center gap-1 px-2 py-1 text-[11px] text-fg-muted hover:text-rose transition-colors cursor-pointer list-none">
        <Flag size={11} /> Report this Field
      </summary>
      <form action={formAction} className="flex flex-col gap-1.5 px-2 pb-2 pt-1">
        <input type="hidden" name="boardId" value={boardId} />
        <textarea
          name="reason"
          required
          rows={2}
          placeholder="What's wrong with this Field?"
          className="bg-panel-2 border border-border rounded-md px-2 py-1.5 text-xs text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-moss resize-none"
        />
        {error && <p className="text-[11px] text-rose">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="px-2.5 py-1 rounded-md border border-rose/40 text-rose text-[11px] font-medium hover:bg-rose/10 transition disabled:opacity-60 w-fit"
        >
          {pending ? "Sending…" : "Submit report"}
        </button>
      </form>
    </details>
  );
}
