// A spinner that stops spinning when the viewer has asked for reduced motion — it keeps
// the shape and the accessible label, and drops the animation (see globals.css). Purely
// decorative: the surrounding component owns the live-region text.
export default function Spinner({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block rounded-full border-2 border-current border-r-transparent align-[-2px] motion-safe:animate-spin ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
