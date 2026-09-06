import { captureError } from "@/lib/errorReporting";

// Every server action a person can trigger returns one of these rather than throwing.
// A thrown error in an action either surfaces Next's error screen or, worse, a raw Prisma
// message ("Invalid `prisma.vote.create()` invocation… Unique constraint failed") — neither
// of which means anything to the person who just clicked a button.
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string };

// `redirect()` and `notFound()` are implemented as thrown errors. Catching those would
// break navigation, so they're re-thrown untouched — only real failures are converted.
function isFrameworkControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_");
}

// Wraps an action body: the real error is captured (log + /admin/errors + webhook) and the
// caller gets a sentence written for a person. `userMessage` should say what failed and
// what to do next — "Couldn't save your note. Try again in a moment." — never "Error".
export async function guard<T>(
  userMessage: string,
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (isFrameworkControlFlow(error)) throw error;
    captureError({ error, source: "server" });
    return { ok: false, message: userMessage };
  }
}
