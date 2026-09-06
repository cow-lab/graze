import { CowDoodle } from "@/components/CowDoodle";

// The themed wait. Used for the two loads a person actually sits and watches — a live
// literature search, and generating a "Chew on this" explainer — and nowhere else. A cow
// that gallops across the screen every time a board card saves its position stops being
// charming by about the fourth save, so the small, frequent waits keep their plain spinner
// (see components/Spinner.tsx).
export default function RunningCowLoader({
  message,
  className = "",
}: {
  /** One short line, present tense. Not a rotating list — the wait isn't long enough. */
  message: string;
  className?: string;
}) {
  return (
    // On its own panel: this loader appears over the tiled grass background, where muted
    // body text on green is unreadable. Everything else in the app that has something to
    // say says it on a panel, and so does this.
    <div
      className={`mx-auto flex w-fit max-w-full flex-col items-center gap-2 rounded-lg border border-border-strong bg-panel/95 p-4 shadow-sm ${className}`}
    >
      <div className="w-full max-w-[320px] overflow-hidden rounded-md border border-border-strong bg-[#C9DA9E]">
        <svg
          viewBox="0 0 320 96"
          className="block w-full h-auto"
          role="presentation"
          aria-hidden="true"
          focusable="false"
        >
          {/* a short strip of the same hills the page background uses, so the cow is
              running somewhere rather than on a blank rectangle */}
          <path
            d="M0,52 Q60,40 120,48 Q190,34 250,50 Q290,42 320,52 L320,96 L0,96 Z"
            fill="#8CA555"
            stroke="#2B2A1F"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M0,74 Q80,64 160,72 Q240,62 320,74 L320,96 L0,96 Z"
            fill="#5E7A3B"
            stroke="#2B2A1F"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <g className="cow-run">
            <CowDoodle transform="translate(40,28) scale(0.62)" running />
          </g>
        </svg>
      </div>
      {/* The text is the accessible half of this: the animation is decorative and hidden,
          so the live region is what a screen reader announces. */}
      <p role="status" aria-live="polite" className="text-sm font-medium text-fg">
        {message}
      </p>
    </div>
  );
}
