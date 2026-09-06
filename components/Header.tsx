import Link from "next/link";
import { signOutAction } from "@/lib/actions/auth";
import MobileNav from "@/components/MobileNav";
import type { SessionUser } from "@/lib/session";
import NotificationBell, { type NotificationItem } from "@/components/NotificationBell";
import { buttonClass } from "@/lib/controls";

export default function Header({
  user,
  notifications,
  unreadCount,
}: {
  user: SessionUser | null;
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-panel/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-hand text-[32px] leading-none font-bold text-ink">Graze</span>
            <span className="hidden md:inline font-mono text-[10px] uppercase tracking-wide text-fg-muted">
              find research · make it yours
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-4 font-mono text-xs uppercase tracking-wide text-fg-muted">
            <Link href="/" className="hover:text-ink transition-colors">
              Discover
            </Link>
            <Link href="/research" className="hover:text-ink transition-colors">
              Library
            </Link>
            {user && (
              <Link href="/board" className="hover:text-ink transition-colors">
                Board
              </Link>
            )}
          </nav>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/submit"
            className={buttonClass("primary")}
          >
            Submit
          </Link>
          {user ? (
            <div className="flex items-center gap-2">
              <NotificationBell notifications={notifications} unreadCount={unreadCount} />
              <Link
                href={`/profile/${user.id}`}
                className="font-mono text-xs text-fg-muted hover:text-ink transition-colors"
              >
                {user.name}
              </Link>
              {user.role === "ADMIN" && (
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

        <MobileNav user={user} />
      </div>
    </header>
  );
}
