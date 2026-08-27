import { BadgeCheck } from "lucide-react";

export default function VerifiedBadge() {
  return (
    <span
      title="Has at least one institutionally-verified affiliation"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-teal/30 bg-teal/15 text-teal font-mono text-[10px] uppercase tracking-wide"
    >
      <BadgeCheck size={11} /> Verified
    </span>
  );
}
