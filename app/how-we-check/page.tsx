import Link from "next/link";
import LegalPage, { Item } from "@/components/LegalPage";
import { PREDATORY_LIST_URL } from "@/lib/credibility/sources/predatoryList";

export const metadata = {
  title: "How we check",
  description:
    "Every check behind the Field-Tested badge, what each one covers, and what none of them can tell you.",
};

// The long form of the credibility panel.
//
// The panel itself used to carry a paragraph of explanation per signal, which made the
// thing people actually wanted — what fired — hard to read. The explanations didn't get
// deleted, they moved here: the panel lists what happened, this says what it means.
export default function HowWeCheck() {
  return (
    <LegalPage
      title="How we check"
      intro="Graze runs the same checks on every paper and shows you which ones fired. None of them tell you whether a paper is any good — that part is still yours."
    >
      <h2>The three results</h2>
      <p>
        <strong>Field-Tested</strong> means the publisher records the work as peer-reviewed,
        the retraction check ran and found nothing, at least one independent source
        corroborates either the journal or the authors, and nothing we check raised a
        concern.
      </p>
      <p>
        <strong>Unverified</strong> means some check couldn&apos;t be completed — usually a
        missing DOI, or authors we couldn&apos;t resolve to any registry. It is not a mark
        against the work. Preprints land here too, because they haven&apos;t been through
        peer review yet, which is a fact about their stage rather than their quality.{" "}
        <strong>Unverified results are never hidden and never pushed down the page.</strong>
      </p>
      <p>
        <strong>Flagged</strong> means something specific and serious: a retraction on
        record, a match against a predatory-publisher list, or a journal reported as
        hijacked. Flagged results are held back from the default list, and you can always
        choose to see them.
      </p>

      <h2>Not every check counts the same</h2>
      <p>
        This is the part worth knowing, because it&apos;s where most credibility scores go
        wrong. Our checks are split into three weights, and the split is deliberate.
      </p>
      <ul>
        <Item>
          <strong>Decides on its own.</strong> A retraction, a predatory-list match, a
          hijacked journal, or sources disagreeing about the paper&apos;s basic details. Any
          one of these flags a paper regardless of everything else — a retracted paper with
          ten thousand citations is still retracted.
        </Item>
        <Item>
          <strong>Moves it between verified and unverified.</strong> Index listings, the
          peer-review type, fee and review-process disclosure, author identities.{" "}
          <strong>None of these can flag a paper on their own.</strong>
        </Item>
        <Item>
          <strong>Context only.</strong> Citation counts. Shown so you can judge for
          yourself, and deliberately unable to change the result — otherwise recent or
          specialised work would look disreputable for being new or niche, which is exactly
          the research Graze exists to surface.
        </Item>
      </ul>

      <h2>The checks themselves</h2>

      <h3>Retraction — Crossref</h3>
      <p>
        Checked against the Retraction Watch records Crossref distributes, per DOI. This
        covers retractions those records know about. It is not a guarantee that no concern
        exists about a paper — only that no retraction notice has been filed.
      </p>

      <h3>Predatory-publisher list</h3>
      <p>
        Matched against the{" "}
        <a href={PREDATORY_LIST_URL} target="_blank" rel="noopener noreferrer">
          Stop Predatory Journals
        </a>{" "}
        list, synced weekly. The list identifies journals by name, and names are not
        identifiers — hundreds of its entries are single generic words that are also the
        names of entirely legitimate journals. So a match is only acted on when the name is
        specific enough to identify one publication and no reputable index disagrees.
        Everything else is held for a person to look at, and shown to you with a note rather
        than hidden.
      </p>

      <h3>Peer review — Crossref and OpenAlex</h3>
      <p>
        Taken from the publisher&apos;s own declared work type. It records what the
        publisher says happened, not an inspection of the review itself.
      </p>

      <h3>Journal indexes — DOAJ, MEDLINE</h3>
      <p>
        DOAJ vets peer-review practice, licensing and editorial governance before listing a
        journal, and covers open-access journals only. MEDLINE is selected by the US
        National Library of Medicine and covers biomedicine.
      </p>
      <p>
        <strong>Absence from either means very little.</strong> Nature isn&apos;t in DOAJ,
        because it isn&apos;t open access. A good law review isn&apos;t in MEDLINE, because
        it isn&apos;t medicine. We never treat &quot;not found&quot; as evidence of anything.
      </p>

      <h3>Author identity — ORCID and ROR</h3>
      <p>
        An ORCID iD is a persistent identifier a researcher registers for themselves. A ROR
        id means the author&apos;s stated institution resolves to a real registered
        organisation rather than an unmatched string.
      </p>
      <p>
        Both are limited, and the limits matter: having an ORCID doesn&apos;t vouch for the
        work, we don&apos;t check whether that ORCID record has any publications on it, and a
        resolved institution confirms the institution exists — not that the person works
        there. Plenty of real researchers, especially before 2012, have no ORCID at all, so
        we never count its absence against anyone.
      </p>

      <h3>Fees, review process and turnaround — DOAJ</h3>
      <p>
        A journal&apos;s own published figures. Disclosing an article fee up front is a good
        sign; a stated turnaround of two weeks or less is called out, because peer review
        that fast is a common pattern among paper mills.
      </p>

      <h2>What none of this tells you</h2>
      <p>
        Every check above is about a paper&apos;s <em>status</em> — where it was published,
        whether it was withdrawn, whether the people and places are real. None of it says
        whether the methods are sound, the statistics hold, or the conclusions follow.
      </p>
      <p>
        A peer-reviewed paper in a well-indexed journal can still be wrong, and an
        unverified preprint from a journal nobody has indexed can be excellent. That
        judgement is the reading, and no badge replaces it. It&apos;s why the{" "}
        <strong>Chew on this</strong> summary always ends by sending you to the source.
      </p>
      <p>
        See also the <Link href="/terms">Terms &amp; Conditions</Link>, which says the same
        thing in the language a lawyer would want.
      </p>
    </LegalPage>
  );
}
