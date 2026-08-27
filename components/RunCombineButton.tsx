"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { runCombineAction } from "@/lib/actions/admin";
import type { CombineRunSummary } from "@/lib/combine/run";

export default function RunCombineButton() {
  const [summary, setSummary] = useState<CombineRunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await runCombineAction();
        setSummary(result);
      } catch {
        setError("The Combine run failed — check the server logs.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 items-start">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-teal text-ink text-sm font-medium hover:brightness-110 transition disabled:opacity-60"
      >
        <Sparkles size={14} />
        {isPending ? "Running The Combine…" : "Run The Combine now"}
      </button>
      {error && <p className="text-xs text-rose">{error}</p>}
      {summary && !isPending && (
        <div className="text-xs text-fg-muted font-mono">
          <p>
            Scanned {summary.fieldsScanned} fields · found {summary.candidatesFound} candidates ·
            published {summary.inserted} · dropped {summary.droppedNotAllowlisted} not-allowlisted,{" "}
            {summary.droppedNoAbstract} no-abstract, {summary.droppedDuplicate} duplicate
          </p>
          {(summary.preprintSkipped > 0 || summary.preprintAttached > 0) && (
            <p className="mt-1 text-teal">
              Preprint matching: {summary.preprintSkipped} preprint duplicate
              {summary.preprintSkipped === 1 ? "" : "s"} skipped, {summary.preprintAttached} published
              version{summary.preprintAttached === 1 ? "" : "s"} attached to an existing preprint post
            </p>
          )}
          <p className="mt-1">
            Claude usage: {summary.tokensUsed.inputTokens} input / {summary.tokensUsed.outputTokens}{" "}
            output tokens
            {summary.fieldsSkippedRunCap > 0 &&
              ` · ${summary.fieldsSkippedRunCap} field(s) deferred to next run (cap)`}
          </p>
          {summary.fieldsProposed > 0 && (
            <p className="mt-1 text-moss">
              Suggested {summary.fieldsProposed} new Field
              {summary.fieldsProposed > 1 ? "s" : ""}: {summary.proposedFieldNames.join(", ")} — see
              &ldquo;New fields&rdquo; in the sidebar
            </p>
          )}
        </div>
      )}
    </div>
  );
}
