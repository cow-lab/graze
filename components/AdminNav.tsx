import Link from "next/link";

// Shared footer nav for every /admin/* page — kept in one place so the set and order of
// links (and the styling) can't drift between pages.
export default function AdminNav() {
  return (
    <p className="bg-panel/95 border border-border-strong rounded-lg px-4 py-2.5 shadow-sm text-xs text-fg-muted mt-8">
      <Link href="/admin/fields" className="text-moss hover:underline">
        Field administration
      </Link>{" "}
      ·{" "}
      <Link href="/admin/queue" className="text-moss hover:underline">
        Moderation queue
      </Link>{" "}
      ·{" "}
      <Link href="/admin/duplicates" className="text-moss hover:underline">
        Possible duplicates
      </Link>{" "}
      ·{" "}
      <Link href="/admin/credibility" className="text-moss hover:underline">
        Credibility
      </Link>
      <Link href="/admin/errors" className="text-moss hover:underline">
        Errors &amp; usage
      </Link>{" "}
      ·{" "}
      <Link href="/" className="text-moss hover:underline">
        Back to feed
      </Link>
    </p>
  );
}
