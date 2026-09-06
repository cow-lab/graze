"use client";

import { useState, useTransition } from "react";
import { ShieldAlert } from "lucide-react";
import { checkRetractionsAction } from "@/lib/actions/admin";
import InlineError from "@/components/InlineError";
import Spinner from "@/components/Spinner";
import type { RetractionCheckSummary } from "@/lib/combine/retractions";

export default function CheckRetractionsButton() {
  const [summary, setSummary] = useState<RetractionCheckSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    setSummary(null);
    startTransition(async () => {
      const result = await checkRetractionsAction();
      if (result.ok) setSummary(result.data);
      else setError(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-2 items-start">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-border-strong text-sm font-medium hover:bg-ink/5 transition disabled:opacity-60"
      >
        {isPending ? <Spinner /> : <ShieldAlert size={14} aria-hidden="true" />}
        {isPending ? "Checking retractions…" : "Check for retractions"}
      </button>
      {isPending && (
        <p role="status" aria-live="polite" className="text-xs text-fg-muted">
          Re-checking every imported paper against Crossref — this takes a moment.
        </p>
      )}
      <InlineError message={error} />
      {summary && !isPending && (
        <p className="text-xs text-fg-muted font-mono">
          Checked {summary.checked} imported papers against Crossref
          {summary.newlyRetracted.length > 0 ? (
            <span className="text-rose">
              {" "}
              · flagged {summary.newlyRetracted.length}: {summary.newlyRetracted.join(", ")}
            </span>
          ) : (
            " · none newly flagged"
          )}
        </p>
      )}
    </div>
  );
}
