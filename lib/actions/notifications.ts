"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/actions/auth";
import { captureError } from "@/lib/errorReporting";

// Fired by opening the notification list. Failing to mark things read shouldn't interrupt
// reading them, so this reports and moves on.
export async function markNotificationsRead() {
  try {
    const userId = await requireUserId();
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/", "layout");
  } catch (error) {
    captureError({ error, source: "server" });
  }
}
