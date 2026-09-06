"use client";

import { useState, useId } from "react";
import { segmentJargon, type GlossaryTerm } from "@/lib/jargon";

// Renders text with known glossary terms underlined and definable in place, so the
// plain-language help isn't locked behind opening the full "Chew on this" panel.
//
// Each term is a <button> rather than a styled <span>: that makes it tappable on touch
// (where :hover doesn't exist), reachable by keyboard, and announced properly — the
// definition is wired up via aria-describedby rather than a title attribute, which screen
// readers and touch devices treat inconsistently.
export default function JargonText({
  text,
  terms,
}: {
  text: string;
  terms: GlossaryTerm[];
}) {
  const segments = segmentJargon(text, terms);
  if (segments.every((s) => s.kind === "text")) return <>{text}</>;

  return (
    <>
      {segments.map((segment, i) =>
        segment.kind === "text" ? (
          <span key={i}>{segment.text}</span>
        ) : (
          <JargonTerm key={i} text={segment.text} definition={segment.definition} />
        ),
      )}
    </>
  );
}

function JargonTerm({ text, definition }: { text: string; definition: string }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        // Cards are wrapped in links; without this a tap would navigate instead of
        // defining the term.
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        // z-10 lifts the term above a card's full-bleed overlay link, so tapping a term
        // defines it while the surrounding title text still navigates to the post.
        className="relative z-10 underline decoration-dotted decoration-fg-muted/70 underline-offset-2 hover:decoration-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss rounded-sm text-left"
      >
        {text}
        <span className="sr-only"> (has a plain-language definition)</span>
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-0 bottom-full z-30 mb-1 w-60 rounded-md border border-border-strong bg-panel px-2.5 py-2 text-xs font-normal not-italic normal-case tracking-normal text-fg shadow-lg"
        >
          <span className="font-medium">{text}</span> — {definition}
        </span>
      )}
    </span>
  );
}
