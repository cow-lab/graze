"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

// Discover's search box, in both of its sizes. Submitting doesn't leave for a search page —
// there isn't one. It pushes `?q=` onto the route it's already on, so the same component
// re-renders in its results state.
//
// The query does go in the URL, deliberately: a search you can't link to, bookmark, or back
// out of isn't a search, and the results are server-rendered from it. Pure client state
// would have been "no navigation" in a stricter sense and worse in every way that matters.
export default function DiscoverSearch({
  initialQuery = "",
  openAccessOnly = true,
  size = "hero",
}: {
  initialQuery?: string;
  openAccessOnly?: boolean;
  /** "hero" is the landing box; "compact" is the one that rides along above results. */
  size?: "hero" | "compact";
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [openAccess, setOpenAccess] = useState(openAccessOnly);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const params = new URLSearchParams({ q: trimmed });
    if (!openAccess) params.set("oa", "0");
    router.push(`/?${params}`);
  }

  const hero = size === "hero";

  return (
    // `action="/"` and the named inputs make this a working GET form without JavaScript;
    // the onSubmit above upgrades it to a soft navigation when JS is there.
    <form action="/" onSubmit={submit} className="w-full">
      <label htmlFor={`discover-search-${size}`} className="sr-only">
        Search research by title, author, or field
      </label>
      <div
        className={`flex items-center gap-2 rounded-full border border-border-strong bg-panel shadow-sm transition-shadow focus-within:border-moss focus-within:shadow-md ${
          hero ? "py-1.5 pl-5 pr-1.5" : "py-1 pl-4 pr-1"
        }`}
      >
        <Search size={hero ? 18 : 15} className="shrink-0 text-fg-muted" aria-hidden="true" />
        <input
          id={`discover-search-${size}`}
          type="text"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          placeholder="Search research…"
          className={`min-w-0 flex-1 bg-transparent text-fg placeholder:text-fg-muted focus:outline-none ${
            hero ? "py-2 text-base" : "py-1.5 text-sm"
          }`}
        />
        <button
          type="submit"
          className={`shrink-0 rounded-full bg-moss font-medium text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss ${
            hero ? "px-5 py-2.5 text-sm" : "px-4 py-1.5 text-xs"
          }`}
        >
          Search
        </button>
      </div>

      {/* Open-access-only is on unless switched off — you have to opt *in* to seeing work
          you can't read. Mirrored as a hidden field so the no-JS path sends it too. */}
      <input type="hidden" name="oa" value={openAccess ? "1" : "0"} />
      <label
        className={`mt-2 flex w-fit cursor-pointer items-center gap-2 text-fg-muted ${
          hero ? "mx-auto text-xs" : "text-[11px]"
        }`}
      >
        <input
          type="checkbox"
          checked={openAccess}
          onChange={(e) => setOpenAccess(e.target.checked)}
          className="accent-moss"
        />
        Open access only — hide results you can&apos;t read for free
      </label>
    </form>
  );
}
