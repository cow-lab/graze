import { cookies } from "next/headers";

export const LOW_BANDWIDTH_COOKIE = "graze_low_bandwidth";

// Stored in a cookie rather than localStorage specifically so the *server* can read it.
// The point of this mode is that the illustrated background is never rendered into the
// HTML at all — a client-side preference could only hide it after it had already been
// sent and parsed, which saves nothing on a bad connection.
export async function isLowBandwidth(): Promise<boolean> {
  const store = await cookies();
  return store.get(LOW_BANDWIDTH_COOKIE)?.value === "1";
}
