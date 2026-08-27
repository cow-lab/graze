"use client";

import { useState, useTransition } from "react";
import { ShieldAlert } from "lucide-react";
import { checkRetractionsAction } from "@/lib/actions/admin";
import type { RetractionCheckSummary } from "@/lib/combine/retractions";

export default function CheckRetractionsButton() {
  const [summary, setSummary] = useState<RetractionCheckSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await checkRetractionsAction();
        setSummary(result);
      } catch {
        setError("Retraction check failed — check the server logs.");
      }
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
        <ShieldAlert size={14} />
        {isPending ? "Checking retractions…" : "Check for retractions"}
      </button>
      {error && <p className="text-xs text-rose">{error}</p>}
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
