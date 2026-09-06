import type { ReactNode } from "react";

// A heading that labels a list of cards below it (e.g. "Reported Fields", "Posts").
// Rendered as a slim card strip rather than bare text, so it doesn't float unbacked on
// the illustrated background — same surface as the content it introduces, just shorter.
export default function SectionHeading({
  title,
  description,
}: {
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="bg-panel/95 border border-border-strong rounded-lg px-4 py-2.5 shadow-sm mb-3">
      <h2 className="font-heading text-base font-semibold flex items-center gap-2">{title}</h2>
      {description && <p className="text-xs text-fg-muted mt-1 leading-snug">{description}</p>}
    </div>
  );
}
