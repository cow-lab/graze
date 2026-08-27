import Link from "next/link";
import type { Session } from "next-auth";
import { signOutAction } from "@/lib/actions/auth";
import MobileNav from "@/components/MobileNav";

export default function Header({ session }: { session: Session | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-panel/80 backdrop-blur-sm relative">
      <div className="max-w-6xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-hand text-[32px] leading-none font-bold text-ink">Graze</span>
            <span className="hidden md:inline font-mono text-[10px] uppercase tracking-wide text-fg-muted">
              problems · research · solutions
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-4 font-mono text-xs uppercase tracking-wide text-fg-muted">
            <Link href="/" className="hover:text-ink transition-colors">
              Feed
            </Link>
            <Link href="/research" className="hover:text-ink transition-colors">
              Research
            </Link>
            <Link href="/search" className="hover:text-ink transition-colors">
              Search
            </Link>
          </nav>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/submit"
            className="px-3 py-1.5 rounded-md bg-moss text-white text-sm font-medium hover:brightness-110 transition"
          >
            Submit
          </Link>
          {session?.user ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${session.user.id}`}
                className="font-mono text-xs text-fg-muted hover:text-ink transition-colors"
              >
                {session.user.name}
              </Link>
              {session.user.role === "ADMIN" && (
                <Link
                  href="/admin/fields"
                  className="font-mono text-xs text-fg-muted hover:text-ink transition-colors"
                >
                  Admin
                </Link>
              )}
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="font-mono text-xs text-fg-muted hover:text-rose transition-colors"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-3 font-mono text-xs">
              <Link href="/login" className="text-fg-muted hover:text-ink transition-colors">
                Log in
              </Link>
              <Link href="/register" className="text-fg-muted hover:text-ink transition-colors">
                Sign up
              </Link>
            </div>
          )}
        </div>

        <MobileNav session={session} />
      </div>
      <div className="hidden sm:block max-w-6xl mx-auto px-4 pb-2 -mt-1">
        <p className="text-[11px] italic font-medium text-moss">
          Take what&apos;s useful. Leave something back.
        </p>
      </div>
    </header>
  );
}
