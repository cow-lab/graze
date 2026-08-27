// The real spam defense for Fields: a Field starts PROVISIONAL and only reaches the main
// sidebar once posts from this many distinct users land in it. A spam Field just never
// crosses this bar. Split into its own file (not lib/actions/fields.ts) because "use server"
// files may only export async functions — a plain constant export there breaks the module.
export const PROMOTION_DISTINCT_AUTHOR_THRESHOLD = 3;
