import { prisma } from "@/lib/prisma";

// Lazily assigns a random 4-digit "Cow #XXXX" number the first time a user posts
// anonymously, then reuses it forever after — so their anonymous activity reads as one
// consistent identity without ever being traceable back to their real account.
export async function getOrAssignCowNumber(userId: string): Promise<number> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.cowNumber !== null) return user.cowNumber;

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = 1000 + Math.floor(Math.random() * 9000);
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { cowNumber: candidate },
      });
      return updated.cowNumber!;
    } catch {
      // Unique constraint collision — another user already has this number. Retry.
    }
  }

  throw new Error("Could not assign a unique cow number after 20 attempts");
}
