"use client";

import { useActionState } from "react";
import { createField } from "@/lib/actions/fields";

const inputClass =
  "bg-panel-2 border border-border rounded-md px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-moss";
const labelClass = "font-mono text-xs uppercase text-fg-muted";

export default function NewFieldForm() {
  const [error, formAction, pending] = useActionState(createField, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className={labelClass}>
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Robotics"
          className={inputClass}
        />
        <p className="text-xs text-fg-muted">
          Becomes the Field&apos;s slug, e.g. &ldquo;Robotics&rdquo; → F~Robotics.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          required
          placeholder="What kinds of problems, research, and solutions belong here?"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="keywords" className={labelClass}>
          Search keywords
        </label>
        <input
          id="keywords"
          name="keywords"
          type="text"
          required
          placeholder="e.g. robotics, actuators, autonomous systems"
          className={inputClass}
        />
        <p className="text-xs text-fg-muted">
          Comma-separated. The Combine uses these to automatically find relevant research
          papers for this Field from academic sources.
        </p>
      </div>

      {error && <p className="text-sm text-rose">{error}</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 rounded-md bg-moss text-ink text-sm font-medium hover:brightness-110 transition disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create Field"}
        </button>
      </div>
    </form>
  );
}
