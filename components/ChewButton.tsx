"use client";

import ExplainerPanel from "@/components/ExplainerPanel";
import { explainStoredPost } from "@/lib/actions/explain";
import type { PaperRef } from "@/lib/actions/engagement";

// The card-level entry point to "Chew on this". A thin client wrapper so a server-rendered
// card can carry the button: the explainer body is fetched on click rather than travelling
// with every row of the feed.
export default function ChewButton({
  postId,
  paper,
  sourceUrl,
  language,
}: {
  postId: string;
  paper: PaperRef;
  sourceUrl?: string | null;
  language?: string | null;
}) {
  return (
    <ExplainerPanel
      paper={paper}
      sourceUrl={sourceUrl}
      language={language}
      discussHref={`/post/${postId}#comments`}
      load={async () => {
        // ExplainerPanel speaks {ok, …}; the action speaks {status, …}. Translated here
        // rather than reshaping either, since the live-search path already uses this shape.
        const result = await explainStoredPost(postId);
        return result.status === "ok"
          ? { ok: true as const, explainer: result.explainer }
          : { ok: false as const, message: result.message };
      }}
    />
  );
}
