import { ExternalLink, Quote, LockOpen } from "lucide-react";
import type { RelatedPaper } from "@/lib/relatedPapers";

export default function RelatedPapers({ papers }: { papers: RelatedPaper[] }) {
  if (papers.length === 0) return null;

  return (
    <div>
      <h3 className="font-mono text-[11px] uppercase tracking-wide text-fg-muted mb-2">
        Related papers
      </h3>
      <p className="text-xs text-fg-muted mb-2">
        Sharing this paper&apos;s topic and concept tags, via OpenAlex. These aren&apos;t in
        Graze — they link straight out to the source.
      </p>
      <ul className="flex flex-col gap-2">
        {papers.map((p, i) => (
          <li key={i} className="bg-panel-2 border border-border rounded-md px-3 py-2">
            <p className="text-sm font-medium leading-snug">{p.title}</p>
            <p className="text-xs text-fg-muted mt-0.5">
              {[p.authors, p.venue, p.year].filter(Boolean).join(" · ")}
            </p>
            <div className="flex items-center gap-3 mt-1 font-mono text-[11px] text-fg-muted flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Quote size={11} aria-hidden="true" /> {p.citationCount.toLocaleString()}
              </span>
              {p.isOpenAccess && (
                <span className="inline-flex items-center gap-1 text-moss">
                  <LockOpen size={11} aria-hidden="true" /> Free to read
                </span>
              )}
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-moss hover:underline rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
                >
                  View <ExternalLink size={11} aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
