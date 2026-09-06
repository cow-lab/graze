"use client";

import { useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { recordSourceClick, type PaperRef } from "@/lib/actions/engagement";
import { hasChewed } from "@/lib/chewSession";

// Every link that leaves Graze for the original paper goes through here. Click-through to
// the source is the metric the product is judged on, so it's recorded at the click itself
// rather than inferred from something adjacent.
export default function SourceLink({
  href,
  paper,
  children,
  className,
  showIcon = true,
}: {
  href: string;
  paper: PaperRef;
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
}) {
  const [, startTransition] = useTransition();

  function handleClick() {
    // Not awaited and not blocking: the link opens in a new tab regardless, and a slow
    // write must never sit between someone and the paper they asked for.
    const afterChew = hasChewed(paper.postId ?? paper.doi ?? null);
    startTransition(async () => {
      await recordSourceClick(paper, afterChew);
    });
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={className}
    >
      {children}
      {showIcon && <ExternalLink size={11} aria-hidden="true" />}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
