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
}: {
  title: string;
  subtitle?: string;
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  fields: Field[];
  submitLabel: string;
  altHref: string;
  altLabel: string;
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
