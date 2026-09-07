import type { ReactNode } from "react";
import { PANEL } from "@/lib/surfaces";
import { POLICY_LAST_UPDATED } from "@/lib/legal";

// Shared shell for the four policy pages, so they read as one document set rather than
// four pages that drifted apart. Prose styling is applied with descendant variants rather
// than a typography plugin — the project doesn't have one, and a policy page is plain
// enough that adding a dependency for it isn't worth the bytes.
export default function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <article
        className={`${PANEL} [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_h2]:mt-7 [&_h2]:mb-2 [&_h3]:font-heading [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-1.5 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-fg [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_li]:text-sm [&_li]:leading-relaxed [&_li]:flex [&_li]:gap-2 [&_a]:text-moss [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold`}
      >
        <h1 className="font-heading text-2xl font-semibold">{title}</h1>
        <p className="mt-1 font-mono text-xs uppercase tracking-wide text-fg-muted">
          Last updated: {POLICY_LAST_UPDATED}
        </p>
        <p className="mt-4 border-l-2 border-moss/40 pl-3 text-sm leading-relaxed text-fg-muted">
          {intro}
        </p>
        {children}
      </article>
    </div>
  );
}

/** A bullet. The marker is a real character rather than a list-style so it inherits colour. */
export function Item({ children }: { children: ReactNode }) {
  return (
    <li>
      <span aria-hidden="true" className="mt-px shrink-0 text-moss">
        —
      </span>
      <span>{children}</span>
    </li>
  );
}
