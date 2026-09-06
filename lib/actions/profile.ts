"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Institutional affiliations were part of an earlier company-marketplace concept and were
// dropped from the data model (see README) — these two actions are kept only so the
// now-unused AddAffiliationForm/AffiliationsList components still type-check; there is no
// Affiliation table to read or write any more.
export async function addAffiliation(
  _prevState: string | undefined,
  _formData: FormData,
): Promise<string | undefined> {
  return "Affiliations are no longer supported.";
}

export async function removeAffiliation(_affiliationId: string) {
  return;
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
