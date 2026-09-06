"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Play, Pause, Square } from "lucide-react";
import { logListen } from "@/lib/actions/metrics";
import { buttonClass } from "@/lib/controls";

// Reads the plain-language summary aloud using the browser's built-in speech synthesis.
// No external service and no API cost — and deliberately scoped to the summary only, so
// the quiz isn't read out along with its answers.
export default function ListenButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);

  // Speech synthesis is a client-only capability, so it's read through
  // useSyncExternalStore with a `false` server snapshot: that avoids both an effect-driven
  // setState and a hydration mismatch from rendering the button on the server.
  const supported = useSyncExternalStore(
    () => () => {},
    () => "speechSynthesis" in window,
    () => false,
  );

  // Speech continues at the window level even after this component unmounts (closing the
  // modal), so it has to be stopped explicitly on teardown.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!supported) return null;

  function start() {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };
    utterance.onerror = () => {
      setSpeaking(false);
      setPaused(false);
    };
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
    setPaused(false);
    void logListen();
  }

  function togglePause() {
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  }

  function stop() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  }

  return (
    <div className="flex items-center gap-2">
      {!speaking ? (
        <button
          type="button"
          onClick={start}
          className={buttonClass("quiet")}
        >
          <Play size={12} aria-hidden="true" /> Listen
          <span className="sr-only"> to the plain-language summary</span>
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={togglePause}
            className={buttonClass("quiet")}
          >
            {paused ? (
              <>
                <Play size={12} aria-hidden="true" /> Resume
              </>
            ) : (
              <>
                <Pause size={12} aria-hidden="true" /> Pause
              </>
            )}
          </button>
          <button
            type="button"
            onClick={stop}
            aria-label="Stop reading"
            className={buttonClass("quiet")}
          >
            <Square size={12} aria-hidden="true" /> Stop
          </button>
        </>
      )}
      <span className="sr-only" aria-live="polite">
        {speaking ? (paused ? "Reading paused" : "Reading the summary aloud") : ""}
      </span>
    </div>
  );
}
