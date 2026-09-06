"use client";

import { useTransition } from "react";
import { Gauge } from "lucide-react";
import { setLowBandwidth } from "@/lib/actions/preferences";

export default function LowBandwidthToggle({ enabled }: { enabled: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      aria-pressed={enabled}
      onClick={() => startTransition(() => setLowBandwidth(!enabled))}
      title={
        enabled
          ? "Low-bandwidth mode is on — the illustrated background isn't being downloaded."
          : "Turn off the illustrated background to make pages much lighter."
      }
      // On its own chip: this sits in the footer, over the illustrated field, where bare
      // muted text is barely readable.
      className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-panel/95 px-2.5 py-1 font-mono text-[11px] text-fg-muted shadow-sm transition-colors hover:text-ink disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
    >
      <Gauge size={12} aria-hidden="true" />
      {isPending ? "Switching…" : enabled ? "Low-bandwidth: on" : "Low-bandwidth: off"}
    </button>
  );
}
