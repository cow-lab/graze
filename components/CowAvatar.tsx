// A plain, generic cow-face icon used for anonymous ("Cow #XXXX") posts and comments —
// deliberately identical for every anonymous contributor, so it carries no identifying
// signal beyond the number next to it.
export default function CowAvatar({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      <path
        d="M8 5.5 7 3M16 5.5 17 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M6 9C6 6.5 8.5 5 12 5s6 1.5 6 4c0 1.5-.5 2.5-1.5 3.2C17.2 12.8 18 14 18 15.5c0 2.5-2.7 4-6 4s-6-1.5-6-4c0-1.5.8-2.7 1.5-3.3C6.5 11.5 6 10.5 6 9Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="10.5" r="1" fill="currentColor" />
      <circle cx="14.5" cy="10.5" r="1" fill="currentColor" />
      <path d="M10.5 14c.6.5 2.4.5 3 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="9" cy="16.5" rx="0.9" ry="0.7" fill="currentColor" opacity="0.4" />
      <ellipse cx="15" cy="17" rx="0.7" ry="1" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
