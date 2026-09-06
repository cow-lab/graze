import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { CombineCandidate } from "@/lib/combine/types";
import { slugify } from "@/lib/slug";

// If a topic shows up across at least this many candidates in one run, and doesn't match
// any existing Field, it's worth proposing as a new one.
const MIN_TOPIC_OCCURRENCES = 3;
// Cap suggestions per run so a single noisy run can't spam the provisional list.
const MAX_SUGGESTIONS_PER_RUN = 1;

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenOverlap(a: string, b: string): boolean {
  const aWords = new Set(normalize(a).split(" ").filter((w) => w.length > 3));
  const bWords = new Set(normalize(b).split(" ").filter((w) => w.length > 3));
  for (const w of aWords) if (bWords.has(w)) return true;
  return false;
}

const ProposalSchema = z.object({
  name: z.string(),
  description: z.string(),
  keywords: z.array(z.string()).min(3).max(6),
});

type TokenUsage = { inputTokens: number; outputTokens: number };
const ZERO_USAGE: TokenUsage = { inputTokens: 0, outputTokens: 0 };

function placeholderProposal(topic: string) {
  return {
    name: topic,
    description: `Research related to ${topic}, surfaced automatically because several unmatched papers on this topic showed up in one Combine run.`,
    keywords: [topic],
  };
}

async function draftFieldProposal(topic: string, exampleTitles: string[]) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { proposal: placeholderProposal(topic), isDemo: true, usage: ZERO_USAGE };

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 512,
      system:
        "You draft a proposed new topic Field for a research library, given a topic label and a few example paper titles that fall under it. Produce a short, clear Field name (2-4 words, title case), a one-sentence description of what belongs in this Field, and 3-6 search keywords The Combine can use to keep finding relevant papers for it.",
      messages: [
        {
          role: "user",
          content: `Topic: ${topic}\nExample paper titles:\n${exampleTitles.map((t) => `- ${t}`).join("\n")}`,
        },
      ],
      output_config: { format: zodOutputFormat(ProposalSchema) },
    });
    const usage: TokenUsage = {
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    };
    if (!response.parsed_output) return { proposal: placeholderProposal(topic), isDemo: true, usage };
    return { proposal: response.parsed_output, isDemo: false, usage };
  } catch (err) {
    console.error("Combine: field proposal drafting failed, falling back to placeholder:", err);
    return { proposal: placeholderProposal(topic), isDemo: true, usage: ZERO_USAGE };
  }
}

export type FieldSuggestionSummary = {
  proposed: number;
  fieldNames: string[];
  tokensUsed: TokenUsage;
};

// Looks across everything The Combine found in one run for a topic that keeps recurring
// but doesn't match any existing (non-suspended) Field — if so, proposes a new Field for
// it via Claude (or a placeholder in demo mode). Proposed Fields still land PROVISIONAL,
// same as a user-created one — nothing here publishes straight to the sidebar; a real
// person's traffic (or an admin) still has to make it stick.
export async function suggestFieldsFromRun(
  candidates: CombineCandidate[],
): Promise<FieldSuggestionSummary> {
  const summary: FieldSuggestionSummary = {
    proposed: 0,
    fieldNames: [],
    tokensUsed: { inputTokens: 0, outputTokens: 0 },
  };

  const existingFields = await prisma.board.findMany({
    where: { status: { not: "SUSPENDED" } },
    select: { name: true, description: true, searchKeywordsJson: true },
  });
  const existingText = existingFields.map((f) => {
    let keywords: string[] = [];
    try {
      keywords = JSON.parse(f.searchKeywordsJson);
    } catch {
      keywords = [];
    }
    return `${f.name} ${f.description} ${keywords.join(" ")}`;
  });

  const topicOccurrences = new Map<string, string[]>(); // topic -> example titles
  for (const candidate of candidates) {
    for (const topic of candidate.topics ?? []) {
      const matchesExisting = existingText.some((text) => tokenOverlap(topic, text));
      if (matchesExisting) continue;
      const titles = topicOccurrences.get(topic) ?? [];
      titles.push(candidate.title);
      topicOccurrences.set(topic, titles);
    }
  }

  const unmatchedTopics = [...topicOccurrences.entries()]
    .filter(([, titles]) => titles.length >= MIN_TOPIC_OCCURRENCES)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, MAX_SUGGESTIONS_PER_RUN);

  for (const [topic, titles] of unmatchedTopics) {
    const { proposal, usage } = await draftFieldProposal(topic, titles.slice(0, 3));
    summary.tokensUsed.inputTokens += usage.inputTokens;
    summary.tokensUsed.outputTokens += usage.outputTokens;

    const baseSlug = slugify(proposal.name);
    if (!baseSlug) continue;
    let slug = baseSlug;
    let suffix = 2;
    while (await prisma.board.findUnique({ where: { slug } })) {
      slug = `${baseSlug}${suffix}`;
      suffix += 1;
    }

    await prisma.board.create({
      data: {
        slug,
        name: proposal.name,
        description: proposal.description,
        searchKeywordsJson: JSON.stringify(proposal.keywords),
        status: "PROVISIONAL",
        isAiSuggested: true,
      },
    });

    summary.proposed += 1;
    summary.fieldNames.push(proposal.name);
  }

  return summary;
}
