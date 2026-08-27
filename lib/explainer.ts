import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const ExplainerSchema = z.object({
  summary: z.string(),
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

const SYSTEM_PROMPT = `You turn academic research papers into a plain-language explainer for a general technical audience (students, practitioners, non-specialists). Given a paper's title, authors, field, and abstract, produce:

1. A plain-language summary (2-4 sentences, no jargon) describing what the paper does, how, and why it matters.
2. A glossary of 2-4 key terms used in the summary, each with a one-line definition a newcomer could understand.
3. A 2-3 question multiple-choice comprehension check. Questions must test understanding of the core idea of the paper (what it solves and why it matters) — never trivia like author names or publication year. Each question needs 3-5 options with exactly one correct answer.`;

type ExplainerInput = {
  title: string;
  authors: string;
  field: string;
  abstract: string;
};

function placeholderExplainer(input: ExplainerInput): Explainer {
  return {
    summary: `"${input.title}" is a ${input.field} paper by ${input.authors}. This is a placeholder explainer shown because no ANTHROPIC_API_KEY is configured — set one to generate a real plain-language summary, glossary, and comprehension check for this paper from its abstract.`,
    terms: [
      {
        term: "Demo mode",
        definition:
          "The app is running without a Claude API key, so explainers are generated as placeholders instead of from the actual abstract.",
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
          "No ANTHROPIC_API_KEY is set, so a placeholder explainer was used",
          "The paper has no abstract",
          "The quiz feature is disabled for this board",
          "The paper was rejected",
        ],
        correctIndex: 0,
      },
      {
        question: "What should a site operator do to enable real explainers?",
        options: [
          "Set the ANTHROPIC_API_KEY environment variable",
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
    return { explainer: placeholderExplainer(input), isDemo: true, usage: ZERO_USAGE };
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
      return { explainer: placeholderExplainer(input), isDemo: true, usage };
    }

    return { explainer: response.parsed_output, isDemo: false, usage };
  } catch (err) {
    console.error("Explainer generation failed, falling back to demo mode:", err);
    return { explainer: placeholderExplainer(input), isDemo: true, usage: ZERO_USAGE };
  }
}
