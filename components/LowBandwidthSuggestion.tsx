"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { Gauge, X } from "lucide-react";
import { setLowBandwidth } from "@/lib/actions/preferences";
import { buttonClass } from "@/lib/controls";

const DISMISSED_KEY = "graze_lowbw_suggestion_dismissed";

type ConnectionLike = { effectiveType?: string; saveData?: boolean };

// Offers low-bandwidth mode when the connection looks poor, but never switches it on by
// itself — effectiveType is a rough estimate and Save-Data is a preference, so both are
// treated as grounds for asking, not for deciding. Dismissal sticks so it can't nag.
export default function LowBandwidthSuggestion({ enabled }: { enabled: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();

  // navigator.connection and localStorage are client-only, so they're read through
  // useSyncExternalStore with a `false` server snapshot rather than an effect — that
  // avoids both a hydration mismatch and an effect-driven setState.
  const connectionLooksSlow = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        if (localStorage.getItem(DISMISSED_KEY) === "1") return false;
      } catch {
        // Private mode / blocked storage — fall through and just offer it.
      }
      const connection = (navigator as Navigator & { connection?: ConnectionLike }).connection;
      if (!connection) return false;
      return (
        connection.saveData === true ||
        connection.effectiveType === "slow-2g" ||
        connection.effectiveType === "2g" ||
        connection.effectiveType === "3g"
      );
    },
    () => false,
  );

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Nothing to do — it just may reappear next visit.
    }
    setDismissed(true);
  }

  if (enabled || dismissed || !connectionLooksSlow) return null;

  return (
    <div
      role="status"
      className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-border-strong bg-panel/95 px-4 py-3 shadow-sm"
    >
      <p className="text-sm text-fg-muted flex items-start gap-2">
        <Gauge size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>
          Your connection looks slow. Low-bandwidth mode skips the illustrated background
          entirely, which makes pages a lot lighter.
        </span>
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => setLowBandwidth(true, { viaSuggestion: true }))}
          className={buttonClass("primary", "sm")}
        >
          {isPending ? "Turning on…" : "Turn on"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss low-bandwidth suggestion"
          className="p-1 text-fg-muted hover:text-ink transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
