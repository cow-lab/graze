import { syncPredatoryList } from "@/lib/credibility/predatorySync";
import { captureError } from "@/lib/errorReporting";

// The predatory-list sync, on a schedule.
//
// Same authorisation shape as the Combine's cron route: without the bearer check, an
// anonymous caller could force repeated fetches and a full re-flagging pass at will — and
// this one decides which journals get suppressed from search, so it matters more.
//
// Weekly rather than daily. The list is maintained by hand and changes slowly, and every
// run re-checks DOAJ and MEDLINE for the journals a match would otherwise suppress; there
// is nothing to gain from hammering it.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "CRON_SECRET is not set, so scheduled runs are disabled." },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const outcome = await syncPredatoryList();
    // A refusal is a successful HTTP response carrying a failed outcome: the rails did
    // their job, nothing was written, and the scheduler shouldn't retry into the same wall.
    // It is recorded either way and shows up in /admin/credibility.
    return Response.json(outcome, { status: 200 });
  } catch (error) {
    captureError({ error, source: "server", path: "/api/cron/predatory-list" });
    return Response.json({ ok: false, error: "Sync failed." }, { status: 500 });
  }
}
