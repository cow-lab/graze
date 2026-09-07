"use client";

import { useActionState } from "react";
import Link from "next/link";
import { buttonClass } from "@/lib/controls";

type Field = {
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
};

export default function AuthForm({
  title,
  subtitle,
  action,
  fields,
  submitLabel,
  altHref,
  altLabel,
  requireConsent = false,
}: {
  title: string;
  subtitle?: string;
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  fields: Field[];
  submitLabel: string;
  altHref: string;
  altLabel: string;
  /**
   * Show the "I agree to the Terms and Privacy Policy" checkbox and require it before the
   * form can be submitted. Sign-up only — asking a returning user to re-consent on every
   * login would be meaningless, and consent has to be a positive act at the point the
   * account is created.
   */
  requireConsent?: boolean;
}) {
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <div className="max-w-sm mx-auto mt-8">
      <div className="bg-panel/95 border border-border-strong rounded-lg p-6 shadow-sm">
        <h1 className={`font-heading text-2xl font-semibold text-center ${subtitle ? "mb-1" : "mb-4"}`}>
          {title}
        </h1>
        {subtitle && <p className="text-center text-sm text-fg-muted mb-4">{subtitle}</p>}
        <form action={formAction} className="flex flex-col gap-4">
          {fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <label htmlFor={field.name} className="font-mono text-xs uppercase text-fg-muted">
                {field.label}
              </label>
              <input
                id={field.name}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                required
                className="bg-panel-2 border border-border rounded-md px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-moss"
              />
            </div>
          ))}

          {requireConsent && (
            // Unchecked by default and `required`, so the browser blocks submission until
            // it is ticked. GDPR consent has to be a freely given, unambiguous, affirmative
            // act — a pre-ticked box is explicitly not consent. The server action checks
            // this too, since a client-side `required` is trivially bypassed.
            <label className="flex items-start gap-2.5 rounded-md border border-border-strong bg-panel-2 px-3 py-2.5 text-[13px] leading-relaxed text-fg">
              <input
                type="checkbox"
                name="consent"
                value="yes"
                required
                className="mt-0.5 size-4 shrink-0 accent-moss"
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="text-moss underline underline-offset-2">
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-moss underline underline-offset-2">
                  Privacy Policy
                </Link>
                , and I am at least 16 years old.
              </span>
            </label>
          )}

          {error && <p className="text-sm text-rose">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className={buttonClass("primary", "md", "mt-2")}
          >
            {pending ? "Please wait…" : submitLabel}
          </button>
        </form>
        <p className="text-center mt-4 pt-4 border-t border-border text-sm text-fg-muted">
          <Link href={altHref} className="text-moss hover:underline">
            {altLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
