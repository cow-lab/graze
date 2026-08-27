"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown } from "lucide-react";
import { voteOnComment } from "@/lib/actions/comments";
import type { VoteValue } from "@prisma/client";

export default function CommentVoteButtons({
  commentId,
  postId,
  score,
  userVote,
  isLoggedIn,
}: {
  commentId: string;
  postId: string;
  score: number;
  userVote: VoteValue | null;
  isLoggedIn: boolean;
}) {
  const [optimisticScore, setOptimisticScore] = useState(score);
  const [optimisticVote, setOptimisticVote] = useState<VoteValue | null>(userVote);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function handleVote(value: VoteValue) {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    const prevVote = optimisticVote;
    let delta = 0;
    if (prevVote === value) delta = value === "UP" ? -1 : 1;
    else if (prevVote === null) delta = value === "UP" ? 1 : -1;
    else delta = value === "UP" ? 2 : -2;

    setOptimisticScore(optimisticScore + delta);
    setOptimisticVote(prevVote === value ? null : value);

    startTransition(async () => {
      await voteOnComment(commentId, postId, value);
    });
  }

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs">
      <button
        type="button"
        onClick={() => handleVote("UP")}
        aria-label="Upvote"
        className={`leading-none transition-colors ${
          optimisticVote === "UP" ? "text-moss" : "text-fg-muted hover:text-moss"
        }`}
      >
<ArrowUp size={13} />
      </button>
      <span
        className={`tabular-nums ${
          optimisticVote === "UP"
            ? "text-moss"
            : optimisticVote === "DOWN"
              ? "text-rose"
              : "text-fg-muted"
        }`}
      >
        {optimisticScore}
      </span>
      <button
        type="button"
        onClick={() => handleVote("DOWN")}
        aria-label="Downvote"
        className={`leading-none transition-colors ${
          optimisticVote === "DOWN" ? "text-rose" : "text-fg-muted hover:text-rose"
        }`}
      >
<ArrowDown size={13} />
      </button>
    </div>
  );
}
