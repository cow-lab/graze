import type { ReactNode } from "react";

// Every "nothing here yet" message in the app. These sit directly on the illustrated
// field background, so muted text alone is genuinely hard to read — it needs the same
// card treatment as real content, not just a smaller font.
export default function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="bg-panel/95 border border-border-strong rounded-lg px-5 py-6 shadow-sm">
      <p className="text-sm text-fg-muted text-center">{children}</p>
    </div>
  );
}
