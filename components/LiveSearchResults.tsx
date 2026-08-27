"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Quote, Plus } from "lucide-react";
import Link from "next/link";
import { promoteToGraze } from "@/lib/actions/search";
import type { LiveSearchResult } from "@/lib/liveSearch";

type Board = { slug: string; name: string };

export default function LiveSearchResults({
  results,
  boards,
}: {
  results: LiveSearchResult[];
  boards: Board[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {results.map((result, i) => (
        <ResultRow key={result.doi ?? `${result.title}-${i}`} result={result} boards={boards} />
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
  | { status: "rejected"; reason: "no-abstract" | "not-allowlisted" }
  | { status: "error"; message: string };

function ResultRow({ result, boards }: { result: LiveSearchResult; boards: Board[] }) {
  const [boardSlug, setBoardSlug] = useState(boards[0]?.slug ?? "");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!boardSlug) return;
    startTransition(async () => {
      const result_ = await promoteToGraze(result, boardSlug);
      setOutcome(result_);
    });
  }

  return (
    <div className="bg-panel/95 border border-border-strong rounded-lg p-4 shadow-sm">
      <h3 className="font-heading text-base font-semibold leading-snug">{result.title}</h3>
      <p className="text-sm text-fg-muted mt-0.5">
        {result.authors} {result.venue && <>· {result.venue}</>} {result.year && <>· {result.year}</>}
      </p>
      {result.abstract && (
        <p className="text-sm mt-2 leading-relaxed line-clamp-3">{result.abstract}</p>
      )}
      <div className="flex items-center gap-4 mt-3 font-mono text-[11px] text-fg-muted flex-wrap">
        <span className="inline-flex items-center gap-1">
          <Quote size={11} /> {result.citationCount.toLocaleString()} citations
        </span>
        {result.doi && <span>DOI: {result.doi}</span>}
        {(result.oaUrl || result.doi) && (
          <a
            href={result.oaUrl ?? `https://doi.org/${result.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-moss hover:underline"
          >
            View source <ExternalLink size={11} />
          </a>
        )}
      </div>

      {outcome ? (
        <OutcomeMessage outcome={outcome} />
      ) : (
        <div className="flex items-center gap-2 mt-3">
          <select
            value={boardSlug}
            onChange={(e) => setBoardSlug(e.target.value)}
            className="bg-panel-2 border border-border rounded-md px-2 py-1.5 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-moss"
          >
            {boards.map((b) => (
              <option key={b.slug} value={b.slug}>
                F~{b.slug}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending || !boardSlug}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-moss text-ink text-xs font-medium hover:brightness-110 transition disabled:opacity-60"
          >
            <Plus size={12} /> {isPending ? "Adding…" : "Add to Graze"}
          </button>
        </div>
      )}
    </div>
  );
}

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
          {outcome.reason === "no-abstract"
            ? "Couldn't add — no abstract is available for this result."
            : "Couldn't add — rejected."}
        </p>
      );
    case "error":
      return <p className="text-xs text-rose mt-3">{outcome.message}</p>;
  }
}
