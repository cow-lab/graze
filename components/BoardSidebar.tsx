import Link from "next/link";
import { Users, TrendingUp, Plus, Sparkles } from "lucide-react";
import { getSidebarFields, getHerdStats } from "@/lib/posts";
import ReportFieldForm from "@/components/ReportFieldForm";
import MobileFieldsDrawer from "@/components/MobileFieldsDrawer";
import FieldLabel from "@/components/FieldLabel";

type SidebarField = Awaited<ReturnType<typeof getSidebarFields>>["active"][number];

// A long slug (e.g. a Combine-suggested "MembraneSeparationAndGasTransport") has no
// natural break point, so it would otherwise blow straight out of the fixed-width
// sidebar. FieldLabel adds wrap opportunities so the whole name stays legible over two
// lines rather than being cut off. `min-w-0` is what actually lets the flex child shrink
// below its content width, and `shrink-0` pins the count so it can't be pushed out.
function FieldRow({ board, activeSlug }: { board: SidebarField; activeSlug?: string }) {
  return (
    <Link
      href={`/?board=${board.slug}`}
      title={board.name}
      className={`flex items-start justify-between gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
        activeSlug === board.slug
          ? "bg-panel-2 text-ink"
          : "text-fg-muted hover:text-ink hover:bg-panel-2/60"
      }`}
    >
      <span className="min-w-0">
        <FieldLabel slug={board.slug} />
        {board.isAiSuggested && (
          <Sparkles
            size={10}
            // Inline (not a flex sibling) so it trails the last word when the label
            // wraps, instead of floating against the middle of the wrapped block.
            className="text-teal inline-block align-middle ml-1"
            aria-label="Suggested by The Combine"
          aria-hidden="true" />
        )}
      </span>
      <span className="font-mono text-[10px] text-fg-muted shrink-0 mt-0.5">
        {board._count.posts}
      </span>
    </Link>
  );
}

export default async function BoardSidebar({ activeSlug }: { activeSlug?: string }) {
  const [{ active, provisional }, stats] = await Promise.all([getSidebarFields(), getHerdStats()]);

  const fieldsList = (
    <>
      <h2 className="font-mono text-[11px] uppercase tracking-wide text-fg-muted px-1 mb-2">
        Fields
      </h2>
      <nav className="flex flex-col">
        <Link
          href="/"
          className={`flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors ${
            !activeSlug ? "bg-panel-2 text-ink" : "text-fg-muted hover:text-ink hover:bg-panel-2/60"
          }`}
        >
          <span>All fields</span>
        </Link>
        {active.map((board) => (
          <FieldRow key={board.id} board={board} activeSlug={activeSlug} />
        ))}
        <Link
          href="/fields/new"
          className="flex items-center gap-1.5 px-2 py-1.5 rounded text-sm text-moss hover:bg-panel-2/60 transition-colors mt-1"
        >
          <Plus size={13} aria-hidden="true" /> New Field
        </Link>
      </nav>

      {provisional.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-fg-muted px-1 mb-1">
            New fields
          </h2>
          <p className="text-[10.5px] text-fg-muted px-2 mb-1.5 leading-snug">
            Not yet promoted to the main list — needs posts from a few different people first.
          </p>
          <nav className="flex flex-col">
            {provisional.map((board) => (
              <FieldRow key={board.id} board={board} activeSlug={activeSlug} />
            ))}
          </nav>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
          <Users size={12} aria-hidden="true" />
          {stats.inTheHerd.toLocaleString()} in the herd
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
          <TrendingUp size={12} aria-hidden="true" />
          {stats.grazingThisMonth.toLocaleString()} grazing this month
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <ReportFieldForm fields={[...active, ...provisional].map((b) => ({ id: b.id, slug: b.slug }))} />
      </div>
    </>
  );

  const activeLabel = activeSlug ? <FieldLabel slug={activeSlug} /> : "All fields";

  return (
    <>
      {/* Below the ~768px tablet breakpoint this collapses into a dropdown instead of a
          fixed left column — a full-height field list stacked above the feed would push
          all the actual content below the fold on a phone. */}
      <div className="w-full md:hidden">
        <MobileFieldsDrawer activeLabel={activeLabel}>{fieldsList}</MobileFieldsDrawer>
      </div>
      <aside className="hidden md:block md:w-56 shrink-0">
        <div className="bg-panel/80 backdrop-blur-sm border border-border rounded-lg p-3">
          {fieldsList}
        </div>
      </aside>
    </>
  );
}
