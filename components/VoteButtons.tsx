"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sprout, ArrowDown } from "lucide-react";
import { voteOnPost } from "@/lib/actions/posts";
import type { VoteValue } from "@prisma/client";

export default function VoteButtons({
  postId,
  score,
  userVote,
  isLoggedIn,
  orientation = "vertical",
}: {
  postId: string;
  score: number;
  userVote: VoteValue | null;
  isLoggedIn: boolean;
  orientation?: "vertical" | "horizontal";
}) {
  const [optimisticScore, setOptimisticScore] = useState(score);
  const [optimisticVote, setOptimisticVote] = useState<VoteValue | null>(userVote);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleVote(value: VoteValue) {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    const prevVote = optimisticVote;
    const prevScore = optimisticScore;

    let delta = 0;
    if (prevVote === value) delta = value === "UP" ? -1 : 1;
    else if (prevVote === null) delta = value === "UP" ? 1 : -1;
    else delta = value === "UP" ? 2 : -2;

    setOptimisticScore(prevScore + delta);
    setOptimisticVote(prevVote === value ? null : value);

    startTransition(async () => {
      await voteOnPost(postId, value);
    });
  }

  const wrapperClass =
    orientation === "vertical" ? "flex flex-col items-center gap-0.5" : "flex items-center gap-2";

  return (
    <div className={`${wrapperClass} font-mono`} aria-disabled={isPending}>
      <button
        type="button"
        onClick={() => handleVote("UP")}
        aria-label="Grow this"
        title="Grow this"
        className={`leading-none transition-colors ${
          optimisticVote === "UP" ? "text-moss" : "text-fg-muted hover:text-moss"
        }`}
      >
        <Sprout
          size={16}
          fill={optimisticVote === "UP" ? "currentColor" : "none"}
          strokeWidth={optimisticVote === "UP" ? 2.5 : 2}
        />
      </button>
      <span
        className={`text-xs tabular-nums ${
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
        <ArrowDown size={16} />
      </button>
    </div>
  );
}
