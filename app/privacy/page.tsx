import Link from "next/link";
import LegalPage, { Item } from "@/components/LegalPage";
import { OPERATOR_NAME, CONTACT_EMAIL, OPERATOR_COUNTRY, POSTAL_ADDRESS } from "@/lib/legal";

export const metadata = {
  title: "Privacy Policy",
  description: "What Graze collects, why, how long it's kept, and how to get it deleted.",
};

// Written against prisma/schema.prisma, lib/storage.ts, lib/auth.ts and lib/lowBandwidth.ts
// as they actually are. If any of those change — a new column that holds personal data, a
// new third-party service, a new cookie — this page is part of that change, not a follow-up.
export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This describes what Graze actually stores, which is deliberately not much. It is written to match the code rather than to cover every possibility, so if something isn't listed here, Graze doesn't collect it."
    >
      <h2>Who is responsible for your data</h2>
      <p>
        Graze is run by {OPERATOR_NAME}, operating from {OPERATOR_COUNTRY}. Under the UK GDPR
        and EU GDPR, that person is the <strong>data controller</strong> for the information
        described here.
        {POSTAL_ADDRESS ? ` Postal address: ${POSTAL_ADDRESS}.` : ""}
      </p>
      <p>
        For anything in this policy — including access, correction, export, or deletion
        requests — contact <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>What Graze collects</h2>

      <h3>When you create an account</h3>
      <ul>
        <Item>
          <strong>Email address.</strong> Used to sign you in and to contact you about your
          account. It is never shown to other users.
        </Item>
        <Item>
          <strong>Display name.</strong> Shown publicly next to anything you post that
          isn&apos;t anonymous.
        </Item>
        <Item>
          <strong>Password.</strong> Stored only as a bcrypt hash. The password itself is
          never stored and cannot be recovered from the hash — if you forget it, it can only
          be reset, not retrieved.
        </Item>
        <Item>
          <strong>Account creation date</strong> and a role flag distinguishing ordinary
          users from administrators.
        </Item>
      </ul>
      <p>
        There is no name-and-address form, no phone number, no date of birth, and no payment
        information anywhere in Graze, because nothing on the site charges money.
      </p>

      <h3>When you post, comment, or vote</h3>
      <ul>
        <Item>
          The <strong>content you submit</strong> — paper details, comments, notes on your
          board — together with the account that submitted it and a timestamp.
        </Item>
        <Item>
          <strong>Votes</strong> on papers and comments, linked to your account so each
          person votes once. Individual votes are not shown to other users; only totals are.
        </Item>
        <Item>
          <strong>A four-digit &quot;cow number&quot;</strong>, assigned the first time you
          post anonymously and reused for your later anonymous posts. This lets other people
          follow one anonymous contributor without it linking to your profile.{" "}
          <strong>It is pseudonymity, not anonymity:</strong> the link between your cow
          number and your account exists in the database, and an administrator with database
          access could follow it. Please don&apos;t post anything under it that would harm
          you if it were connected back to you.
        </Item>
      </ul>

      <h3>When you use &quot;Chew on this&quot; or click through to a paper</h3>
      <p>
        Graze records that your account reached a paper&apos;s source, and whether you did so
        after reading the plain-language summary or passed the comprehension check. This is
        the one measurement the project is judged on — whether it actually gets people to
        real research. It is tied to your account and covers only papers on Graze.
      </p>

      <h3>When you upload a PDF</h3>
      <p>
        Uploaded PDFs are stored on Vercel Blob.{" "}
        <strong>
          They are stored with public access, meaning anyone who has the file&apos;s URL can
          open it without signing in.
        </strong>{" "}
        Treat an upload as publishing. Do not upload anything you do not have the right to
        share, and do not upload documents containing personal information.
      </p>

      <h3>What Graze does not collect</h3>
      <p>
        Graze does not log IP addresses, does not record your browser or device, does not use
        analytics or advertising, and sets no tracking cookies. There is no profiling and no
        automated decision-making with legal or similarly significant effects. Your hosting
        provider keeps its own server logs, which is outside Graze&apos;s control and normal
        for any website.
      </p>

      <h2>Why Graze is allowed to hold it (legal bases)</h2>
      <ul>
        <Item>
          <strong>Performance of a contract.</strong> Your account details and the content
          you post — without them there is no account and nothing to show.
        </Item>
        <Item>
          <strong>Legitimate interests.</strong> Click-through and comprehension records, and
          keeping the site secure and working. The interest is understanding whether Graze
          achieves its stated purpose; the data is minimal and never sold or shared for
          marketing.
        </Item>
        <Item>
          <strong>Consent.</strong> The agreement you give at sign-up to these terms. You can
          withdraw it by deleting your account.
        </Item>
      </ul>

      <h2>Who your data is shared with</h2>
      <p>
        <strong>Graze does not sell your personal data, and never has.</strong> It is not
        shared for advertising or marketing, and there are no third-party trackers on the
        site. Data reaches other companies only as processors needed to run it:
      </p>
      <ul>
        <Item>
          <strong>Vercel</strong> — hosting and file storage for uploaded PDFs.
        </Item>
        <Item>
          <strong>The database host</strong> — stores everything described above.
        </Item>
        <Item>
          <strong>Anthropic</strong> — when a plain-language explainer is generated, the
          paper&apos;s title and abstract are sent to Anthropic&apos;s API. Your account
          details are not sent, and results are cached so a given paper is only sent once.
        </Item>
        <Item>
          <strong>Academic sources</strong> — searching sends your search terms to OpenAlex,
          and paper look-ups reach Crossref, DOAJ, PubMed, Semantic Scholar and doi.org.
          These carry the query and the paper identifier, not your identity.
        </Item>
      </ul>
      <p>
        Some of these process data outside the UK/EU. Where that happens, transfers rely on
        the providers&apos; own safeguards, such as Standard Contractual Clauses.{" "}
        <strong>
          [PLACEHOLDER: confirm the transfer safeguards your chosen hosting and database
          providers actually offer, and name them here.]
        </strong>
      </p>

      <h2>How long it is kept</h2>
      <ul>
        <Item>
          <strong>Your account</strong> — until you ask for it to be deleted.
        </Item>
        <Item>
          <strong>Posts and comments</strong> — these are public contributions to a shared
          library, so they may remain after your account is deleted, with authorship removed.
          If you need specific content taken down too, say so in your request.
        </Item>
        <Item>
          <strong>Notifications</strong> — deleted with your account.
        </Item>
        <Item>
          <strong>Error logs</strong> — technical messages held briefly, capped at the 100
          most recent, and lost whenever the server restarts. They are not indexed by user.
        </Item>
      </ul>

      <h2>Your rights</h2>
      <p>
        If you are in the UK or EU, the GDPR gives you the right to access your data, correct
        it, have it deleted, restrict or object to how it is used, and receive a copy in a
        portable format. If you are in California or another US state with a comparable law,
        you have similar rights to know, delete, and correct — and Graze does not sell
        personal information, so there is nothing to opt out of.
      </p>
      <p>
        <strong>
          There is currently no self-service button for deletion or export — these requests
          are handled by hand.
        </strong>{" "}
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address on
        your account and you will get a response within 30 days, which is the statutory
        limit. There is no charge.
      </p>
      <p>
        If you think your data has been mishandled you can complain to a supervisory
        authority — in the UK, the{" "}
        <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">
          Information Commissioner&apos;s Office
        </a>
        ; in the EU, the authority in your country.
      </p>

      <h2>Children</h2>
      <p>
        Graze is not intended for children. You must be at least 16 to hold an account, as
        set out in the <Link href="/terms">Terms &amp; Conditions</Link>. If you believe a
        child has created an account, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and it will be removed.
      </p>

      <h2>Cookies</h2>
      <p>
        Graze sets two cookies and no tracking cookies at all. The{" "}
        <Link href="/cookies">Cookie Policy</Link> explains both.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes in a way that affects you, the date at the top changes and the
        change will be noted on the site. Continuing to use Graze after that means the
        updated policy applies.
      </p>
    </LegalPage>
  );
}
