"use server";

import { prisma } from "@/lib/prisma";
import { generateExplainer } from "@/lib/explainer";
import { truncate } from "@/lib/combine/utils";
import { recordMetric } from "@/lib/metrics";
import { parseKeyFindings } from "@/lib/explainer";
import { captureError } from "@/lib/errorReporting";

export type ExplainerPayload = {
  tldr: string | null;
  keyFindings: string[];
  summary: string;
  terms: { term: string; definition: string }[];
  quiz: { question: string; options: string[]; correctIndex: number }[];
  isDemo: boolean;
};

// Reads the explainer already stored for a library paper. Cards use this so the big "Chew
// on this" button can sit on every row without the feed query dragging summaries, glossaries
// and quizzes along for papers nobody opens.
export async function explainStoredPost(postId: string): Promise<ExplainResult> {
  try {
    const row = await prisma.researchExplainer.findUnique({ where: { postId } });
    if (!row) {
      return {
        status: "error",
        message: "No explainer has been generated for this paper yet.",
      };
    }
    return { status: "ok", explainer: toPayload(row) };
  } catch (error) {
    captureError({ error, source: "server" });
    return {
      status: "error",
      message: "Couldn't load the explainer right now. Try again in a moment.",
    };
  }
}

export type ExplainResult =
  | { status: "ok"; explainer: ExplainerPayload }
  | { status: "error"; message: string };

// Generates (or reuses) a "Chew on this" explainer for a paper that is NOT in the curated
// library — i.e. a live OpenAlex search result the user is looking at right now. Keyed by
// DOI so the Claude call happens at most once per paper across all users, and so that
// promoting the paper into the library later can adopt this row instead of regenerating.
export async function explainLiveResult(input: {
  doi: string | null;
  title: string;
  authors: string;
  venue: string | null;
  abstract: string | null;
}): Promise<ExplainResult> {
  if (!input.abstract || input.abstract.length < 40) {
    return {
      status: "error",
      message: "No abstract is available for this paper, so there's nothing to explain yet.",
    };
  }

  try {
    return await generate({ ...input, abstract: input.abstract });
  } catch (error) {
    // The Claude call, the cache read, or the cache write failed. The panel shows this
    // sentence; the real error goes to the logs and /admin/errors.
    captureError({ error, source: "server" });
    return {
      status: "error",
      message: "Couldn't build an explainer for this paper right now. Try again in a moment.",
    };
  }
}

// The caller has already established there's an abstract worth explaining, which is why
// this one takes a plain string.
async function generate(input: {
  doi: string | null;
  title: string;
  authors: string;
  venue: string | null;
  abstract: string;
}): Promise<ExplainResult> {
  if (input.doi) {
    const cached = await prisma.researchExplainer.findUnique({ where: { doi: input.doi } });
    if (cached) {
      recordMetric("chew.live_cache_hit", { doi: input.doi });
      return { status: "ok", explainer: toPayload(cached) };
    }
  }

  recordMetric("chew.live_generated", { doi: input.doi ?? "(no doi)" });
  const abstract = truncate(input.abstract, 2000);
  const { explainer, isDemo } = await generateExplainer({
    title: input.title,
    authors: input.authors,
    field: input.venue ?? "Research",
    abstract,
  });

  const payload: ExplainerPayload = { ...explainer, isDemo };

  // Only cacheable when there's a DOI to key on, and only when generation actually
  // succeeded. Caching a demo explainer stores a failure permanently: the account ran out
  // of API credits for an afternoon and 87 papers ended up with placeholder text saved
  // against their DOI, still being served long after the credits were topped up. A
  // placeholder is what we show when something is wrong right now — it is not a fact about
  // the paper, so it doesn't belong in a cache keyed on the paper.
  if (input.doi && !isDemo) {
    await prisma.researchExplainer.upsert({
      where: { doi: input.doi },
      update: {},
      create: {
        doi: input.doi,
        tldr: explainer.tldr,
        summary: explainer.summary,
        keyFindingsJson: JSON.stringify(explainer.keyFindings),
        termsJson: JSON.stringify(explainer.terms),
        quizJson: JSON.stringify(explainer.quiz),
        isDemo,
      },
    });
  }

  return { status: "ok", explainer: payload };
}

function toPayload(row: {
  tldr: string | null;
  keyFindingsJson: string | null;
  summary: string;
  termsJson: string;
  quizJson: string;
  isDemo: boolean;
}): ExplainerPayload {
  return {
    tldr: row.tldr,
    keyFindings: parseKeyFindings(row.keyFindingsJson),
    summary: row.summary,
    terms: JSON.parse(row.termsJson),
    quiz: JSON.parse(row.quizJson),
    isDemo: row.isDemo,
  };
}
