import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  name: string;
  role: "USER" | "ADMIN";
};

// The signed-in user as the database actually has it right now.
//
// A JWT session stays cryptographically valid even after its user row is gone — most
// commonly because the dev database was reset while a browser still held a cookie. So
// `auth()` on its own can hand back a session pointing at a user that no longer exists.
// Reading pages that trust it end up rendering "signed in" chrome linking to a profile
// that 404s, and admin pages bounce you to the feed with no explanation. Anything that
// renders signed-in UI should resolve the user through here instead.
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, role: true },
  });

  return user ?? null;
}

// Page-level admin guard. Distinguishes the two failure modes that previously looked
// identical: a stale session (send them to log in again) versus a real, current user who
// simply isn't an admin (send them home).
export async function requireAdminUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
