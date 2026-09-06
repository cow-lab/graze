"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOW_BANDWIDTH_COOKIE } from "@/lib/lowBandwidth";
import { recordMetric } from "@/lib/metrics";
import { captureError } from "@/lib/errorReporting";

export async function setLowBandwidth(
  enabled: boolean,
  opts: { viaSuggestion?: boolean } = {},
) {
  try {
    await applyLowBandwidth(enabled, opts);
  } catch (error) {
    // A preference toggle failing is not worth an error screen; the page simply stays as
    // it was.
    captureError({ error, source: "server" });
  }
}

async function applyLowBandwidth(enabled: boolean, opts: { viaSuggestion?: boolean }) {
  const store = await cookies();
  store.set(LOW_BANDWIDTH_COOKIE, enabled ? "1" : "0", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  recordMetric(enabled ? "lowbandwidth.enabled" : "lowbandwidth.disabled");
  // Separated so it's possible to tell whether the auto-detection is pulling its weight
  // or whether people find the toggle on their own.
  if (opts.viaSuggestion) recordMetric("lowbandwidth.auto_suggested");

  // The layout renders differently under this flag, so every cached route is stale.
  revalidatePath("/", "layout");
}
