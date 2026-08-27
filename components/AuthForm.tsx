"use client";

import { useActionState } from "react";
import Link from "next/link";

type Field = {
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
};

export default function AuthForm({
  action,
  fields,
  submitLabel,
  altHref,
  altLabel,
}: {
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
            className="mt-2 px-4 py-2 rounded-md bg-moss text-ink text-sm font-medium hover:brightness-110 transition disabled:opacity-60"
          >
            {pending ? "Please wait…" : submitLabel}
          </button>
        </form>
      </div>
      <p className="text-center mt-4 text-sm text-fg-muted">
        <Link href={altHref} className="hover:text-fg transition-colors">
          {altLabel}
        </Link>
      </p>
    </div>
  );
}
