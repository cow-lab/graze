// ─────────────────────────────────────────────────────────────────────────────
// READ THIS BEFORE ADDING ANALYTICS, A PIXEL, AN EMBED, OR ANY THIRD-PARTY SCRIPT
// ─────────────────────────────────────────────────────────────────────────────
//
// Graze currently sets exactly two cookies:
//
//   1. the NextAuth session cookie — strictly necessary, exempt from consent
//   2. `graze_low_bandwidth`       — set only by the user's own click on a toggle
//
// Neither needs an opt-in, which is the *only* reason the footer notice is a dismissible
// note rather than a blocking consent banner. That is a consequence of what the code does,
// not a policy decision — and it stops being true the moment anything below is added:
//
//   - Google Analytics, Plausible, PostHog, Vercel Analytics, or any other measurement tool
//   - a Meta/TikTok/LinkedIn pixel or any advertising tag
//   - an embedded YouTube/Vimeo player, a Google Font loaded at runtime, an embedded map,
//     a social widget, a comment system, a chat bubble
//   - anything else that sets a cookie, writes to localStorage, or contacts a third party
//     on page load rather than in response to something the user asked for
//
// Under the ePrivacy Directive (as implemented by PECR in the UK and national laws in the
// EU) all of those require PRIOR, INFORMED, OPT-IN consent. Prior means the script must not
// load until consent is given. A banner that says "by continuing you accept" is not
// consent, and neither is a pre-ticked box.
//
// So: if you add any of the above, it must be gated behind `hasAnalyticsConsent()` below,
// AND the footer notice must be upgraded to a real consent UI with a genuine reject option
// that is as easy to use as accept, AND /cookies must be updated to describe it.
//
// The helper deliberately returns false unconditionally today. It exists so that wiring a
// script up correctly is the path of least resistance, and so that adding one without
// consent means deleting an explicit refusal rather than merely forgetting a step.

/** The cookie a real consent UI would set. Nothing writes it yet. */
export const ANALYTICS_CONSENT_COOKIE = "graze_analytics_consent";

/**
 * Whether the visitor has opted in to non-essential storage.
 *
 * Always false right now, because Graze has nothing to consent to and there is no consent
 * UI to record an answer. Do not "temporarily" make this return true to get a script
 * working — implement the consent UI first, then read the cookie here.
 */
export function hasAnalyticsConsent(): boolean {
  return false;
}
