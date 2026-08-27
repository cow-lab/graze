import { prisma } from "@/lib/prisma";
import { fetchWithBackoff } from "@/lib/combine/fetchWithBackoff";

// The validity filter: an article is only eligible for import if its journal's ISSN
// is on the DOAJ (Directory of Open Access Journals) allowlist — a maintained registry
// of vetted, peer-reviewed open-access journals. No ISSN, no verification, no import.
export async function isJournalAllowlisted(params: {
  issn: string | null;
  journal: string | null;
}): Promise<boolean> {
  if (!params.issn) return false;

  const cached = await prisma.allowlistJournal.findUnique({ where: { issn: params.issn } });
  if (cached) return true;

  try {
    const url = `https://doaj.org/api/search/journals/issn%3A${encodeURIComponent(params.issn)}`;
    const res = await fetchWithBackoff(url);
    if (!res.ok) return false;
    const data = (await res.json()) as {
      total?: number;
      results?: { bibjson: { title?: string; publisher?: { name?: string } | string; eissn?: string; pissn?: string } }[];
    };

    const match = data.results?.[0];
    if (!match || (data.total ?? 0) === 0) return false;

    const publisherName =
      typeof match.bibjson.publisher === "string"
        ? match.bibjson.publisher
        : match.bibjson.publisher?.name;

    // Write-through cache so repeat lookups (and future runs) skip the network call.
    // Upsert (not create) since two candidates from the same journal in one run could
    // both reach this point before either has written the cache row.
    await prisma.allowlistJournal.upsert({
      where: { issn: params.issn },
      update: {},
      create: {
        issn: params.issn,
        name: match.bibjson.title ?? params.journal ?? "Unknown journal",
        publisher: publisherName ?? null,
        source: "DOAJ",
      },
    });

    return true;
  } catch (err) {
    console.error("Combine: DOAJ allowlist check failed", err);
    return false;
  }
}
