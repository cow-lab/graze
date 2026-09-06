// Scopus and Web of Science: the two indexes people actually mean by "is this journal
// indexed", and the two we cannot check for free.
//
// Both adapters are wired end to end — they read a key from the environment, and the
// assessment already treats their answers as first-class. Neither ships with a key, so both
// return null ("not checked") today, which is deliberately different from false.
//
// What each would need:
//
//   Scopus         ELSEVIER_API_KEY. Free to register at dev.elsevier.com, but the Serial
//                  Title API is entitlement-gated: a plain key works from an institutional
//                  IP range or with an institutional token, and returns 401 elsewhere. The
//                  request below is the correct one; it starts working when the key does.
//
//   Web of Science CLARIVATE_API_KEY. The WoS Starter API has a free tier for researchers
//                  (application + agreement, rate-limited). The endpoint shape differs by
//                  tier, so this one is left explicitly unimplemented rather than guessed
//                  at — a wrong request that 404s is worse than an honest null.
//
// A third option, if neither key is obtainable: both indexes publish their journal master
// lists as downloadable spreadsheets. Importing those into JournalCredibility on a
// quarterly cadence would give the same signal with no API access at all.

import { fetchWithBackoff } from "@/lib/combine/fetchWithBackoff";

export async function isIndexedInScopus(issn: string): Promise<boolean | null> {
  const key = process.env.ELSEVIER_API_KEY;
  if (!key) return null;

  try {
    const res = await fetchWithBackoff(
      `https://api.elsevier.com/content/serial/title?issn=${encodeURIComponent(issn)}`,
      { headers: { "X-ELS-APIKey": key, Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      "serial-metadata-response"?: { entry?: unknown[] };
    };
    const entries = data["serial-metadata-response"]?.entry ?? [];
    return entries.length > 0;
  } catch (err) {
    console.error(`[credibility] Scopus lookup failed for ${issn}`, err);
    return null;
  }
}

export async function isIndexedInWebOfScience(issn: string): Promise<boolean | null> {
  if (!process.env.CLARIVATE_API_KEY) return null;
  // Intentionally unimplemented until there's a key to test against — see above.
  console.warn(
    `[credibility] CLARIVATE_API_KEY is set but the Web of Science adapter is not implemented; ${issn} left unchecked.`,
  );
  return null;
}
