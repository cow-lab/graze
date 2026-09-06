import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const ModerationSchema = z.object({
  isSpam: z.boolean(),
  isDuplicate: z.boolean(),
  duplicateOfSlug: z.string().nullable(),
  reason: z.string().nullable(),
});

export type FieldModerationResult = z.infer<typeof ModerationSchema>;

const SYSTEM_PROMPT = `You screen new "Field" submissions for a research library (Graze) before they're created. A Field is a topic community (e.g. "Robotics", "Climate"). You are given the proposed Field's name and description, plus a list of existing Fields (slug + name + description).

This is a fast, synchronous, inline check — not a full moderation review. Only flag things a reasonable person would flag instantly:
- isDuplicate: true only if the new Field clearly overlaps an EXISTING one in subject matter (e.g. "AI" when "Artificial Intelligence" already exists, or "Climate Change" when "Climate" already exists). Different, more specific, or adjacent topics are NOT duplicates — err toward allowing legitimate niche topics through. If true, set duplicateOfSlug to that existing Field's slug.
- isSpam: true only for clear spam/gibberish/abuse — random characters, promotional/ad content unrelated to a topic community, or a name+description with no real topical meaning. A short or informally-written but genuine topic is NOT spam.
- reason: one short sentence explaining the flag, or null if neither flag is set.

Default to allowing Fields through. This exists to catch obvious junk, not to gatekeep genuine niche topics.`;

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function wordSet(text: string): Set<string> {
  return new Set(normalize(text).split(" ").filter((w) => w.length > 2));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) if (b.has(word)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Heuristic fallback used when no ANTHROPIC_API_KEY is configured, so Field creation still
// works (with a real, if cruder, check) in demo mode — same pattern as lib/explainer.ts.
function heuristicModeration(
  name: string,
  description: string,
  existingFields: { slug: string; name: string; description: string }[],
): FieldModerationResult {
  const nameWords = wordSet(name);
  const descWords = wordSet(description);

  // Spam/gibberish: no real word-like tokens, or heavy character repetition (e.g. "aaaaaa").
  const hasRepeatedChars = /(.)\1{4,}/.test(name) || /(.)\1{4,}/.test(description);
  const tooFewRealWords = descWords.size < 2 && nameWords.size < 1;
  if (hasRepeatedChars || tooFewRealWords) {
    return {
      isSpam: true,
      isDuplicate: false,
      duplicateOfSlug: null,
      reason: "Doesn't look like a real topic name/description (demo-mode heuristic check).",
    };
  }

  // Duplicate: high word overlap with an existing Field's name+description.
  let best: { slug: string; score: number } | null = null;
  for (const field of existingFields) {
    const existingWords = new Set([...wordSet(field.name), ...wordSet(field.description)]);
    const combinedNew = new Set([...nameWords, ...descWords]);
    const score = jaccardSimilarity(combinedNew, existingWords);
    if (!best || score > best.score) best = { slug: field.slug, score };
  }
  if (best && best.score > 0.5) {
    return {
      isSpam: false,
      isDuplicate: true,
      duplicateOfSlug: best.slug,
      reason: "Looks like it substantially overlaps an existing Field (demo-mode heuristic check).",
    };
  }

  return { isSpam: false, isDuplicate: false, duplicateOfSlug: null, reason: null };
}

export async function moderateFieldSubmission(params: {
  name: string;
  description: string;
  existingFields: { slug: string; name: string; description: string }[];
}): Promise<FieldModerationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return heuristicModeration(params.name, params.description, params.existingFields);
  }

  try {
    const client = new Anthropic({ apiKey });

    const existingList = params.existingFields
      .map((f) => `- ${f.slug}: "${f.name}" — ${f.description}`)
      .join("\n");

    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Proposed Field:\nName: ${params.name}\nDescription: ${params.description}\n\nExisting Fields:\n${existingList || "(none)"}`,
        },
      ],
      output_config: {
        format: zodOutputFormat(ModerationSchema),
      },
    });

    if (!response.parsed_output) {
      console.error("Field moderation: model output failed schema validation");
      return heuristicModeration(params.name, params.description, params.existingFields);
    }

    return response.parsed_output;
  } catch (err) {
    console.error("Field moderation check failed, falling back to heuristic:", err);
    return heuristicModeration(params.name, params.description, params.existingFields);
  }
}
