import { AlertTriangle } from "lucide-react";

// Set by the periodic Crossref retraction re-sync (lib/combine/retractions.ts). Deliberately
// loud — a retracted paper sitting indefinitely looking legitimate is the failure mode this
// exists to prevent.
export default function RetractedBadge() {
  return (
    <span
      title="Flagged as retracted by a Crossref re-sync check after import"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-rose bg-rose/15 text-rose font-mono text-[10px] font-bold uppercase tracking-wide"
    >
      <AlertTriangle size={10} /> Retracted
    </span>
  );
}
