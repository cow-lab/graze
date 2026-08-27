import { prisma } from "@/lib/prisma";

// 24-48h is the requested window; 36h splits the difference so a daily scheduled run
// almost always hits cache, while a query that's gone stale over a couple of days
// still gets refreshed.
const CACHE_TTL_MS = 36 * 60 * 60 * 1000;

function queryKeyFor(keywords: string[], limit: number): string {
  return `${keywords.slice(0, 3).join(" ").toLowerCase()}::${limit}`;
}

// Read-through cache for one source's search call. Re-running ingestion for the same
// Field (same keywords) within the TTL reuses the stored result set instead of hitting
// Crossref/OpenAlex/Semantic Scholar again — these are Combine's highest-volume calls,
// so this is the main cost lever, not a micro-optimization.
export async function withApiCache<T>(
  source: string,
  keywords: string[],
  limit: number,
  fetcher: () => Promise<T[]>,
): Promise<T[]> {
  const queryKey = queryKeyFor(keywords, limit);

  const cached = await prisma.apiResponseCache.findUnique({
    where: { source_queryKey: { source, queryKey } },
  });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    try {
      return JSON.parse(cached.responseJson) as T[];
    } catch {
      // Fall through to a live fetch if the cached JSON is somehow malformed.
    }
  }

  const results = await fetcher();

  await prisma.apiResponseCache.upsert({
    where: { source_queryKey: { source, queryKey } },
    update: { responseJson: JSON.stringify(results), fetchedAt: new Date() },
    create: { source, queryKey, responseJson: JSON.stringify(results) },
  });

  return results;
}
