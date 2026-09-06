"use client";

import { useEffect, useState } from "react";
import Spinner from "@/components/Spinner";

const ROTATE_MS = 2600;

export default function LoadingMessage({
  messages,
  className = "",
}: {
  messages: readonly string[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length < 2) return;
    // Stops at the last message rather than looping: a cycle that keeps restarting reads
    // as "nothing is happening", while landing on "still going" reads as honest.
    const timer = setInterval(() => {
      setIndex((i) => (i + 1 < messages.length ? i + 1 : i));
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [messages]);

  return (
    <p
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 text-sm text-fg-muted ${className}`}
    >
      <Spinner className="text-moss" />
      {messages[index]}
    </p>
  );
}
