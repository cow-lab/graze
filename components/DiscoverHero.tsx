import Link from "next/link";
import FieldScene from "@/components/FieldScene";
import DiscoverSearch from "@/components/DiscoverSearch";

// Discover's landing state. One job: say what this place is, then get out of the way of the
// search box. The illustrated scene that fills the top of every other page is cropped to a
// strip along the bottom edge here, so it reads as a horizon behind the search rather than
// a backdrop competing with it.
export default function DiscoverHero({
  fields,
}: {
  fields: { slug: string; name: string }[];
}) {
  return (
    <section
      // Full-bleed out of <main>'s centred column, and opaque: the page's tiled grass sits
      // fixed behind everything, and this view wants sky above the horizon, not field.
      // (The layout clips horizontal overflow so 100vw can't add a scrollbar.)
      className="relative -mt-6 ml-[calc(50%-50vw)] w-screen bg-cream"
    >
      {/* Exactly the viewport minus the sticky header (57px below sm, 86px from sm up —
          measured, and `-mt-6` above already cancels <main>'s top padding). That makes the
          section below start precisely at the fold: still one scroll away, never peeking. */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-57px)] max-w-2xl flex-col items-center justify-center px-4 pt-8 pb-[max(150px,24.5vw)] text-center sm:min-h-[calc(100dvh-86px)]">
        <h1 className="font-hand text-[clamp(56px,11vw,96px)] leading-[0.95] font-bold text-ink">
          Graze
        </h1>
        <p className="mt-1 text-sm font-medium italic text-moss">
          Take what&apos;s useful. Leave something back.
        </p>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-fg-muted">
          Every paper <strong className="font-semibold text-moss">Field-Tested</strong> — peer
          review, journal listing and retractions, all shown, not asserted. Every paper worth a{" "}
          <strong className="font-semibold text-teal">Chew on this</strong>: the plain-language
          version, then the real thing. Neither one does the thinking for you.
        </p>

        <div className="mt-7 w-full max-w-xl">
          <DiscoverSearch />
        </div>

        <p className="mt-3 text-xs text-fg-muted">
          Searches Graze&apos;s library and the whole of OpenAlex — 250M+ works — together.
        </p>

        {fields.length > 0 && (
          <p className="mt-8 flex flex-wrap items-center justify-center gap-x-1 gap-y-1.5 font-mono text-[11px] text-fg-muted">
            <span className="mr-1">or browse:</span>
            {fields.map((field, i) => (
              <span key={field.slug}>
                <Link href={`/?board=${field.slug}`} className="hover:text-moss hover:underline">
                  F~{field.slug}
                </Link>
                {i < fields.length - 1 && <span className="mx-1 text-fg-muted/60">·</span>}
              </span>
            ))}
          </p>
        )}
      </div>

      {/* the horizon — same drawing as the page background, cropped to its lower strip */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 select-none"
        style={{ height: "max(120px, 24.5vw)" }}
      >
        <FieldScene variant="horizon" />
      </div>
    </section>
  );
}
