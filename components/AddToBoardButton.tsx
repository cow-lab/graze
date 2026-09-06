"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StickyNote } from "lucide-react";
import {
  toggleBoardPost,
  toggleBoardExternal,
  type ExternalPaper,
} from "@/lib/actions/board";
import InlineError from "@/components/InlineError";
import { buttonClass } from "@/lib/controls";

// Replaces the old bookmark button. Saving a paper isn't a list append any more — it puts
// a card on the user's board, which is where the note-writing and connecting happens. The
// label says so, because "Save" set the wrong expectation about what comes next.
export default function AddToBoardButton({
  postId,
  external,
  initialOnBoard,
  isLoggedIn,
}: {
  /** For a paper in the library. */
  postId?: string;
  /** For a live search result that isn't (and may never be) imported. */
  external?: ExternalPaper;
  initialOnBoard: boolean;
  isLoggedIn: boolean;
}) {
  const [onBoard, setOnBoard] = useState(initialOnBoard);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    // Cards wrap content in a full-bleed link; without this the click navigates instead.
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    const previous = onBoard;
    setError(null);
    setOnBoard(!onBoard);
    startTransition(async () => {
      const result = postId
        ? await toggleBoardPost(postId)
        : external
          ? await toggleBoardExternal(external)
          : null;
      if (!result) return;
      if (result.ok) {
        setOnBoard(result.data);
      } else {
        setOnBoard(previous);
        setError(result.message);
      }
    });
  }

  return (
    <span className="relative z-10 inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={onBoard}
        aria-label={onBoard ? "Remove from your board" : "Add to your board"}
        title={
          onBoard
            ? "On your board — click to remove"
            : "Add a card for this paper to your board"
        }
        // Sits beside "Chew on this" on a card, so it takes the shared button geometry and
        // stays quiet — same size, lower contrast.
        className={buttonClass(
          "quiet",
          "md",
          `relative z-10 ${onBoard ? "border-moss/60 text-moss" : ""}`,
        )}
      >
        <StickyNote
          size={14}
          fill={onBoard ? "currentColor" : "none"}
          aria-hidden="true"
        />
        {onBoard ? "On your board" : "Add to board"}
      </button>
      <InlineError message={error} />
    </span>
  );
}
