"use client";

import { useState, useSyncExternalStore, useCallback, useEffect } from "react";
import { Type } from "lucide-react";

export type TextSize = "small" | "default" | "large";

const SIZE_KEY = "graze_reading_size";
const FONT_KEY = "graze_reading_dyslexic";

// jsDelivr mirror of the OpenDyslexic webfont. Injected on first use only — the font is a
// few hundred KB and most readers won't want it, so it isn't part of the base page weight
// (which also keeps it out of low-bandwidth mode unless someone deliberately turns it on).
const OPEN_DYSLEXIC_CSS =
  "https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@5.0.0/index.css";
const FONT_LINK_ID = "graze-opendyslexic";

export const TEXT_SIZE_CLASS: Record<TextSize, string> = {
  small: "text-xs leading-relaxed",
  default: "text-sm leading-relaxed",
  large: "text-lg leading-relaxed",
};

function readStored<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value as T) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

// Preferences live in localStorage so they persist across visits without needing an
// account. Read via useSyncExternalStore so the server render (defaults) and the client
// render agree, and so changes in one open panel propagate to any other on the page.
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emit() {
  listeners.forEach((cb) => cb());
}

export function useReadingPrefs() {
  const size = useSyncExternalStore(
    subscribe,
    () => readStored<TextSize>(SIZE_KEY, "default", ["small", "default", "large"]),
    () => "default" as TextSize,
  );
  const dyslexic = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(FONT_KEY) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
  return { size, dyslexic };
}

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Preference just won't survive the session.
  }
  emit();
}

function ensureDyslexicFont() {
  if (document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href = OPEN_DYSLEXIC_CSS;
  document.head.appendChild(link);
}

export default function ReadingControls() {
  const { size, dyslexic } = useReadingPrefs();
  const [groupId] = useState(() => `reading-size-${Math.random().toString(36).slice(2)}`);

  // The preference persists but the injected <link> doesn't survive a page load, so a
  // returning reader would get the OpenDyslexic font-family with no font behind it and
  // silently fall back. Re-inject when the stored preference is already on. (Injecting a
  // DOM node is a real external side effect — the right use of an effect — and involves
  // no state update.)
  useEffect(() => {
    if (dyslexic) ensureDyslexicFont();
  }, [dyslexic]);

  const setSize = useCallback((next: TextSize) => persist(SIZE_KEY, next), []);
  const toggleFont = useCallback(() => {
    const next = !dyslexic;
    if (next) ensureDyslexicFont();
    persist(FONT_KEY, next ? "1" : "0");
  }, [dyslexic]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <fieldset className="flex items-center gap-1.5 border-0 p-0 m-0">
        <legend className="sr-only">Summary text size</legend>
        <Type size={12} aria-hidden="true" className="text-fg-muted" />
        {(["small", "default", "large"] as const).map((option) => (
          <label
            key={option}
            className={`cursor-pointer rounded border px-2 py-0.5 text-[11px] font-mono uppercase transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-moss ${
              size === option
                ? "border-moss bg-panel-2 text-moss"
                : "border-border text-fg-muted hover:text-fg hover:border-border-strong"
            }`}
          >
            <input
              type="radio"
              name={groupId}
              className="sr-only"
              checked={size === option}
              onChange={() => setSize(option)}
            />
            {option === "default" ? "Normal" : option}
          </label>
        ))}
      </fieldset>

      <button
        type="button"
        onClick={toggleFont}
        aria-pressed={dyslexic}
        className={`rounded border px-2 py-0.5 text-[11px] font-mono uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss ${
          dyslexic
            ? "border-moss bg-panel-2 text-moss"
            : "border-border text-fg-muted hover:text-fg hover:border-border-strong"
        }`}
      >
        Dyslexia-friendly font
      </button>
    </div>
  );
}
