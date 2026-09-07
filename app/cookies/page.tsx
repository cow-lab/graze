import Link from "next/link";
import LegalPage, { Item } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata = {
  title: "Cookie Policy",
  description: "The two cookies Graze sets, and the tracking cookies it doesn't.",
};

// Verified against the code, not assumed. As of writing:
//   - next-auth sets the session cookie (lib/auth.ts, jwt strategy)
//   - lib/lowBandwidth.ts + lib/actions/preferences.ts set `graze_low_bandwidth`
//   - components/ReadingControls.tsx and LowBandwidthSuggestion.tsx use localStorage
//   - lib/chewSession.ts uses sessionStorage
// There are no analytics or advertising libraries in package.json, and no <script src>,
// <iframe>, or third-party embeds anywhere in app/ or components/.
//
// If you add anything that stores data on a visitor's device beyond this list, update this
// page in the same change — see lib/consent.ts for the gating rule.
export default function CookiePolicy() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro="Graze sets two cookies. Neither is used for tracking, advertising, or analytics, and neither is shared with anyone."
    >
      <h2>The cookies Graze sets</h2>

      <h3>1. Session cookie (strictly necessary)</h3>
      <p>
        Set by NextAuth when you sign in, and it is what keeps you signed in as you move
        between pages. It holds a signed token identifying your account. Without it, signing
        in would not be possible, so it is exempt from consent requirements — there is no
        version of an account system that works without one.
      </p>
      <p>It is deleted when you sign out, and expires on its own if you don&apos;t.</p>

      <h3>
        2. <code>graze_low_bandwidth</code> (preference)
      </h3>
      <p>
        Set only when you switch on low-bandwidth mode, which stops the illustrated
        background being sent to your browser at all. It stores a single character —{" "}
        <code>1</code> or <code>0</code> — and lasts a year.
      </p>
      <p>
        It is a cookie rather than browser storage for a specific reason: the server has to
        know before it builds the page, or the illustration would already have been sent
        before it could be hidden, which would defeat the point. It records a choice you made
        by clicking a button, contains nothing about who you are, and is never sent anywhere
        except back to Graze.
      </p>

      <h2>Things stored in your browser (not cookies)</h2>
      <p>
        These stay on your device and are never transmitted to Graze or anyone else:
      </p>
      <ul>
        <Item>
          <strong>Reading preferences</strong> — your chosen text size and whether you turned
          on the dyslexia-friendly font.
        </Item>
        <Item>
          <strong>A dismissal flag</strong> so the low-bandwidth suggestion doesn&apos;t
          reappear after you close it.
        </Item>
        <Item>
          <strong>Which papers you opened a summary for</strong> during the current tab
          session, so a later click to the source can be counted correctly. Cleared when you
          close the tab.
        </Item>
      </ul>
      <p>Clearing your browser&apos;s site data removes all of these.</p>

      <h2>What Graze does not use</h2>
      <p>
        <strong>
          There are no analytics cookies, no advertising cookies, no tracking pixels, no
          social-media buttons, no embedded third-party scripts, and no iframes anywhere on
          this site.
        </strong>{" "}
        Graze does not use Google Analytics or any equivalent, and does not build a profile
        of you. Nothing you do here follows you to another website.
      </p>
      <p>
        Because the only cookies are one that is strictly necessary and one that records a
        setting you chose yourself, a consent banner blocking the site is not required. The
        small notice in the footer is there so you know what is set anyway.
      </p>

      <h2>Turning them off</h2>
      <p>
        You can block or delete cookies in your browser settings. Blocking the session cookie
        means you will not be able to sign in; everything readable without an account will
        still work. Low-bandwidth mode can be switched off from the toggle at the bottom of
        any page.
      </p>

      <h2>If this changes</h2>
      <p>
        If analytics or any third-party embed is ever added, this page will be updated and{" "}
        <strong>
          such cookies will be set only after an explicit opt-in — never on by default.
        </strong>{" "}
        Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See also the{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
