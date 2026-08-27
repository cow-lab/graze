"use client";

import { useActionState, useEffect, useRef } from "react";
import { addAffiliation } from "@/lib/actions/profile";

const inputClass =
  "bg-panel-2 border border-border rounded-md px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-moss";

export default function AddAffiliationForm() {
  const [error, formAction, pending] = useActionState(addAffiliation, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) formRef.current?.reset();
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2 mt-2">
      <div className="grid grid-cols-2 gap-2">
        <input name="title" type="text" required placeholder="Role, e.g. PhD Candidate" className={inputClass} />
        <input name="institution" type="text" required placeholder="Institution, e.g. MIT" className={inputClass} />
      </div>
      <input
        name="email"
        type="email"
        required
        placeholder="Email at that institution"
        className={inputClass}
      />
      <p className="text-xs text-fg-muted">
        Verified automatically if the email is a .edu or institutional domain — no email is
        sent or stored publicly.
      </p>
      {error && <p className="text-xs text-rose">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="px-3 py-1.5 rounded-md bg-moss text-ink text-xs font-medium hover:brightness-110 transition disabled:opacity-60 w-fit"
      >
        {pending ? "Adding…" : "Add affiliation"}
      </button>
    </form>
  );
}
