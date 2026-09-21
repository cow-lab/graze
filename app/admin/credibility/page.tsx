import { requireAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import AdminNav from "@/components/AdminNav";
import SectionHeading from "@/components/SectionHeading";
import EmptyState from "@/components/EmptyState";
import PredatoryFlagActions from "@/components/PredatoryFlagActions";
import RunPredatorySyncButton from "@/components/RunPredatorySyncButton";
import { PAGE_HEADER, PANEL } from "@/lib/surfaces";
import { PREDATORY_LIST_URL } from "@/lib/credibility/sources/predatoryList";

export const dynamic = "force-dynamic";

// The operator's view of the one automated check that can hide research from readers.
//
// Everything here exists because the predatory list matches on journal *name*, and a name
// is not an identifier. The held-for-review section is the important half: those are cases
// where the list and a reputable index disagree, or where the listed name is too generic to
// be sure. They are deliberately not acted on automatically.
export default async function AdminCredibilityPage() {
  await requireAdminUser();

  const [syncs, flags, entryCount, ambiguousCount] = await Promise.all([
    prisma.predatoryListSync.findMany({ orderBy: { ranAt: "desc" }, take: 6 }),
    prisma.journalFlag.findMany({
      where: { kind: { in: ["PREDATORY_LIST", "OPERATOR_NOTE"] } },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
      include: { journal: { select: { title: true, publisher: true, inDoaj: true, inMedline: true } } },
    }),
    prisma.predatoryListEntry.count(),
    prisma.predatoryListEntry.count({ where: { ambiguous: true } }),
  ]);

  const suppressed = flags.filter((f) => f.kind === "PREDATORY_LIST" && f.severity === "EXCLUDE");
  const held = flags.filter((f) => f.kind === "PREDATORY_LIST" && f.severity === "CAUTION");
  const dismissed = flags.filter((f) => f.kind === "OPERATOR_NOTE");
  const last = syncs[0];

  return (
    <div className="mx-auto max-w-3xl">
      <div className={`${PAGE_HEADER} mb-8`}>
        <h1 className="mb-1 font-heading text-2xl font-semibold">Credibility</h1>
        <p className="text-sm text-fg-muted">
          The predatory-journal list is synced automatically every Monday. It matches on
          journal name, not ISSN, so it can be wrong in both directions — this page is where
          you check it.{" "}
          <a href={PREDATORY_LIST_URL} target="_blank" rel="noopener noreferrer" className="text-moss underline">
            See the source list
          </a>
          .
        </p>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-fg-muted">
          <div>
            <dt className="inline">entries </dt>
            <dd className="inline font-medium text-fg tabular-nums">{entryCount.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="inline">too generic to act on alone </dt>
            <dd className="inline font-medium text-fg tabular-nums">{ambiguousCount.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="inline">suppressed </dt>
            <dd className="inline font-medium text-fg tabular-nums">{suppressed.length}</dd>
          </div>
          <div>
            <dt className="inline">held for review </dt>
            <dd className="inline font-medium text-fg tabular-nums">{held.length}</dd>
          </div>
        </dl>
        <div className="mt-4">
          <RunPredatorySyncButton />
        </div>
      </div>

      <SectionHeading title="Held for review" />
      <p className="mb-3 text-sm text-fg-muted">
        Matched the list, but not acted on: either a reputable index also lists the journal,
        or the listed name is generic enough that it may be a different publication. These
        are shown to readers with a note, never hidden.
      </p>
      {held.length === 0 ? (
        <EmptyState>Nothing waiting.</EmptyState>
      ) : (
        <ul className="mb-8 flex flex-col gap-2">
          {held.map((flag) => (
            <li key={flag.id} className={PANEL}>
              <p className="font-heading text-[15px] font-semibold">
                {flag.journal.title ?? flag.issn}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-fg-muted">
                ISSN {flag.issn}
                {flag.journal.publisher ? ` · ${flag.journal.publisher}` : ""}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-fg">{flag.note}</p>
              <div className="mt-3">
                <PredatoryFlagActions issn={flag.issn} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <SectionHeading title="Suppressed from default results" />
      {suppressed.length === 0 ? (
        <EmptyState>Nothing is being suppressed.</EmptyState>
      ) : (
        <ul className="mb-8 flex flex-col gap-2">
          {suppressed.map((flag) => (
            <li key={flag.id} className={PANEL}>
              <p className="font-heading text-[15px] font-semibold">
                {flag.journal.title ?? flag.issn}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-fg-muted">ISSN {flag.issn}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-fg">{flag.note}</p>
              <div className="mt-3">
                <PredatoryFlagActions issn={flag.issn} suppressed />
              </div>
            </li>
          ))}
        </ul>
      )}

      {dismissed.length > 0 && (
        <>
          <SectionHeading title="Dismissed by you" />
          <ul className="mb-8 flex flex-col gap-2">
            {dismissed.map((flag) => (
              <li key={flag.id} className={PANEL}>
                <p className="font-heading text-[15px] font-semibold">
                  {flag.journal.title ?? flag.issn}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">{flag.note}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      <SectionHeading title="Recent syncs" />
      <ul className="mb-8 flex flex-col gap-2">
        {syncs.map((sync) => (
          <li
            key={sync.id}
            className={`${PANEL} ${sync.ok ? "" : "border-l-[3px] border-l-rose"}`}
          >
            <p className="font-mono text-[11px] uppercase tracking-wide text-fg-muted">
              {sync.ranAt.toISOString().replace("T", " ").slice(0, 16)} ·{" "}
              {sync.ok ? "applied" : "refused"}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-fg">{sync.message}</p>
          </li>
        ))}
        {syncs.length === 0 && <EmptyState>Never run.</EmptyState>}
      </ul>
      {last && !last.ok && (
        <p className="mb-8 text-sm text-rose">
          The last sync was refused, so the flags above are from an earlier run. Check the
          source list before forcing it through.
        </p>
      )}

      <AdminNav />
    </div>
  );
}
