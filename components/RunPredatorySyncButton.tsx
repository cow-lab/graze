"use client";

import { useState, useTransition } from "react";
import { runPredatoryListSync } from "@/lib/actions/credibility";
import { buttonClass } from "@/lib/controls";
import InlineError from "@/components/InlineError";

export default function RunPredatorySyncButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(force: boolean) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await runPredatoryListSync(force);
      if (result.ok) setMessage(result.data);
      else setError(result.message);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => run(false)} disabled={isPending} className={buttonClass("primary", "sm")}>
        {isPending ? "Syncing…" : "Sync now"}
      </button>
      {/* The rails refuse an implausible change rather than applying it. This is the
          override, and it is deliberately a second, separate button — forcing should be a
          decision, not the thing you click when the first one didn't work. */}
      <button type="button" onClick={() => run(true)} disabled={isPending} className={buttonClass("quiet", "sm")}>
        Force past the size check
      </button>
      {message && <p className="w-full text-[13px] leading-relaxed text-fg">{message}</p>}
      <InlineError message={error} />
    </div>
  );
}
