"use client";

import { useState } from "react";
import Spinner from "@/components/Spinner";

export type PickerField = { slug: string; name: string };
export type PickerSuggestion = PickerField & { matched: string[] };

// Field assignment, the same way at every entry point: the keyword matcher proposes,
// pre-ticked, and the person disposes. Not silently automatic — you can see what was
// suggested and why, and untick it — and not a blank required dropdown either, which is
// what "Add to Graze" and /submit each had before.
export default function FieldPicker({
  fields,
  suggestions,
  selected,
  onChange,
  loading = false,
  idPrefix,
}: {
  /** Every Field a paper can be filed under. */
  fields: PickerField[];
  /** What the matcher proposed, best first. */
  suggestions: PickerSuggestion[];
  selected: string[];
  onChange: (slugs: string[]) => void;
  /** True while suggestions are being recomputed (the submit form, as you type). */
  loading?: boolean;
  idPrefix: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const suggestedSlugs = new Set(suggestions.map((s) => s.slug));
  const others = fields.filter((f) => !suggestedSlugs.has(f.slug));

  function toggle(slug: string) {
    onChange(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs uppercase text-fg-muted">
          Fields ({selected.length} selected)
        </span>
        {loading && <Spinner size={11} className="text-moss" />}
      </div>

      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <FieldToggle
              key={suggestion.slug}
              id={`${idPrefix}-${suggestion.slug}`}
              slug={suggestion.slug}
              name={suggestion.name}
              checked={selected.includes(suggestion.slug)}
              onToggle={() => toggle(suggestion.slug)}
              // Saying which keywords hit is what makes a suggestion checkable rather than
              // something to trust or ignore.
              hint={`Suggested — matched: ${suggestion.matched.join(", ")}`}
              suggested
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-fg-muted">
          {loading
            ? "Looking for Fields that match…"
            : "No Field matched this paper's keywords — pick one below."}
        </p>
      )}

      {others.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="font-mono text-[11px] uppercase tracking-wide text-fg-muted hover:text-moss transition-colors"
            aria-expanded={showAll}
          >
            {showAll ? "− Hide other Fields" : `+ Add another Field (${others.length})`}
          </button>
          {showAll && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {others.map((field) => (
                <FieldToggle
                  key={field.slug}
                  id={`${idPrefix}-${field.slug}`}
                  slug={field.slug}
                  name={field.name}
                  checked={selected.includes(field.slug)}
                  onToggle={() => toggle(field.slug)}
                  hint={field.name}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Real checkboxes carry the value, so the form still submits without JavaScript and
          the label/checkbox relationship is the native one screen readers expect. */}
      {selected.map((slug) => (
        <input key={slug} type="hidden" name="fields" value={slug} />
      ))}
      <input
        type="hidden"
        name="suggestedFields"
        value={suggestions.map((s) => s.slug).join(",")}
      />
    </div>
  );
}

function FieldToggle({
  id,
  slug,
  name,
  checked,
  onToggle,
  hint,
  suggested = false,
}: {
  id: string;
  slug: string;
  name: string;
  checked: boolean;
  onToggle: () => void;
  hint: string;
  suggested?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      title={hint}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-moss ${
        checked
          ? "border-moss bg-moss/10 text-moss"
          : "border-border-strong bg-panel text-fg-muted hover:border-moss/60"
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="sr-only"
      />
      <span aria-hidden="true">{checked ? "✓" : "+"}</span>
      F~{slug}
      {suggested && <span className="sr-only"> (suggested by keyword match)</span>}
      <span className="sr-only">{name}</span>
    </label>
  );
}
