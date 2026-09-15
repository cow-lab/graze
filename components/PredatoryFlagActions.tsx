"use client";

import { useState, useTransition } from "react";
import { confirmPredatoryFlag, dismissPredatoryFlag } from "@/lib/actions/credibility";
import { buttonClass } from "@/lib/controls";
import InlineError from "@/components/InlineError";

export default function PredatoryFlagActions({
  issn,
  suppressed = false,
}: {
  issn: string;
  /** Already hidden from readers — only the "this was wrong" path applies. */
  suppressed?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {!suppressed && (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const r = await confirmPredatoryFlag(issn);
                if (!r.ok) setError(r.message);
              })
            }
            className={buttonClass("primary", "sm")}
          >
            Confirm — hide it
          </button>
        )}
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why it's wrong"
          aria-label={`Reason for clearing the flag on ISSN ${issn}`}
          className="min-w-0 flex-1 rounded-md border border-border-strong bg-panel px-2.5 py-1 text-xs text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-moss"
        />
        <button
          type="button"
          disabled={isPending || reason.trim().length < 4}
          onClick={() =>
            startTransition(async () => {
              const r = await dismissPredatoryFlag(issn, reason);
              if (!r.ok) setError(r.message);
              else setReason("");
            })
          }
          className={buttonClass("quiet", "sm")}
        >
          Clear it
        </button>
      </div>
      <InlineError message={error} />
    </div>
  );
}
