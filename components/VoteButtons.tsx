"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sprout, ArrowDown } from "lucide-react";
import { voteOnPost } from "@/lib/actions/posts";
import InlineError from "@/components/InlineError";
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
  const [error, setError] = useState<string | null>(null);
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

    setError(null);
    setOptimisticScore(prevScore + delta);
    setOptimisticVote(prevVote === value ? null : value);

    startTransition(async () => {
      const result = await voteOnPost(postId, value);
      if (!result.ok) {
        // Put the count back where it was: leaving the optimistic number up would tell
        // this person their vote landed when it didn't.
        setOptimisticScore(prevScore);
        setOptimisticVote(prevVote);
        setError(result.message);
      }
    });
  }

  const wrapperClass =
    orientation === "vertical" ? "flex flex-col items-center gap-1" : "flex items-center gap-2";

  // `aria-pressed` communicates the toggled state, so a screen reader announces whether
  // you've already grown this post rather than just "button, Grow this". The score is
  // exposed as a labelled live region so a vote's effect is announced, not silent.
  return (
    <div className={`${wrapperClass} font-mono`} aria-disabled={isPending}>
      <button
        type="button"
        onClick={() => handleVote("UP")}
        aria-label="Grow this post"
        aria-pressed={optimisticVote === "UP"}
        title="Grow this"
        className={`rounded p-1 leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss ${
          optimisticVote === "UP" ? "text-moss" : "text-fg-muted hover:bg-moss/10 hover:text-moss"
        }`}
      >
        <Sprout
          size={15}
          aria-hidden="true"
          fill={optimisticVote === "UP" ? "currentColor" : "none"}
          strokeWidth={optimisticVote === "UP" ? 2.5 : 2}
        />
      </button>
      <span
        aria-live="polite"
        aria-atomic="true"
        className={`text-xs font-medium tabular-nums ${
          optimisticVote === "UP"
            ? "text-moss"
            : optimisticVote === "DOWN"
              ? "text-rose"
              : "text-fg-muted"
        }`}
      >
        <span className="sr-only">Score: </span>
        {optimisticScore}
      </span>
      <button
        type="button"
        onClick={() => handleVote("DOWN")}
        aria-label="Downvote this post"
        aria-pressed={optimisticVote === "DOWN"}
        className={`rounded p-1 leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss ${
          optimisticVote === "DOWN" ? "text-rose" : "text-fg-muted hover:bg-rose/10 hover:text-rose"
        }`}
      >
        <ArrowDown size={15} aria-hidden="true" />
      </button>
      <InlineError message={error} className={orientation === "vertical" ? "w-32 text-center" : ""} />
    </div>
  );
}
