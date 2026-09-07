"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPost } from "@/lib/actions/posts";
import { suggestFieldsForPaper } from "@/lib/actions/fieldSuggest";
import FieldPicker, { type PickerSuggestion } from "@/components/FieldPicker";
import { buttonClass } from "@/lib/controls";

const inputClass =
  "bg-panel-2 border border-border rounded-md px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-moss";
const labelClass = "font-mono text-xs uppercase text-fg-muted";

// How long to wait after the last keystroke before asking for Field suggestions. Long
// enough that typing an abstract doesn't fire a request per word.
const SUGGEST_DEBOUNCE_MS = 600;

export default function SubmitForm({ boards }: { boards: { slug: string; name: string }[] }) {
  const [error, formAction, pending] = useActionState(createPost, undefined);

  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [suggestions, setSuggestions] = useState<PickerSuggestion[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  // Slugs the person has explicitly unticked, so a later re-suggestion doesn't quietly
  // put them back — the matcher proposes, but it doesn't get to overrule a decision.
  const dismissed = useRef(new Set<string>());

  useEffect(() => {
    if (!title.trim() && !abstract.trim()) return;
    // The state change waits for the timer rather than firing in the effect body: nothing
    // is actually in flight during the debounce window, so nothing should claim to be.
    const timer = setTimeout(async () => {
      setSuggesting(true);
      const next = await suggestFieldsForPaper({ title, abstract });
      setSuggestions(next);
      setSelected((current) => {
        const fresh = next
          .map((s) => s.slug)
          .filter((slug) => !current.includes(slug) && !dismissed.current.has(slug));
        return [...current, ...fresh];
      });
      setSuggesting(false);
    }, SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [title, abstract]);

  function handleFieldChange(next: string[]) {
    for (const slug of selected) {
      if (!next.includes(slug)) dismissed.current.add(slug);
    }
    for (const slug of next) dismissed.current.delete(slug);
    setSelected(next);
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className={labelClass}>
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </div>

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
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
          placeholder="Explain what this paper solves and who might want it, without jargon."
          className={inputClass}
        />
      </div>

      {/* Fields come last, after there's a title and abstract to match against — the
          suggestions are only useful once the paper has been described. */}
      <div className="flex flex-col gap-1.5 rounded-md border border-border bg-panel-2/40 p-3">
        <FieldPicker
          fields={boards}
          suggestions={suggestions}
          selected={selected}
          onChange={handleFieldChange}
          loading={suggesting}
          idPrefix="submit"
        />
        <p className="text-xs text-fg-muted">
          Suggested from your title and abstract, matched against each Field&apos;s keywords.
          A paper can sit in more than one.
        </p>
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

      <label className="flex items-center gap-2 text-sm text-fg-muted w-fit cursor-pointer">
        <input type="checkbox" name="anonymous" className="accent-moss" />
        Post anonymously — shows as &ldquo;Cow #XXXX&rdquo; instead of your name
      </label>

      {/* Two distinct things are being acknowledged: that the submitter has the right to
          share what they're posting (copyright — uploads especially, since PDFs are stored
          with public access), and that they understand this becomes public. Unchecked by
          default and required; lib/actions/posts.ts rejects a submission without it. */}
      <label className="flex items-start gap-2.5 rounded-md border border-border-strong bg-panel-2 px-3 py-2.5 text-[13px] leading-relaxed text-fg">
        <input
          type="checkbox"
          name="rightsAcknowledged"
          value="yes"
          required
          className="mt-0.5 size-4 shrink-0 accent-moss"
        />
        <span>
          I have the right to share this paper or file, and I understand that what I submit —
          including any uploaded PDF — becomes{" "}
          <strong className="font-semibold">publicly visible to anyone</strong>, whether or
          not they have a Graze account.
        </span>
      </label>

      {error && <p className="text-sm text-rose">{error}</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className={buttonClass("primary")}
        >
          {pending ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
