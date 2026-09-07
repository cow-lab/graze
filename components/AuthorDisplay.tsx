import CowAvatar from "@/components/CowAvatar";

// Renders wherever an author's name shows — post cards, comments, post detail. Handles
// the anonymous case itself so callers never have to branch on it: pass the real author
// plus the post/comment's own `isAnonymous` flag, and this decides what's actually shown.
//
// Names are never links: profile pages are private now (see app/profile/[id]/page.tsx),
// visible only to the account owner, so a link on someone else's name would just 404 —
// and a link on your own would only be worth it from your own post, which the header's
// own profile link already covers.
export default function AuthorDisplay({
  name,
  isAnonymous,
  cowNumber,
}: {
  userId: string;
  name: string;
  isAnonymous: boolean;
  cowNumber: number | null;
}) {
  if (isAnonymous) {
    return (
      <span className="inline-flex items-center gap-1 text-fg-muted">
        <CowAvatar size={13} />
        Cow #{cowNumber ?? "????"}
      </span>
    );
  }

  return <span className="inline-flex items-center">{name}</span>;
}
