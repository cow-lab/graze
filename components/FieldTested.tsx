"use client";

import { useId, useState } from "react";
import { BadgeCheck, ChevronDown, CircleHelp, Flag, FlaskConical, Quote } from "lucide-react";
import type { PostSource } from "@prisma/client";
import type { Assessment } from "@/lib/credibility/assess";
import type { FieldTestedBreakdown, FieldTestedState } from "@/lib/fieldTested";

// Field-Tested — the reliability check, as a thing with a name rather than a line of
// metadata. A field in the academic sense, and the idiom for something proven in use.
//
// It expands, and that isn't decoration: the whole claim of this badge is trustworthiness,
// and a trust signal that can't show its working is just asking to be believed. Every state
// opens onto the four checks behind it — peer review, DOAJ listing, retraction, citations —
// each showing what was actually checked, including when the answer is "we didn't".

const STATES: Record<
  FieldTestedState,
  { label: string; tone: string; icon: typeof BadgeCheck; meaning: string }
> = {
  TESTED: {
    label: "Field-Tested",
    tone: "border-moss bg-moss text-white",
    icon: BadgeCheck,
    meaning:
      "Peer-reviewed, published in a DOAJ-listed journal, and carrying no retraction notice. That's a check on the journal and the paper's status — not a judgement of whether the paper is any good, which is still yours to make.",
  },
  PARTIAL: {
    label: "Partly checked",
    tone: "border-border-strong bg-panel text-fg",
    icon: CircleHelp,
    meaning:
      "Peer-reviewed, but its journal isn't listed in DOAJ. One check passed, one didn't — and DOAJ only covers open-access journals, so a subscription journal lands here no matter how good it is.",
  },
  UNCHECKED: {
    label: "Not yet checked",
    tone: "border-border-strong bg-panel text-fg-muted",
    icon: CircleHelp,
    meaning:
      "None of the checks have run against this one. Live search results start here — adding a paper to Graze is what runs them.",
  },
  FLAGGED: {
    label: "Flagged",
    tone: "border-sun bg-sun/30 text-ink",
    icon: Flag,
    meaning:
      "Either a retraction notice exists for this paper, or two sources disagree about its journal. It's shown rather than hidden, and it's queued for a person to look at — nothing here was resolved automatically.",
  },
  PREPRINT: {
    label: "Preprint",
    tone: "border-teal/50 bg-teal/10 text-teal",
    icon: FlaskConical,
    meaning:
      "Posted publicly before peer review. Not a failure state and not a lesser paper — just an earlier one. Plenty of important work appears as a preprint first; it simply hasn't been reviewed yet.",
  },
};

export default function FieldTested({
  state,
  breakdown,
  journal,
  source,
  sourceName,
  size = "default",
  className = "",
}: {
  state: FieldTestedState;
  breakdown: FieldTestedBreakdown;
  /** Journal-level indexing and transparency, when we have it. */
  journal?: Assessment | null;
  source?: PostSource;
  sourceName?: string | null;
  size?: "default" | "compact";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { label, tone, icon: Icon, meaning } = STATES[state];
  const compact = size === "compact";

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        title={`${label} — what was checked?`}
        className={`inline-flex items-center gap-1.5 rounded-full border font-semibold shadow-sm transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss ${tone} ${
          compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
        }`}
      >
        <Icon size={compact ? 13 : 15} aria-hidden="true" />
        {label}
        <ChevronDown
          size={compact ? 11 : 13}
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
        <span className="sr-only"> — show what was checked</span>
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute left-0 top-full z-30 mt-1.5 w-[min(24rem,calc(100vw-3rem))] rounded-lg border border-border-strong bg-panel p-3 text-left shadow-lg"
        >
          <p className="text-xs leading-relaxed text-fg">{meaning}</p>

          <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-fg-muted">
            What was checked
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            <Check
              label="Peer-reviewed"
              value={
                breakdown.peerReviewed === null
                  ? "unknown"
                  : breakdown.peerReviewed
                    ? "yes"
                    : "no — preprint"
              }
              tone={
                breakdown.peerReviewed === null ? "muted" : breakdown.peerReviewed ? "good" : "warn"
              }
              detail="From the publisher's own work type in Crossref or OpenAlex."
            />
            <Check
              label="DOAJ-listed journal"
              value={
                breakdown.doajListed === null ? "not checked" : breakdown.doajListed ? "yes" : "no"
              }
              tone={
                breakdown.doajListed === null ? "muted" : breakdown.doajListed ? "good" : "muted"
              }
              detail="The Directory of Open Access Journals vets editorial process. It only covers open-access journals, so absence isn't a mark against a paper."
            />
            <Check
              label="Retraction check"
              value={
                !breakdown.retractionChecked
                  ? "not run yet"
                  : breakdown.retracted
                    ? "retraction on record"
                    : "none found"
              }
              tone={
                !breakdown.retractionChecked ? "muted" : breakdown.retracted ? "warn" : "good"
              }
              detail="Against the Retraction Watch records Crossref distributes, at import and on a repeating re-check."
            />
            <Check
              label="Citations"
              value={
                breakdown.citationCount == null
                  ? "unknown"
                  : breakdown.citationCount.toLocaleString()
              }
              tone="muted"
              detail="How many other works cite this paper, per OpenAlex. A recent paper having few is normal."
              icon={Quote}
            />
          </ul>

          {journal && journal.indexes.length > 0 && (
            <>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-fg-muted">
                The journal
              </p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {journal.indexes.map((index) => (
                  <li key={index.name} className="text-[11px] text-fg-muted">
                    <span className={index.state === "in" ? "font-medium text-moss" : ""}>
                      {index.name}:{" "}
                      {index.state === "in"
                        ? "listed"
                        : index.state === "absent"
                          ? "not listed"
                          : "not checked"}
                    </span>
                  </li>
                ))}
                {journal.notes.slice(0, 3).map((note, i) => (
                  <li key={`n${i}`} className="text-[11px] text-fg-muted">
                    {note.tone === "warn" && <span aria-hidden="true">⚠ </span>}
                    {note.label}
                  </li>
                ))}
              </ul>
            </>
          )}

          {source && (
            <p className="mt-3 border-t border-border pt-2 text-[11px] text-fg-muted">
              {source === "COMBINE"
                ? `Imported by The Combine${sourceName ? ` via ${sourceName}` : ""}, which runs these checks before anything publishes.`
                : "Submitted directly by a person, so the automated checks haven't been run against it."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Check({
  label,
  value,
  tone,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "muted";
  detail: string;
  icon?: typeof BadgeCheck;
}) {
  const valueTone =
    tone === "good" ? "text-moss" : tone === "warn" ? "text-rose" : "text-fg-muted";
  return (
    <li className="text-[11px] leading-snug">
      <span className="flex items-baseline justify-between gap-2">
        <span className="inline-flex items-center gap-1 font-medium text-fg">
          {Icon && <Icon size={10} aria-hidden="true" />}
          {label}
        </span>
        <span className={`font-mono ${valueTone}`}>{value}</span>
      </span>
      <span className="mt-0.5 block text-fg-muted">{detail}</span>
    </li>
  );
}
