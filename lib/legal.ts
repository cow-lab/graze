// Everything on the legal pages that depends on who is actually running Graze.
//
// Kept in one file on purpose: these values appear across four policy pages and the
// footer, and the worst failure mode for a legal page is a stale detail in one corner of
// it. Fill these in once here and every page updates together.
//
// Every value below marked [PLACEHOLDER] MUST be replaced before the site is used by real
// people. They are deliberately conspicuous rather than plausible-looking defaults, so an
// unfilled one is impossible to miss in review or on the rendered page.

/** Your legal name, or the registered business name if you incorporate later. */
export const OPERATOR_NAME = "Haoyuan";

/**
 * The address for privacy requests, general support, and legal notices. A real, monitored
 * mailbox — GDPR gives people a right to reach the controller, and an unmonitored address
 * fails that on its own.
 */
export const CONTACT_EMAIL = "haoyuansun001@gmail.com";

/**
 * The country you operate from. This is not cosmetic: it decides which rules bind you.
 * See POSTAL_ADDRESS below and the deployment notes in the project summary.
 */
export const OPERATOR_COUNTRY = "Canada";

/**
 * A geographic address.
 *
 * Whether you are legally required to publish one depends on where you are established,
 * which cannot be determined from this codebase:
 *
 *  - Established in the UK: the Electronic Commerce (EC Directive) Regulations 2002 reg. 6
 *    require an information-society service provider to give a geographic address.
 *  - Established in the EU: the e-Commerce Directive (2000/31/EC) Art. 5 requires the same.
 *  - Operating solely from the US with no EU/UK establishment: there is no general
 *    equivalent. CAN-SPAM's postal-address rule applies to commercial email, which Graze
 *    does not send.
 *
 * Because Graze has no company registered, this would be a home address, which is a real
 * privacy problem for a solo operator. The usual answer is a virtual-office or registered-
 * office service rather than omitting it. Set to null to hide the address line entirely
 * while you decide — do not leave a fake one.
 */
export const POSTAL_ADDRESS: string | null = null;

/**
 * Update whenever the substance of a policy changes, not on every typo fix. People rely on
 * this date to tell whether the terms they agreed to are the terms now in force.
 */
export const POLICY_LAST_UPDATED = "8 September 2026";

/** The minimum age to hold an account. See the note in app/terms/page.tsx. */
export const MINIMUM_AGE = 16;
