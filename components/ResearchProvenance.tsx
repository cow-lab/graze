import { ShieldCheck, UserRound } from "lucide-react";
import type { PostSource } from "@prisma/client";

// The real trust signal for a research post, now that account-level verification isn't
// part of the picture: whether the paper actually went through The Combine's DOAJ/
// allowlist check, or was submitted directly by a user without that check.
export default function ResearchProvenance({
  source,
  sourceName,
}: {
  source: PostSource;
  sourceName?: string | null;
}) {
  if (source === "COMBINE") {
    return (
      <span
        title="Ingested by The Combine from a DOAJ-listed, peer-reviewed open-access journal"
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-teal/30 bg-teal/10 text-teal font-mono text-[10px] uppercase tracking-wide"
      >
        <ShieldCheck size={10} /> via DOAJ-listed journal{sourceName ? ` · ${sourceName}` : ""}
      </span>
    );
  }

  return (
    <span
      title="Submitted directly by a user — hasn't gone through the DOAJ allowlist check"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-fg-muted/30 bg-fg-muted/10 text-fg-muted font-mono text-[10px] uppercase tracking-wide"
    >
      <UserRound size={10} /> user-submitted
    </span>
  );
}
