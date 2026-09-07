// One geometry for every button in the app.
//
// These had drifted into six different sizes for the same kind of control — px-3/py-1.5
// text-xs in one place, px-5/py-2.5 text-base in another — so whichever button happened to
// be largest read as the most important thing on screen, regardless of what it did. Size is
// fixed by role now, and colour alone separates a primary action from a quiet one. The `md`
// geometry deliberately matches tabClass in lib/tabStyles.ts, so buttons and tabs sitting in
// the same row line up instead of nearly lining up.

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-md font-medium shadow-sm transition duration-150 active:translate-y-px active:shadow-2xs motion-reduce:active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2";

const SIZES = {
  /** Secondary actions sharing a row with body text or metadata. */
  sm: "px-2.5 py-1 text-xs",
  /** The default. Header actions, form submits, the primary action on a card. */
  md: "px-3 py-1.5 text-sm",
} as const;

const TONES = {
  /** Submitting, confirming, and The Combine's own actions. */
  primary: "border border-moss bg-moss text-white hover:brightness-110 focus-visible:outline-moss",
  /** "Chew on this", and nothing else — one accent colour kept for one job. */
  accent: "border border-teal bg-teal text-white hover:brightness-110 focus-visible:outline-teal",
  /** Actions that shouldn't compete with the primary one on the same row. */
  quiet:
    "border border-border-strong bg-panel text-fg hover:border-moss hover:text-moss focus-visible:outline-moss",
} as const;

export type ButtonTone = keyof typeof TONES;
export type ButtonSize = keyof typeof SIZES;

export function buttonClass(tone: ButtonTone, size: ButtonSize = "md", extra = ""): string {
  return `${BASE} ${SIZES[size]} ${TONES[tone]}${extra ? ` ${extra}` : ""}`;
}
