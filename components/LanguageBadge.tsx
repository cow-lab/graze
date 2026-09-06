import { Languages } from "lucide-react";
import { isNonEnglish, languageName } from "@/lib/language";

// Shown only when a paper's original language isn't English. This is disclosure, not a
// warning — the "Chew on this" summary is written in English, so a reader following the
// panel's advice to check it against the source needs to know the source is a translation
// away. Neutral styling for that reason.
export default function LanguageBadge({ code }: { code: string | null | undefined }) {
  if (!isNonEnglish(code)) return null;

  return (
    <span
      title="This paper was published in another language — any English summary here is one step removed from the original."
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border-strong bg-panel-2 text-fg-muted font-mono text-[10px] uppercase tracking-wide"
    >
      <Languages size={10} aria-hidden="true" /> Original language: {languageName(code)}
    </span>
  );
}
