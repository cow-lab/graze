import { redirect } from "next/navigation";

// Search isn't a page any more — Discover is the search page. Kept as a redirect so old
// links, bookmarks, and the muscle memory of anyone who used /search still land somewhere
// sensible, with the query and the open-access preference carried across.
export default async function SearchRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; oa?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim();
  const oaRaw = Array.isArray(params.oa) ? params.oa[params.oa.length - 1] : params.oa;

  const search = new URLSearchParams();
  if (query) search.set("q", query);
  if (oaRaw === "0") search.set("oa", "0");
  const qs = search.toString();

  redirect(qs ? `/?${qs}` : "/");
}
