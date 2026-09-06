// Next.js calls register() once when the server process starts. This is where we wire
// up The Combine's "daily" schedule.
//
// A real deployment would use a proper scheduler — Vercel Cron, a hosted cron service, or
// node-cron — rather than a bare setInterval kept alive by the server process. This is a
// deliberately lightweight stand-in suited to `npm run dev` / a single long-running node
// process: it doesn't fire immediately on boot (so restarting the dev server repeatedly
// doesn't hammer five external APIs), and the admin queue page's "Run The Combine now"
// button is the practical way to trigger and demo a run without waiting a day.
const DAILY_MS = 24 * 60 * 60 * 1000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // On a serverless host this timer is pointless and slightly harmful: each instance would
  // set its own, and almost none live long enough to fire. There, /api/cron/combine driven
  // by Vercel Cron is the scheduler (see vercel.json).
  if (process.env.VERCEL) return;

  const { runCombine } = await import("@/lib/combine/run");

  setInterval(() => {
    runCombine().catch((err) => {
      console.error("The Combine: scheduled run failed", err);
    });
  }, DAILY_MS);
}

// Next.js calls this for every uncaught server-side error (route handlers, server
// components, server actions), which makes it the single reliable capture point — far
// better than remembering to wrap things in try/catch.
export async function onRequestError(
  error: unknown,
  request: { path?: string },
  context: { routePath?: string },
) {
  const { captureError } = await import("@/lib/errorReporting");
  captureError({
    error,
    source: "server",
    path: request.path ?? context.routePath ?? null,
  });
}
