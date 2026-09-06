import Link from "next/link";

// A paper's Fields, plural. Rendered the same way everywhere a paper appears, so the shift
// from one Field to several didn't turn into four slightly different lists.
export default function FieldChips({
  fields,
  className = "",
}: {
  fields: { board: { slug: string; name: string } }[];
  className?: string;
}) {
  if (fields.length === 0) return null;

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 ${className}`}>
      {fields.map(({ board }) => (
        <Link
          key={board.slug}
          href={`/?board=${board.slug}`}
          title={board.name}
          className="font-mono text-[10px] uppercase tracking-wide text-fg-muted transition-colors hover:text-fg"
        >
          F~{board.slug}
        </Link>
      ))}
    </span>
  );
}
