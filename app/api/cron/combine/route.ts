import { runCombine } from "@/lib/combine/run";
import { captureError } from "@/lib/errorReporting";

// The Combine's scheduled run, as an endpoint a scheduler can call.
//
// The setInterval in instrumentation.ts works for one long-running node process and does
// nothing useful on a serverless host: instances are created per request and torn down, so
// a daily timer set inside one almost never survives to fire. Without this route, ingestion
// on Vercel would simply never happen — and it would fail silently, which is worse.
//
// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. The check is unconditional: an
// unauthenticated caller could otherwise trigger five external APIs and a Claude call per
// Field, on demand, at your expense.

export const dynamic = "force-dynamic";
// The run walks several Fields against four APIs; the default 10s serverless limit is far
// too short. 300s is the Vercel Pro ceiling — on Hobby this is capped at 60s, which is
// usually enough for a couple of Fields per run given the per-run cap.
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
    const summary = await runCombine();
    return Response.json({ ok: true, summary });
  } catch (error) {
    captureError({ error, source: "server", path: "/api/cron/combine" });
    return Response.json({ ok: false, error: "The Combine run failed." }, { status: 500 });
  }
}
