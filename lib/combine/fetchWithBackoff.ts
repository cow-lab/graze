// Every external API The Combine touches (Crossref, OpenAlex, Semantic Scholar, PubMed,
// DOAJ) can rate-limit or hiccup under load — Semantic Scholar's free tier in particular
// returns 429s routinely. Retrying with exponential backoff instead of failing (or hammering
// the same endpoint immediately) is what keeps one flaky response from dropping a whole
// Field's results, without turning a transient blip into a request storm.
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithBackoff(url: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, init);
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === MAX_RETRIES) return res;
      await sleep(BASE_DELAY_MS * 2 ** attempt);
    } catch (err) {
      lastError = err;
      if (attempt === MAX_RETRIES) throw lastError;
      await sleep(BASE_DELAY_MS * 2 ** attempt);
    }
  }

  // Unreachable — the loop always returns or throws on the final attempt.
  throw lastError;
}
