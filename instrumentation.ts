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

  const { runCombine } = await import("@/lib/combine/run");

  setInterval(() => {
    runCombine().catch((err) => {
      console.error("The Combine: scheduled run failed", err);
    });
  }, DAILY_MS);
}
