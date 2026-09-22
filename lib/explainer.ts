import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const ExplainerSchema = z.object({
  // The cheapest tier: what someone scanning a feed reads without clicking anything.
  tldr: z.string(),
  summary: z.string(),
  // Deliberately separate from the summary. The summary says what the paper is about; these
  // say what it actually found — the part a reader needs in order to disagree with it.
  keyFindings: z.array(z.string()).min(2).max(3),
  terms: z
    .array(z.object({ term: z.string(), definition: z.string() }))
    .min(2)
    .max(4),
  quiz: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).min(3).max(5),
        correctIndex: z.number().int().min(0),
      }),
    )
    .min(2)
    .max(3),
});

export type Explainer = z.infer<typeof ExplainerSchema>;

const SYSTEM_PROMPT = `You turn academic research papers into a plain-language explainer for a general technical audience (students, practitioners, non-specialists). Given a paper's title, authors, field, and abstract, produce five things at increasing depth:

1. A TL;DR: ONE sentence, at most 25 words, in plain language. This is read by someone scanning a list who will not click anything, so it must carry the point of the paper on its own. No hedging, no "this paper investigates" throat-clearing — say what it found or argues.
2. A plain-language summary (2-4 sentences, no jargon) describing what the paper does, how, and why it matters.
3. 2-3 key findings, one short sentence each. These must be distinct from the summary: the summary says what the paper is ABOUT, the findings say what it actually FOUND, claims, or measured — the specific results a reader would need in order to agree or disagree with it. Include numbers from the abstract where there are any. If the abstract genuinely reports no findings (a review or position paper), state the paper's central claims instead.
4. A glossary of 2-4 key terms used in the summary, each with a one-line definition a newcomer could understand.
5. A 2-3 question multiple-choice comprehension check. Questions must test understanding of the core idea of the paper (what it solves and why it matters) — never trivia like author names or publication year. Each question needs 3-5 options with exactly one correct answer.

Everything you write is read by people deciding whether to go and read the real paper. Never overstate a finding's certainty beyond what the abstract supports.`;

type ExplainerInput = {
  title: string;
  authors: string;
  field: string;
  abstract: string;
};

/**
 * Why we're showing a placeholder. The message used to say "no ANTHROPIC_API_KEY is
 * configured" for every case, including a key that was set and working but out of credits —
 * which sent a real debugging session chasing environment variables for an hour when the
 * answer was a billing page. Whatever the operator sees here should be the actual cause.
 */
type DemoReason = "no-key" | "api-error" | "bad-output";

const REASON_TEXT: Record<DemoReason, string> = {
  "no-key": "no ANTHROPIC_API_KEY is configured",
  "api-error":
    "the Claude API call failed — check the server logs for the reason, which is often billing credits rather than the key itself",
  "bad-output": "the model's response didn't match the expected format",
};

function placeholderExplainer(input: ExplainerInput, reason: DemoReason = "no-key"): Explainer {
  const why = REASON_TEXT[reason];
  return {
    tldr: `Placeholder explainer for "${input.title}" — ${why}.`,
    keyFindings: [
      `This is demo mode — ${why} — so nothing here was read from the paper's abstract.`,
      "Real explainers resume automatically once that's resolved; nothing needs redeploying.",
    ],
    summary: `"${input.title}" is a ${input.field} paper by ${input.authors}. This is a placeholder explainer shown because ${why} — resolve that to generate a real plain-language summary, glossary, and comprehension check for this paper from its abstract.`,
    terms: [
      {
        term: "Demo mode",
        definition:
          `The app can't reach Claude right now (${why}), so explainers are placeholders instead of being written from the actual abstract.`,
      },
      {
        term: input.field || "Field",
        definition: "The research area this paper belongs to, as tagged by its author at submission.",
      },
    ],
    quiz: [
      {
        question: "Why is this comprehension check generic instead of specific to the paper?",
        options: [
          "Claude couldn't be reached, so a placeholder explainer was used",
          "The paper has no abstract",
          "The quiz feature is disabled for this board",
          "The paper was rejected",
        ],
        correctIndex: 0,
      },
      {
        question: "What should a site operator do to enable real explainers?",
        options: [
          "Check the server logs for the cause — a missing key, or an API error such as exhausted credits",
          "Delete the paper and resubmit",
          "Nothing, this is expected behavior",
          "Contact the paper's authors",
        ],
        correctIndex: 0,
      },
    ],
  };
}

export type TokenUsage = { inputTokens: number; outputTokens: number };

const ZERO_USAGE: TokenUsage = { inputTokens: 0, outputTokens: 0 };

export async function generateExplainer(
  input: ExplainerInput,
): Promise<{ explainer: Explainer; isDemo: boolean; usage: TokenUsage }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return { explainer: placeholderExplainer(input, "no-key"), isDemo: true, usage: ZERO_USAGE };
  }

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Title: ${input.title}\nAuthors: ${input.authors}\nField: ${input.field}\n\nAbstract:\n${input.abstract}`,
        },
      ],
      output_config: {
        format: zodOutputFormat(ExplainerSchema),
      },
    });

    const usage: TokenUsage = {
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    };

    if (!response.parsed_output) {
      console.error("Explainer generation: model output failed schema validation");
      return { explainer: placeholderExplainer(input, "bad-output"), isDemo: true, usage };
    }

    return { explainer: response.parsed_output, isDemo: false, usage };
  } catch (err) {
    // Logged in full: the API's own message names the cause (credit balance, rate limit,
    // invalid key), and that is the thing an operator actually needs to see.
    console.error("Explainer generation failed, falling back to demo mode:", err);
    return { explainer: placeholderExplainer(input, "api-error"), isDemo: true, usage: ZERO_USAGE };
  }
}

// Stored as JSON text (SQLite has no array column). A row written before tiering existed
// has null here, which reads as "no findings to show" rather than breaking the panel.
export function parseKeyFindings(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((f): f is string => typeof f === "string") : [];
  } catch {
    return [];
  }
}

