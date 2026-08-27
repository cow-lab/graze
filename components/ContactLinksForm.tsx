"use client";

import { useActionState } from "react";
import { updateContactLinks } from "@/lib/actions/profile";

const inputClass =
  "bg-panel-2 border border-border rounded-md px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-moss";

export default function ContactLinksForm({
  defaults,
}: {
  defaults: {
    websiteUrl: string | null;
    linkedinUrl: string | null;
    googleScholarUrl: string | null;
    githubUrl: string | null;
  };
}) {
  const [error, formAction, pending] = useActionState(updateContactLinks, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2 mt-2">
      <div className="grid grid-cols-2 gap-2">
        <input
          name="websiteUrl"
          type="url"
          defaultValue={defaults.websiteUrl ?? ""}
          placeholder="Personal site"
          className={inputClass}
        />
        <input
          name="linkedinUrl"
          type="url"
          defaultValue={defaults.linkedinUrl ?? ""}
          placeholder="LinkedIn URL"
          className={inputClass}
        />
        <input
          name="googleScholarUrl"
          type="url"
          defaultValue={defaults.googleScholarUrl ?? ""}
          placeholder="Google Scholar URL"
          className={inputClass}
        />
        <input
          name="githubUrl"
          type="url"
          defaultValue={defaults.githubUrl ?? ""}
          placeholder="GitHub URL"
          className={inputClass}
        />
      </div>
      {error && <p className="text-xs text-rose">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="px-3 py-1.5 rounded-md bg-panel-2 border border-border text-xs text-fg hover:border-moss transition disabled:opacity-60 w-fit"
      >
        {pending ? "Saving…" : "Save links"}
      </button>
    </form>
  );
}
