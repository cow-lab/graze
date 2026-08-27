import type { PostType } from "@prisma/client";

const STYLES: Record<PostType, string> = {
  RESEARCH: "bg-teal/15 text-teal border-teal/30",
  POST: "bg-rose/15 text-rose border-rose/30",
};

const LABELS: Record<PostType, string> = {
  RESEARCH: "Research",
  POST: "Post",
};

export default function TypeBadge({ type }: { type: PostType }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded border font-mono text-[10px] uppercase tracking-wide ${STYLES[type]}`}
    >
      {LABELS[type]}
    </span>
  );
}
