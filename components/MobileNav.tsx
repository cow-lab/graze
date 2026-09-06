"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import type { SessionUser } from "@/lib/session";

export default function MobileNav({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        className="p-2 -mr-2 text-ink"
      >
        {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full bg-panel border-b border-border-strong shadow-md px-4 py-3 flex flex-col gap-3 font-mono text-sm uppercase tracking-wide">
          <Link href="/" onClick={() => setOpen(false)} className="text-fg hover:text-moss transition-colors">
            Discover
          </Link>
          <Link
            href="/research"
            onClick={() => setOpen(false)}
            className="text-fg hover:text-moss transition-colors"
          >
            Library
          </Link>
          {user && (
            <Link href="/board" onClick={() => setOpen(false)} className="text-fg hover:text-moss transition-colors">
              Board
            </Link>
          )}
          <Link
            href="/submit"
            onClick={() => setOpen(false)}
            className="text-moss font-semibold"
          >
            Submit
          </Link>

          <div className="pt-2 mt-1 border-t border-border flex flex-col gap-3 normal-case">
            {user ? (
              <>
                <Link
                  href={`/profile/${user.id}`}
                  onClick={() => setOpen(false)}
                  className="text-fg-muted"
                >
                  {user.name}
                </Link>
                {user.role === "ADMIN" && (
                  <Link href="/admin/fields" onClick={() => setOpen(false)} className="text-fg-muted">
                    Admin
                  </Link>
                )}
                <form action={signOutAction}>
                  <button type="submit" className="text-fg-muted hover:text-rose transition-colors">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="text-fg-muted">
                  Log in
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className="text-fg-muted">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
