import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata = {
  title: "Refund Policy",
  description: "Graze doesn't charge for anything, so there is nothing to refund.",
};

export default function RefundPolicy() {
  return (
    <LegalPage
      title="Refund Policy"
      intro="Short version: Graze is free, so there is nothing to refund."
    >
      <h2>Graze doesn&apos;t charge for anything</h2>
      <p>
        There are no paid plans, no subscriptions, no one-off purchases, and no donations
        handled through this site. There is no payment form anywhere on Graze and no payment
        processor connected to it, so no money can change hands here and there is nothing to
        refund.
      </p>
      <p>
        A generic refund policy listing conditions and processing times would describe
        something that doesn&apos;t exist, so this page says what is actually true instead.
      </p>

      <h2>If that ever changes</h2>
      <p>
        If Graze ever charges for anything, this page will be replaced with a real refund
        policy before the first payment is taken — covering what can be refunded, how to ask,
        and how long it takes. Under UK and EU consumer law that would also mean a
        14-day right to cancel for digital purchases, with its own rules about when it
        applies.
      </p>

      <h2>Questions</h2>
      <p>
        If you have been asked to pay for Graze by anyone, that did not come from us — please
        report it to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
      <p>
        See also the <Link href="/terms">Terms &amp; Conditions</Link> and the{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
