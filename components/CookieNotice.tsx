"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { NOTICE } from "@/lib/surfaces";

const DISMISSED_KEY = "graze_cookie_notice_dismissed";

// A notice, not a consent gate.
//
// Graze's two cookies are a strictly-necessary session cookie and a preference the user
// sets by clicking a toggle, so neither needs opt-in and blocking the page for consent
// would be theatre. This just tells people what's set, because we expect EU/UK visitors
// and saying so plainly costs nothing.
//
// If analytics or any third-party embed is ever added this must become a real consent UI —
// prior opt-in, with rejecting as easy as accepting. See lib/consent.ts before doing that.
//
// Deliberately in the footer rather than as an overlay: it isn't urgent, and a modal that
// covers the page to announce two harmless cookies trains people to dismiss things without
// reading them.
const subscribe = () => () => {};

export default function CookieNotice() {
  // Server and first client render must agree, so the notice renders only after hydration.
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [dismissed, setDismissed] = useState(false);

  let alreadyDismissed = false;
  if (hydrated) {
    try {
      alreadyDismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // Private mode or blocked storage: show the notice. It's one line of text, and
      // failing closed here would hide information rather than protect anyone.
    }
  }

  if (!hydrated || dismissed || alreadyDismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Not persisting the dismissal is a small annoyance, not an error worth surfacing.
    }
  }

  return (
    <div
      role="note"
      aria-label="Cookie information"
      className={`${NOTICE} mb-6 flex flex-wrap items-start gap-3`}
    >
      <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-fg">
        Graze uses one cookie to keep you signed in, and one to remember low-bandwidth mode
        if you turn it on. <strong className="font-semibold">No tracking, no analytics,</strong>{" "}
        no advertising. <Link href="/cookies" className="text-moss underline underline-offset-2">Read the cookie policy</Link>.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded p-1 text-fg-muted transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
      >
        <X size={16} aria-hidden="true" />
        <span className="sr-only">Dismiss cookie notice</span>
      </button>
    </div>
  );
}
