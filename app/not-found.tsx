import Link from "next/link";
import { buttonClass } from "@/lib/controls";
import { CowDoodle } from "@/components/CowDoodle";

export const metadata = { title: "Page not found" };

// A 404 is a dead end unless it offers a way on. The three links below cover every reason
// someone lands here: a stale link to a paper, a mistyped path, or a search that should
// have been run from the homepage in the first place.
export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-lg border border-border-strong bg-panel p-6 shadow-sm sm:p-8">
        <svg
          viewBox="0 0 220 130"
          className="mb-4 h-28 w-full max-w-[240px]"
          role="presentation"
          aria-hidden="true"
          focusable="false"
        >
          <CowDoodle transform="translate(110,96) scale(0.85)" />
        </svg>

        <p className="font-mono text-xs font-medium uppercase tracking-wide text-fg-muted">
          404
        </p>
        <h1 className="mt-1 font-heading text-2xl font-semibold">
          Nothing grazing here
        </h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
          This page doesn&apos;t exist, or the paper behind it was removed. Nothing has gone
          wrong on your end.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Link href="/" className={buttonClass("primary")}>
            Search the literature
          </Link>
          <Link href="/research" className={buttonClass("quiet")}>
            Browse the library
          </Link>
        </div>
      </div>
    </div>
  );
}
