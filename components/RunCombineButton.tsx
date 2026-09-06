"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { runCombineAction } from "@/lib/actions/admin";
import InlineError from "@/components/InlineError";
import LoadingMessage from "@/components/LoadingMessage";
import { LOADING_MESSAGES } from "@/lib/loadingMessages";
import Spinner from "@/components/Spinner";
import type { CombineRunSummary } from "@/lib/combine/run";
import { buttonClass } from "@/lib/controls";

export default function RunCombineButton() {
  const [summary, setSummary] = useState<CombineRunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    setSummary(null);
    startTransition(async () => {
      const result = await runCombineAction();
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
        className={buttonClass("primary")}
      >
        {isPending ? <Spinner /> : <Sparkles size={14} aria-hidden="true" />}
        {isPending ? "Running The Combine…" : "Run The Combine now"}
      </button>
      {/* This one reaches five external APIs and a Claude call per Field, so it can run
          for a while. Saying so beats a button that looks stuck. */}
      {isPending && <LoadingMessage messages={LOADING_MESSAGES.combine} />}
      <InlineError message={error} />
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
