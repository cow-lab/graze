import Link from "next/link";
import LowBandwidthToggle from "@/components/LowBandwidthToggle";
import CookieNotice from "@/components/CookieNotice";
import { OPERATOR_NAME, CONTACT_EMAIL, POSTAL_ADDRESS } from "@/lib/legal";

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
  { href: "/refund", label: "Refunds" },
];

export default function Footer({ lowBandwidth }: { lowBandwidth: boolean }) {
  return (
    <footer className="relative mt-16 bg-panel-2">
      {/* The field ends here. Rather than a straight 1px rule — which read as the page
          simply stopping — the footer's top edge is a hand-drawn horizon in the same ink
          line as the hills and the cow, so the ground the whole site sits on visibly meets
          the ground the footer is made of. Skipped in low-bandwidth mode, where there is no
          illustrated field for it to meet. */}
      {!lowBandwidth && (
        <svg
          className="absolute inset-x-0 -top-[18px] h-[19px] w-full"
          viewBox="0 0 1200 19"
          preserveAspectRatio="none"
          role="presentation"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M0,19 L0,12 Q75,5 155,10 T310,8 Q395,3 470,11 T625,9 Q710,3 790,10 T945,8 Q1030,4 1105,11 T1200,10 L1200,19 Z"
            fill="var(--color-panel-2)"
          />
          <path
            d="M0,12 Q75,5 155,10 T310,8 Q395,3 470,11 T625,9 Q710,3 790,10 T945,8 Q1030,4 1105,11 T1200,10"
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      {lowBandwidth && <div className="border-t border-border-strong" />}

      <div className="relative mx-auto w-full max-w-6xl px-4 py-6">
        <CookieNotice />

        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="font-heading text-base font-semibold text-ink">Graze</p>
            <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-fg-muted">
              A free, non-commercial project for finding research worth reading. Not medical,
              legal, or financial advice.
            </p>
          </div>

          <nav aria-label="Legal and site information">
            <h2 className="font-mono text-[10px] font-medium uppercase tracking-wide text-fg-muted">
              Legal
            </h2>
            <ul className="mt-2 flex flex-col gap-1.5">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-fg-muted underline-offset-2 transition-colors hover:text-moss hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0">
            <h2 className="font-mono text-[10px] font-medium uppercase tracking-wide text-fg-muted">
              Contact
            </h2>
            <address className="mt-2 flex flex-col gap-1.5 not-italic text-[13px] text-fg-muted">
              <span>{OPERATOR_NAME}</span>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline-offset-2 transition-colors hover:text-moss hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
              {/* Rendered only when set. See the note in lib/legal.ts on whether you are
                  actually required to publish one — it depends where you're established. */}
              {POSTAL_ADDRESS && <span className="max-w-xs">{POSTAL_ADDRESS}</span>}
            </address>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border-strong pt-4">
          <p className="font-mono text-[11px] text-fg-muted">
            © {new Date().getFullYear()} {OPERATOR_NAME}
          </p>
          <LowBandwidthToggle enabled={lowBandwidth} />
        </div>
      </div>
    </footer>
  );
}
