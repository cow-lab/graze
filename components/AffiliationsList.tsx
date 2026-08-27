"use client";

import { useTransition } from "react";
import { BadgeCheck, X } from "lucide-react";
import { removeAffiliation } from "@/lib/actions/profile";

type Affiliation = {
  id: string;
  title: string;
  institution: string;
  verified: boolean;
};

export default function AffiliationsList({
  affiliations,
  canEdit,
}: {
  affiliations: Affiliation[];
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (affiliations.length === 0) {
    return <p className="text-sm text-fg-muted">No affiliations listed.</p>;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {affiliations.map((a) => (
        <li key={a.id} className="flex items-center gap-2 text-sm">
          <span>
            {a.title}, {a.institution}
          </span>
          {a.verified && (
            <BadgeCheck
              size={14}
              className="text-teal shrink-0"
              aria-label="Institutionally verified"
            />
          )}
          {canEdit && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => removeAffiliation(a.id))}
              className="text-fg-muted hover:text-rose transition-colors disabled:opacity-60"
              aria-label="Remove affiliation"
            >
              <X size={13} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
