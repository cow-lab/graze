// Deliberately not a dashboard — just enough visibility to answer the one question the
// product is actually judged on: did this get someone to the real paper? Counts live in
// memory (so they reset with the server) and every event also emits a greppable log line,
// which is what survives long enough to be useful.
export type MetricEvent =
  | "search.open_access_only"
  | "search.all_results"
  | "chew.curated"
  | "chew.live_generated"
  | "chew.live_cache_hit"
  | "chew.listen"
  // The headline metric. `source.clickthrough_after_chew` is the specific path this
  // product exists to create — someone read the plain-language summary and then went to
  // the source anyway — as opposed to a click straight off the page.
  | "source.clickthrough"
  | "source.clickthrough_after_chew"
  | "comprehension.passed"
  // Board activity is counted at the point where real effort goes in: writing a note and
  // drawing a connection, not just collecting cards.
  | "board.card_added"
  | "board.note_written"
  | "board.link_created"
  | "lowbandwidth.enabled"
  | "lowbandwidth.disabled"
  | "lowbandwidth.auto_suggested";

// On globalThis for the same reason as the error buffer: server actions and page renders
// can land in different module instances, which would otherwise mean the admin page reads
// an empty counter map while the logs show events being recorded.
const globalForMetrics = globalThis as unknown as { grazeMetrics?: Map<MetricEvent, number> };
const counts: Map<MetricEvent, number> = (globalForMetrics.grazeMetrics ??= new Map());

export function recordMetric(event: MetricEvent, detail?: Record<string, unknown>) {
  const next = (counts.get(event) ?? 0) + 1;
  counts.set(event, next);

  const suffix = detail ? ` ${JSON.stringify(detail)}` : "";
  console.log(`[metric] ${event} count=${next}${suffix}`);
}

export function metricSnapshot(): Record<string, number> {
  return Object.fromEntries(counts);
}
