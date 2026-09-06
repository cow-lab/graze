"use server";

import { captureError } from "@/lib/errorReporting";

// Client-side errors have to be relayed to the server to be visible anywhere an operator
// would look — a console error only reaches the person who hit it.
export async function reportClientError(input: {
  message: string;
  stack?: string;
  path?: string;
  digest?: string;
}) {
  const error = new Error(input.message);
  if (input.stack) error.stack = input.stack;
  captureError({
    error,
    source: "client",
    path: input.path ?? null,
    digest: input.digest ?? null,
  });
}
