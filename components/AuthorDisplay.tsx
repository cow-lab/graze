import Link from "next/link";
import CowAvatar from "@/components/CowAvatar";

// Renders wherever an author's name shows — post cards, comments, post detail. Handles
// the anonymous case itself so callers never have to branch on it: pass the real author
// plus the post/comment's own `isAnonymous` flag, and this decides what's actually shown.
export default function AuthorDisplay({
  userId,
  name,
  isAnonymous,
  cowNumber,
  linkToProfile = true,
}: {
  userId: string;
  name: string;
  isAnonymous: boolean;
  cowNumber: number | null;
  linkToProfile?: boolean;
}) {
  if (isAnonymous) {
    return (
      <span className="inline-flex items-center gap-1 text-fg-muted">
        <CowAvatar size={13} />
        Cow #{cowNumber ?? "????"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center">
      {linkToProfile ? (
        <Link href={`/profile/${userId}`} className="hover:text-ink transition-colors">
          {name}
        </Link>
      ) : (
        <span>{name}</span>
      )}
    </span>
  );
}
