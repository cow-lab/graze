"use server";

import { recordMetric } from "@/lib/metrics";
import { captureError } from "@/lib/errorReporting";

// Client-side accessibility events need a server hop to be counted anywhere an operator
// would actually see them — a console.log in the browser only reaches the person who
// triggered it.
export async function logListen() {
  try {
    recordMetric("chew.listen");
  } catch (error) {
    captureError({ error, source: "server" });
  }
}

// Opening the explainer on a paper already in the curated library. The live-search side is
// counted server-side in lib/actions/explain.ts; this is the other half of that split.
export async function logChewCurated() {
  try {
    recordMetric("chew.curated");
  } catch (error) {
    captureError({ error, source: "server" });
  }
}
