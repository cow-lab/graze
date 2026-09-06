"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Renders children into <body>, outside every stacking context on the page.
//
// This isn't a style preference. The layout wraps page content in `relative z-[2]` so it
// sits above the fixed background, and each card lifts its interactive bits with
// `relative z-10` so they clear the card-wide overlay link. An overlay rendered in place
// therefore has its z-index resolved *inside* one card's z-10 box: a `z-50` modal opened
// from card 1 competes only with that box, and card 3's `z-10` button — equal z-index,
// later in DOM order — paints straight through it. Escaping to <body> is the only fix that
// doesn't depend on out-bidding every z-index anyone adds to a card later.

// Nothing to subscribe to: the "store" here is just "are we past hydration", which changes
// exactly once and never again.
const subscribe = () => () => {};

export default function Portal({ children }: { children: ReactNode }) {
  // A portal needs a real document, which the server render doesn't have. This returns
  // false while rendering on the server and true on the client, so the two first renders
  // agree and hydration stays quiet — the same reason the usual `useState`/`useEffect`
  // mounted flag exists, without the cascading render that pattern causes.
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (!hydrated) return null;
  return createPortal(children, document.body);
}
