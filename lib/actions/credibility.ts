"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/session";
import { syncPredatoryList } from "@/lib/credibility/predatorySync";
import { guard, type ActionResult } from "@/lib/actions/result";

// Operator controls for the predatory-list flags.
//
// The sync is automated, but a name-based list will get things wrong in both directions,
// and a wrong hard flag hides real research. These are the manual overrides: confirm a
// disputed match, clear one that's mistaken, or re-run the sync by hand.

export async function runPredatoryListSync(force: boolean): Promise<ActionResult<string>> {
  return guard("Couldn't run the sync just now.", async () => {
    await requireAdminUser();
    const outcome = await syncPredatoryList({ force });
    revalidatePath("/admin/credibility");
    return outcome.message;
  });
}

/** Promote a held match to a confirmed one — the journal's results get suppressed. */
export async function confirmPredatoryFlag(issn: string): Promise<ActionResult<null>> {
  return guard("Couldn't update that flag.", async () => {
    const admin = await requireAdminUser();
    await prisma.journalFlag.updateMany({
      where: { issn, kind: "PREDATORY_LIST" },
      data: {
        severity: "EXCLUDE",
        note: `Confirmed by an operator review on ${new Date().toISOString().slice(0, 10)} (${admin.name}). The automated match was held because sources disagreed; a person has since looked at it.`,
      },
    });
    revalidatePath("/admin/credibility");
    return null;
  });
}

/**
 * Clear a match entirely.
 *
 * Recorded as an OPERATOR_NOTE rather than simply deleted, so the next sync doesn't
 * silently re-apply the same flag and so there's a record of the decision. The note carries
 * no severity weight in classify() beyond withholding VERIFIED.
 */
export async function dismissPredatoryFlag(issn: string, reason: string): Promise<ActionResult<null>> {
  return guard("Couldn't clear that flag.", async () => {
    const admin = await requireAdminUser();
    const trimmed = reason.trim();
    if (trimmed.length < 4) return Promise.reject(new Error("Give a short reason."));

    await prisma.$transaction([
      prisma.journalFlag.deleteMany({ where: { issn, kind: "PREDATORY_LIST" } }),
      prisma.journalFlag.upsert({
        where: { issn_source_kind: { issn, source: "Operator review", kind: "OPERATOR_NOTE" } },
        update: { note: trimmed, severity: "CAUTION" },
        create: {
          issn,
          kind: "OPERATOR_NOTE",
          severity: "CAUTION",
          source: "Operator review",
          note: `Predatory-list match dismissed by ${admin.name}: ${trimmed}`,
        },
      }),
    ]);
    revalidatePath("/admin/credibility");
    return null;
  });
}
