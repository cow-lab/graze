import { prisma } from "@/lib/prisma";

export type Engagement = { readSource: boolean; passedCheck: boolean };

// Who, among everyone who commented on this paper, actually went and did the work —
// followed the link out to the source, or answered the comprehension check correctly.
// One query per post, returned as a map so the comment tree can ask per author in O(1).
export async function getPostEngagement(postId: string): Promise<Map<string, Engagement>> {
  const rows = await prisma.paperEngagement.findMany({
    where: { postId },
    select: { userId: true, kind: true },
  });

  const map = new Map<string, Engagement>();
  for (const row of rows) {
    const current = map.get(row.userId) ?? { readSource: false, passedCheck: false };
    if (row.kind === "SOURCE_CLICK") current.readSource = true;
    if (row.kind === "COMPREHENSION_PASS") current.passedCheck = true;
    map.set(row.userId, current);
  }
  return map;
}

// What did this viewer already do with this paper — used to keep the page honest about
// its own prompts (no "go read the source" nudge at someone who just did).
export async function getViewerEngagement(
  userId: string | undefined,
  postId: string,
): Promise<Engagement> {
  if (!userId) return { readSource: false, passedCheck: false };
  const rows = await prisma.paperEngagement.findMany({
    where: { userId, postId },
    select: { kind: true },
  });
  return {
    readSource: rows.some((r) => r.kind === "SOURCE_CLICK"),
    passedCheck: rows.some((r) => r.kind === "COMPREHENSION_PASS"),
  };
}
