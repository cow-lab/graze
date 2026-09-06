import { Fragment } from "react";

// Renders a Field's "F~Slug" label so it can wrap in narrow containers.
//
// Slugs are PascalCase with no spaces or hyphens, so the browser sees one unbreakable
// word and overflows its container. Truncating hides what the Field actually is (and a
// hover tooltip is useless on touch), so instead we insert <wbr> — a zero-width break
// *opportunity* — at each PascalCase boundary. The text itself is unchanged (still
// selectable and copyable as one string); the browser just gains permission to wrap at
// word boundaries, so the full name stays readable across two lines.
export default function FieldLabel({ slug }: { slug: string }) {
  const words = slug.split(/(?=[A-Z])/).filter(Boolean);

  return (
    <span>
      F~
      {words.map((word, i) => (
        <Fragment key={i}>
          {i > 0 && <wbr />}
          {word}
        </Fragment>
      ))}
    </span>
  );
}
