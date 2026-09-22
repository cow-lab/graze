import { prisma } from "../lib/prisma";
import { generateExplainer } from "../lib/explainer";

// Generates a real "Chew on this" explainer for every published paper that doesn't have
// one, using the same path The Combine uses at import (lib/combine/run.ts).
//
// Why this is needed rather than optional: explainStoredPost only *reads* — a library paper
// with no explainer row shows "No explainer has been generated for this paper yet" and never
// generates one on demand. Live search results do generate lazily; library papers don't.
// So after the placeholder rows were cleared, the library needed filling in deliberately.
//
// It costs one Claude call per paper, so it is written to be interruptible and to stop
// rather than burn credits when something is wrong:
//
//   - papers without a usable abstract are skipped, not sent
//   - a pause between calls, to stay well clear of rate limits
//   - three consecutive failures aborts the run
//   - a demo result (no key, API error) counts as a failure and is never written, so a
//     billing problem can't quietly refill the library with placeholders again
//
// Re-runnable: it only looks at papers still missing an explainer, so an interrupted run
// resumes where it stopped.

const DELAY_MS = 1500;
const MAX_CONSECUTIVE_FAILURES = 3;

async function main() {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED", explainer: { is: null } },
    select: { id: true, title: true, authors: true, abstract: true, doi: true, field: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`${posts.length} published papers without an explainer\n`);
  if (posts.length === 0) return;

  let made = 0;
  let skipped = 0;
  let failed = 0;
  let consecutiveFailures = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  for (const [i, post] of posts.entries()) {
    const label = `[${i + 1}/${posts.length}] ${post.title.slice(0, 52)}`;

    const abstract = (post.abstract ?? "").trim();
    if (abstract.length < 40) {
      console.log(`${label} — SKIP (no usable abstract)`);
      skipped++;
      continue;
    }

    try {
      const { explainer, isDemo, usage } = await generateExplainer({
        title: post.title,
        authors: post.authors ?? "Unknown authors",
        field: post.field ?? "Research",
        abstract: abstract.slice(0, 2000),
      });

      if (isDemo) {
        // Never persist a placeholder. That is what put 87 fake explainers in the library
        // the first time: the account was out of API credits, every call fell back to demo,
        // and each one got written as though it were a real summary.
        console.log(`${label} — FAILED (fell back to demo; check credits or the server log)`);
        failed++;
        consecutiveFailures++;
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.log(`\nAborting: ${MAX_CONSECUTIVE_FAILURES} failures in a row. Nothing further was attempted.`);
          break;
        }
        continue;
      }

      await prisma.researchExplainer.create({
        data: {
          postId: post.id,
          doi: post.doi,
          tldr: explainer.tldr,
          summary: explainer.summary,
          keyFindingsJson: JSON.stringify(explainer.keyFindings),
          termsJson: JSON.stringify(explainer.terms),
          quizJson: JSON.stringify(explainer.quiz),
          isDemo: false,
        },
      });

      inputTokens += usage.inputTokens;
      outputTokens += usage.outputTokens;
      made++;
      consecutiveFailures = 0;
      console.log(`${label} — ok`);
    } catch (error) {
      console.log(`${label} — ERROR: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
      consecutiveFailures++;
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.log(`\nAborting: ${MAX_CONSECUTIVE_FAILURES} failures in a row.`);
        break;
      }
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  const remaining = await prisma.post.count({
    where: { status: "PUBLISHED", explainer: { is: null } },
  });

  console.log(
    `\ngenerated ${made}, skipped ${skipped}, failed ${failed}` +
      `\ntokens: ${inputTokens.toLocaleString()} in / ${outputTokens.toLocaleString()} out` +
      `\npublished papers still without an explainer: ${remaining}`,
  );
}

main().finally(() => prisma.$disconnect());
