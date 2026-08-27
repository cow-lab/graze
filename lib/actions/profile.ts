"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAutoVerifiedEmail } from "@/lib/verification";

export async function addAffiliation(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const institution = String(formData.get("institution") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!title) return "Role/title is required.";
  if (!institution) return "Institution is required.";
  if (!email || !email.includes("@")) return "A valid email is required.";

  await prisma.affiliation.create({
    data: {
      userId: session.user.id,
      title,
      institution,
      email,
      // Domain-heuristic verification, same check used for account signup — no SMTP
      // provider is configured, so there's no live email round-trip to confirm against.
      verified: isAutoVerifiedEmail(email),
    },
  });

  revalidatePath(`/profile/${session.user.id}`);
}

export async function removeAffiliation(affiliationId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.affiliation.deleteMany({
    where: { id: affiliationId, userId: session.user.id },
  });

  revalidatePath(`/profile/${session.user.id}`);
}

export async function updateContactLinks(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const fields = ["websiteUrl", "linkedinUrl", "googleScholarUrl", "githubUrl"] as const;
  const data: Record<(typeof fields)[number], string | null> = {
    websiteUrl: null,
    linkedinUrl: null,
    googleScholarUrl: null,
    githubUrl: null,
  };

  for (const field of fields) {
    const raw = String(formData.get(field) ?? "").trim();
    if (!raw) continue;
    if (!/^https?:\/\//i.test(raw)) return "Links must start with http:// or https://.";
    data[field] = raw;
  }

  await prisma.user.update({ where: { id: session.user.id }, data });
  revalidatePath(`/profile/${session.user.id}`);
}
