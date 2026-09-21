"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  BadgeCheck,
  ChevronDown,
  CircleHelp,
  Flag,
  FlaskConical,
  Quote,
} from "lucide-react";
import type { PostSource } from "@prisma/client";
import type { Assessment } from "@/lib/credibility/assess";
import type { FieldTestedBreakdown, FieldTestedState } from "@/lib/fieldTested";
import Portal from "@/components/Portal";
import type { CredibilityTier, Signal } from "@/lib/credibility/classify";

// Field-Tested — the reliability check, as a thing with a name rather than a line of
// metadata. A field in the academic sense, and the idiom for something proven in use.
//
// It expands, and that isn't decoration: the whole claim of this badge is trustworthiness,
// and a trust signal that can't show its working is just asking to be believed. Every state
// opens onto the four checks behind it — peer review, DOAJ listing, retraction, citations —
// each showing what was actually checked, including when the answer is "we didn't".

// Where the expanded panel sits on screen. It anchors from the top or the bottom depending
// on which side of the badge has room, so only one of `top`/`bottom` is ever set.
type Placement = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

const STATES: Record<
  FieldTestedState,
  { label: string; tone: string; icon: typeof BadgeCheck; meaning: string }
> = {
  TESTED: {
    label: "Field-Tested",
    // Quiet on purpose. This is the state nearly every card is in, so a filled badge made
    // the least informative thing on the card the loudest — a wall of dark green pills
    // shouting above the titles they belonged to. Weight is spent on the exceptions below.
    tone: "border-moss/40 bg-moss/10 text-moss",
    icon: BadgeCheck,
    meaning:
      "Peer-reviewed, no retraction on record, and corroborated by an index or by the authors' registered identities. That's a check on the paper's status — not a judgement of whether it's any good, which is still yours to make.",
  },
  PARTIAL: {
    label: "Partly checked",
    tone: "border-border-strong bg-panel-2 text-fg-muted",
    icon: CircleHelp,
    meaning:
      "Peer-reviewed, but its journal isn't listed in DOAJ. One check passed, one didn't — and DOAJ only covers open-access journals, so a subscription journal lands here no matter how good it is.",
  },
  UNCHECKED: {
    label: "Not yet checked",
    tone: "border-border-strong bg-panel-2 text-fg-muted",
    icon: CircleHelp,
    meaning:
      "None of the checks have run against this one. Live search results start here — adding a paper to Graze is what runs them.",
  },
  FLAGGED: {
    label: "Flagged",
    // The one state a reader must not scroll past, so it's the only filled badge here.
    tone: "border-sun bg-sun text-ink font-semibold",
    icon: Flag,
    meaning:
      "Either a retraction notice exists for this paper, or two sources disagree about its journal. It's shown rather than hidden, and it's queued for a person to look at — nothing here was resolved automatically.",
  },
  UNVERIFIED: {
    label: "Unverified",
    tone: "border-border-strong bg-panel-2 text-fg-muted",
    icon: CircleHelp,
    meaning:
      "Some of the checks couldn't be completed — often a missing DOI, or authors we couldn't resolve. Nothing was wrong with it. Results here are never hidden or pushed down.",
  },
  PREPRINT: {
    label: "Preprint",
    // Neutral rather than teal: teal means "Chew on this" everywhere else, and a preprint
    // badge borrowing it read as an action. This is information, not something to click.
    tone: "border-ink/25 bg-ink/5 text-ink",
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
  signals,
  tier,
  isPreprint,
}: {
  state: FieldTestedState;
  breakdown: FieldTestedBreakdown;
  /** Journal-level indexing and transparency, when we have it. */
  journal?: Assessment | null;
  source?: PostSource;
  sourceName?: string | null;
  size?: "default" | "compact";
  className?: string;
  /**
   * The signals that produced this classification, from lib/credibility/classify.ts. When
   * present the panel lists exactly what fired instead of the fixed four checks, which is
   * the difference between explaining a result and describing a procedure.
   */
  signals?: Signal[];
  /**
   * The unified classification. When given, the badge itself is derived from this rather
   * than from `state` — otherwise the headline and the signal list below it are computed by
   * two different classifiers and can contradict each other, which they did: a panel could
   * say "its journal isn't listed in DOAJ" directly above a signal reading "Listed in DOAJ".
   */
  tier?: CredibilityTier;
  isPreprint?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const effectiveState: FieldTestedState = tier
    ? tier === "FLAGGED"
      ? "FLAGGED"
      : isPreprint
        ? "PREPRINT"
        : tier === "VERIFIED"
          ? "TESTED"
          : "UNVERIFIED"
    : state;
  const { label, tone, icon: Icon, meaning } = STATES[effectiveState];
  const compact = size === "compact";

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Set once the panel is open, from the trigger's position on screen. The panel is
  // portalled out of the card (see Portal), so it can't be positioned by the card any more
  // and has to anchor itself to the button in viewport coordinates.
  const [pos, setPos] = useState<Placement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Anchor the panel to the trigger, and keep it there while the page moves under it.
  useLayoutEffect(() => {
    if (!open) return;

    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(384, window.innerWidth - 24);
      // Keep the panel on screen when the badge sits near the right edge.
      const left = Math.max(
        12,
        Math.min(rect.left, window.innerWidth - width - 12),
      );
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      // Open downward by default, but flip up rather than unfold into a sliver of viewport
      // for a badge near the bottom of a long list — which is where most of them are.
      setPos(
        below >= 220 || below >= above
          ? { left, width, top: rect.bottom + 6, maxHeight: below }
          : {
              left,
              width,
              bottom: window.innerHeight - rect.top + 6,
              maxHeight: above,
            },
      );
    }

    place();
    // `true` captures scrolls on any ancestor, not just the window.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  // Escape and click-away both close it. Without these the panel could only be dismissed by
  // hitting the same badge again — and with one open per card, a page could end up covered
  // in panels the reader had no obvious way to put away.
  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      // The trigger is excluded so its own click can toggle rather than close-then-reopen.
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      )
        return;
      setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
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

      {open && pos && (
        <Portal>
          <div
            ref={panelRef}
            id={panelId}
            style={{
              position: "fixed",
              left: pos.left,
              width: pos.width,
              top: pos.top,
              bottom: pos.bottom,
              maxHeight: pos.maxHeight,
            }}
            className="z-40 overflow-y-auto overscroll-contain rounded-lg border border-border-strong bg-panel p-3 text-left shadow-lg"
          >
            <p className="text-xs leading-relaxed text-fg">{meaning}</p>

            {signals && signals.length > 0 ? (
              <>
                <SignalList signals={signals} />
                <a
                  href="/how-we-check"
                  className="mt-3 inline-block font-mono text-[10px] uppercase tracking-wide text-moss underline"
                >
                  How we check →
                </a>
              </>
            ) : (
            <>
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
                  breakdown.peerReviewed === null
                    ? "muted"
                    : breakdown.peerReviewed
                      ? "good"
                      : "warn"
                }
                detail="From the publisher's own work type in Crossref or OpenAlex."
              />
              <Check
                label="DOAJ-listed journal"
                value={
                  breakdown.doajListed === null
                    ? "not checked"
                    : breakdown.doajListed
                      ? "yes"
                      : "no"
                }
                tone={
                  breakdown.doajListed === null
                    ? "muted"
                    : breakdown.doajListed
                      ? "good"
                      : "muted"
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
                  !breakdown.retractionChecked
                    ? "muted"
                    : breakdown.retracted
                      ? "warn"
                      : "good"
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
            </>
            )}

            {/* The older journal-level block. Everything in it — index states, fee
                disclosure, citation context — is already in the signal list above, so
                showing both duplicated each fact in different words and undid the point of
                trimming the panel. Kept only for the call sites that don't pass signals
                yet. */}
            {!signals?.length && journal && journal.indexes.length > 0 && (
              <>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-fg-muted">
                  The journal
                </p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {journal.indexes.map((index) => (
                    <li key={index.name} className="text-[11px] text-fg-muted">
                      <span
                        className={
                          index.state === "in" ? "font-medium text-moss" : ""
                        }
                      >
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
                      {note.tone === "warn" && (
                        <span aria-hidden="true">⚠ </span>
                      )}
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
        </Portal>
      )}
    </div>
  );
}

// Renders exactly what fired, grouped by how much weight it was allowed to carry. The
// grouping is shown rather than hidden: a reader who can see that a citation count sits
// under "Context, which doesn't affect the result" has learned something about how to read
// a credibility claim, which is the point of the whole feature.
function SignalList({ signals }: { signals: Signal[] }) {
  const decisive = signals.filter((s) => s.weight === 1);
  const contributing = signals.filter((s) => s.weight === 2);
  const context = signals.filter((s) => s.weight === 3);

  return (
    <>
      {decisive.length > 0 && (
        <SignalGroup title="Decides on its own" signals={decisive} />
      )}
      {contributing.length > 0 && (
        <SignalGroup title="What was checked" signals={contributing} />
      )}
      {context.length > 0 && (
        <SignalGroup title="Context — doesn't affect the result" signals={context} />
      )}
    </>
  );
}

function SignalGroup({ title, signals }: { title: string; signals: Signal[] }) {
  return (
    <>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-fg-muted">{title}</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {signals.map((signal) => {
          const tone =
            signal.direction === "positive"
              ? "text-moss"
              : signal.direction === "negative"
                ? "text-rose"
                : "text-fg-muted";
          return (
            <li key={signal.id} className="flex items-baseline justify-between gap-2 text-[11px] leading-snug">
              <span className={tone}>{signal.label}</span>
              {signal.evidenceUrl ? (
                <a
                  href={signal.evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 font-mono text-[10px] text-fg-muted underline"
                >
                  {signal.source}
                </a>
              ) : (
                <span className="shrink-0 font-mono text-[10px] text-fg-muted">{signal.source}</span>
              )}
            </li>
          );
        })}
      </ul>
    </>
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
    tone === "good"
      ? "text-moss"
      : tone === "warn"
        ? "text-rose"
        : "text-fg-muted";
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
