"use client";

import { useActionState, useState } from "react";
import { createPost } from "@/lib/actions/posts";
import type { PostType } from "@prisma/client";

const TYPES: { value: PostType; label: string; accent: string }[] = [
  { value: "RESEARCH", label: "Research", accent: "border-teal text-teal bg-teal/10" },
  { value: "POST", label: "Post", accent: "border-rose text-rose bg-rose/10" },
];

const inputClass =
  "bg-panel-2 border border-border rounded-md px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-moss";
const labelClass = "font-mono text-xs uppercase text-fg-muted";

export default function SubmitForm({
  boards,
  initialType,
  initialRefPostId,
}: {
  boards: { slug: string; name: string }[];
  initialType: PostType;
  initialRefPostId?: string;
}) {
  const [type, setType] = useState<PostType>(initialType);
  const [error, formAction, pending] = useActionState(createPost, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="type" value={type} />

      <div className="flex items-center gap-2 w-fit">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${
              type === t.value ? t.accent : "border-border text-fg-muted hover:text-fg hover:border-border-strong"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className={labelClass}>
          Title
        </label>
        <input id="title" name="title" type="text" required className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="board" className={labelClass}>
          Field
        </label>
        <select id="board" name="board" required className={inputClass}>
          <option value="">Choose a field…</option>
          {boards.map((b) => (
            <option key={b.slug} value={b.slug}>
              F~{b.slug} — {b.name}
            </option>
          ))}
        </select>
      </div>

      {type === "RESEARCH" && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="authors" className={labelClass}>
                Authors
              </label>
              <input id="authors" name="authors" type="text" required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="year" className={labelClass}>
                Year
              </label>
              <input
                id="year"
                name="year"
                type="number"
                defaultValue={new Date().getFullYear()}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="field" className={labelClass}>
              Field / tag
            </label>
            <input
              id="field"
              name="field"
              type="text"
              placeholder="e.g. Fintech, Materials Science"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="abstract" className={labelClass}>
              Plain-language abstract
            </label>
            <textarea
              id="abstract"
              name="abstract"
              rows={5}
              required
              placeholder="Explain what this paper solves and who might want it, without jargon."
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="externalUrl" className={labelClass}>
                External link (arXiv, SSRN, etc.)
              </label>
              <input
                id="externalUrl"
                name="externalUrl"
                type="url"
                placeholder="https://…"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="file" className={labelClass}>
                Or upload PDF
              </label>
              <input
                id="file"
                name="file"
                type="file"
                accept="application/pdf"
                className={`${inputClass} py-1.5`}
              />
            </div>
          </div>
          <p className="text-xs text-fg-muted -mt-2">
            Provide at least one — a link or a PDF. A plain-language explainer with a
            comprehension check will be generated automatically from your abstract.
          </p>
        </>
      )}

      {type === "POST" && (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className={labelClass}>
              Body
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              required
              placeholder="A question, some analysis, a project you built, a discussion topic…"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="refPostId" className={labelClass}>
              Referencing a research post (ID, optional)
            </label>
            <input
              id="refPostId"
              name="refPostId"
              type="text"
              defaultValue={initialRefPostId}
              placeholder="Paste the research post ID this is discussing/responding to"
              className={inputClass}
            />
          </div>
        </>
      )}

      <label className="flex items-center gap-2 text-sm text-fg-muted w-fit cursor-pointer">
        <input type="checkbox" name="anonymous" className="accent-moss" />
        Post anonymously — shows as &ldquo;Cow #XXXX&rdquo; instead of your name
      </label>

      {error && <p className="text-sm text-rose">{error}</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 rounded-md bg-moss text-ink text-sm font-medium hover:brightness-110 transition disabled:opacity-60"
        >
          {pending ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
