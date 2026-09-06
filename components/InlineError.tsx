// One place to render "that didn't work" next to whatever the person just clicked, so
// every failure in the app looks the same and is announced the same way. Server actions
// hand back the sentence (see lib/actions/result.ts); this only presents it.
export default function InlineError({
  message,
  className = "",
}: {
  message: string | null;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p role="alert" className={`text-xs text-rose ${className}`}>
      {message}
    </p>
  );
}
