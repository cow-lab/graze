"use client";

import { useState, useTransition } from "react";
import { Quote, Plus, LockOpen, Lock } from "lucide-react";
import Link from "next/link";
import { promoteToGraze } from "@/lib/actions/search";
import { explainLiveResult } from "@/lib/actions/explain";
import ExplainerPanel from "@/components/ExplainerPanel";
import AddToBoardButton from "@/components/AddToBoardButton";
import SourceLink from "@/components/SourceLink";
import JargonText from "@/components/JargonText";
import LanguageBadge from "@/components/LanguageBadge";
import { formatAuthors } from "@/lib/utils";
import type { GlossaryTerm } from "@/lib/jargon";
import FieldPicker, { type PickerSuggestion } from "@/components/FieldPicker";
import FieldTested from "@/components/FieldTested";
import type { Assessment } from "@/lib/credibility/assess";
import type { LiveSearchResult } from "@/lib/liveSearch";
import { buttonClass } from "@/lib/controls";

type Board = { slug: string; name: string };

// Live results carry the publisher's own work type and nothing else — none of Graze's
// checks have run against them yet, which is what "Not yet checked" says.
function isPreprintType(workType: string | null): boolean {
  const type = workType?.toLowerCase().trim();
  return type === "posted-content" || type === "preprint";
}

export default function LiveSearchResults({
  results,
  boards,
  suggestionsByResult,
  credibility,
  isLoggedIn,
  boardedDois,
  termsByDoi,
}: {
  results: LiveSearchResult[];
  boards: Board[];
  // Field suggestions per result, in the same order — computed server-side with the same
  // matcher The Combine runs, so "Add to Graze" opens with the right Fields already ticked
  // instead of a blank dropdown.
  suggestionsByResult: PickerSuggestion[][];
  /** Journal credibility keyed by ISSN, assessed server-side for the whole page. */
  credibility: Record<string, Assessment>;
  isLoggedIn: boolean;
  boardedDois: string[];
  // Glossaries already cached for these papers, keyed by DOI. Absent for anything nobody
  // has opened "Chew on this" on yet — those simply render without jargon underlines.
  termsByDoi: Record<string, GlossaryTerm[]>;
}) {
  return (
    <div className="flex flex-col gap-3">
      {results.map((result, i) => (
        <ResultRow
          key={result.doi ?? `${result.title}-${i}`}
          result={result}
          boards={boards}
          suggestions={suggestionsByResult[i] ?? []}
          assessment={(result.issn && credibility[result.issn]) || null}
          isLoggedIn={isLoggedIn}
          initialOnBoard={!!result.doi && boardedDois.includes(result.doi)}
          terms={(result.doi && termsByDoi[result.doi]) || []}
        />
      ))}
    </div>
  );
}

type Outcome =
  | { status: "published"; postId: string }
  | { status: "pending"; postId: string }
  | { status: "duplicate"; existingPostId: string }
  | { status: "preprint-skipped"; existingPostId: string }
  | { status: "preprint-attached"; existingPostId: string }
  | {
      status: "rejected";
      reason: "no-abstract" | "not-allowlisted" | "not-peer-reviewed" | "retracted";
    }
  | { status: "error"; message: string };

function ResultRow({
  result,
  boards,
  suggestions,
  assessment,
  terms,
  isLoggedIn,
  initialOnBoard,
}: {
  result: LiveSearchResult;
  boards: Board[];
  suggestions: PickerSuggestion[];
  assessment: Assessment | null;
  terms: GlossaryTerm[];
  isLoggedIn: boolean;
  initialOnBoard: boolean;
}) {
  // Pre-ticked with whatever the matcher proposed; the person can add or remove before
  // confirming. Nothing is filed automatically, and nothing demands a choice from scratch.
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(suggestions.map((s) => s.slug));
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (selectedSlugs.length === 0) return;
    startTransition(async () => {
      const result_ = await promoteToGraze(
        result,
        selectedSlugs,
        suggestions.map((s) => s.slug),
      );
      setOutcome(result_);
    });
  }

  // Point at the free full text whenever one exists; only fall back to the publisher's
  // (likely paywalled) page or a DOI resolver when it doesn't.
  const readUrl =
    result.oaUrl ?? result.landingUrl ?? (result.doi ? `https://doi.org/${result.doi}` : null);

  return (
    <div className="bg-panel/95 border border-border-strong rounded-lg p-4 shadow-sm">
      <div className="mb-1.5 flex items-start gap-2 flex-wrap">
        <FieldTested
          size="compact"
          state={isPreprintType(result.workType) ? "PREPRINT" : "UNCHECKED"}
          breakdown={{
            peerReviewed: isPreprintType(result.workType) ? false : result.workType ? true : null,
            doajListed:
              assessment?.indexes.find((index) => index.name === "DOAJ")?.state === "in"
                ? true
                : null,
            retracted: false,
            retractionChecked: false,
            citationCount: result.citationCount,
          }}
          journal={assessment}
        />
        <AccessBadge isOpenAccess={result.isOpenAccess} />
        <LanguageBadge code={result.language} />
      </div>
      <h3 className="font-heading text-base font-semibold leading-snug">
        <JargonText text={result.title} terms={terms} />
      </h3>
      <p className="text-sm text-fg-muted mt-0.5">
        {formatAuthors(result.authors)} {result.venue && <>· {result.venue}</>}{" "}
        {result.year && <>· {result.year}</>}
      </p>
      {result.abstract && (
        <p className="text-sm mt-2 leading-relaxed line-clamp-3">
          <JargonText text={result.abstract} terms={terms} />
        </p>
      )}
      <div className="flex items-center gap-4 mt-3 font-mono text-[11px] text-fg-muted flex-wrap">
        <span className="inline-flex items-center gap-1">
          <Quote size={11} aria-hidden="true" /> {result.citationCount.toLocaleString()} citations
        </span>
        {result.doi && <span>DOI: {result.doi}</span>}
        {readUrl && (
          <SourceLink
            href={readUrl}
            paper={{ doi: result.doi }}
            className="inline-flex items-center gap-1 text-moss hover:underline rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
          >
            {result.isOpenAccess ? "Read free version" : "View source"}
          </SourceLink>
        )}
      </div>

      {/* "Chew on this" is the thing to do with a paper you've just found; keeping it for
          later is the smaller decision, so it reads as the smaller button. */}
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <ExplainerPanel
          language={result.language}
          paper={{ doi: result.doi }}
          sourceUrl={readUrl}
          load={async () => {
            const res = await explainLiveResult({
              doi: result.doi,
              title: result.title,
              authors: result.authors,
              venue: result.venue,
              abstract: result.abstract,
            });
            return res.status === "ok"
              ? { ok: true as const, explainer: res.explainer }
              : { ok: false as const, message: res.message };
          }}
        />
        <AddToBoardButton
          external={{
            doi: result.doi,
            title: result.title,
            authors: result.authors,
            venue: result.venue,
            year: result.year,
            url: readUrl,
          }}
          initialOnBoard={initialOnBoard}
          isLoggedIn={isLoggedIn}
        />
      </div>

      {outcome ? (
        <OutcomeMessage outcome={outcome} />
      ) : (
        <div className="mt-3 rounded-md border border-border bg-panel-2/40 p-2.5">
          <FieldPicker
            fields={boards}
            suggestions={suggestions}
            selected={selectedSlugs}
            onChange={setSelectedSlugs}
            idPrefix={`add-${result.doi ?? result.title.slice(0, 20)}`}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending || selectedSlugs.length === 0}
            className={buttonClass("primary", "sm", "mt-2.5")}
          >
            <Plus size={12} aria-hidden="true" />{" "}
            {isPending
              ? "Adding…"
              : `Add to Graze${selectedSlugs.length > 1 ? ` (${selectedSlugs.length} Fields)` : ""}`}
          </button>
        </div>
      )}
    </div>
  );
}

// Paywalled is a fact about access, not a quality judgement — so it gets a neutral
// treatment rather than the rose/alert colour used elsewhere for problems.
function AccessBadge({ isOpenAccess }: { isOpenAccess: boolean }) {
  if (isOpenAccess) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-moss/40 bg-moss/10 text-moss font-mono text-[10px] uppercase tracking-wide">
        <LockOpen size={10} aria-hidden="true" /> Free to read
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border-strong bg-panel-2 text-fg-muted font-mono text-[10px] uppercase tracking-wide">
      <Lock size={10} aria-hidden="true" /> Paywalled
    </span>
  );
}

// Why a paper didn't make it in, in the same terms the checks are stated in. "Rejected"
// on its own tells someone nothing about whether to try a different version of the paper.
const REJECTION_MESSAGES: Record<
  "no-abstract" | "not-allowlisted" | "not-peer-reviewed" | "retracted",
  string
> = {
  "no-abstract": "Couldn't add — no abstract is available for this result.",
  "not-allowlisted": "Couldn't add — that journal isn't DOAJ-listed.",
  "not-peer-reviewed":
    "Not added — this is a preprint. It stays readable here; the library is peer-reviewed work only.",
  retracted: "Not added — there's a retraction notice on record for this paper.",
};

function OutcomeMessage({ outcome }: { outcome: Outcome }) {
  switch (outcome.status) {
    case "published":
      return (
        <p className="text-xs text-teal mt-3">
          Added and published —{" "}
          <Link href={`/post/${outcome.postId}`} className="underline">
            view it
          </Link>
        </p>
      );
    case "pending":
      return (
        <p className="text-xs text-moss mt-3">
          Added — its journal isn&apos;t on the allowlist yet, so it&apos;s queued at{" "}
          <Link href="/admin/queue" className="underline">
            /admin/queue
          </Link>{" "}
          for review.
        </p>
      );
    case "duplicate":
      return (
        <p className="text-xs text-fg-muted mt-3">
          Already in Graze —{" "}
          <Link href={`/post/${outcome.existingPostId}`} className="underline">
            view it
          </Link>
        </p>
      );
    case "preprint-skipped":
      return (
        <p className="text-xs text-fg-muted mt-3">
          Not added — a peer-reviewed version of this is already in Graze as a preprint/
          published pair —{" "}
          <Link href={`/post/${outcome.existingPostId}`} className="underline">
            view it
          </Link>
        </p>
      );
    case "preprint-attached":
      return (
        <p className="text-xs text-teal mt-3">
          This paper&apos;s preprint is already posted — attached the published version&apos;s
          DOI, venue, and citation count to it instead of creating a duplicate —{" "}
          <Link href={`/post/${outcome.existingPostId}`} className="underline">
            view it
          </Link>
        </p>
      );
    case "rejected":
      return (
        <p className="text-xs text-rose mt-3">
          {REJECTION_MESSAGES[outcome.reason]}
        </p>
      );
    case "error":
      return <p className="text-xs text-rose mt-3">{outcome.message}</p>;
  }
}
