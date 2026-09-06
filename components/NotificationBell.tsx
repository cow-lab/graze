"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { markNotificationsRead } from "@/lib/actions/notifications";

export type NotificationItem = {
  id: string;
  type: "COMMENT_ON_POST" | "REPLY_TO_COMMENT" | "COMMENT_ON_TRACKED_PAPER";
  read: boolean;
  createdAt: string;
  postId: string | null;
  postTitle: string | null;
  actorName: string | null;
  snippet: string | null;
};

function describe(n: NotificationItem): string {
  switch (n.type) {
    case "REPLY_TO_COMMENT":
      return `${n.actorName ?? "Someone"} replied to your comment`;
    case "COMMENT_ON_POST":
      return `${n.actorName ?? "Someone"} commented on a paper you posted`;
    case "COMMENT_ON_TRACKED_PAPER":
      return `${n.actorName ?? "Someone"} commented on a paper you're tracking`;
  }
}

export default function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next);
    // Opening the list is the read signal — there's no separate "mark all read" to hunt for.
    if (next && unreadCount > 0) startTransition(() => markNotificationsRead());
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
        className="relative p-1 text-fg-muted hover:text-ink transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
      >
        <Bell size={16} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-rose text-white font-mono text-[9px] leading-[15px] text-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-away layer, kept behind the panel. */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 z-40 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-border-strong bg-panel shadow-lg">
            <p className="px-3 py-2 border-b border-border font-mono text-[11px] uppercase tracking-wide text-fg-muted">
              Notifications
            </p>
            {notifications.length === 0 ? (
              <p className="px-3 py-4 text-sm text-fg-muted text-center">Nothing yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.postId ? `/post/${n.postId}` : "/"}
                      onClick={() => setOpen(false)}
                      className={`block px-3 py-2.5 hover:bg-panel-2/60 transition-colors ${
                        n.read ? "" : "bg-moss/5"
                      }`}
                    >
                      <p className="text-sm text-fg">{describe(n)}</p>
                      {n.postTitle && (
                        <p className="text-xs text-fg-muted mt-0.5 line-clamp-1">{n.postTitle}</p>
                      )}
                      {n.snippet && (
                        <p className="text-xs text-fg-muted mt-0.5 line-clamp-2 italic">
                          “{n.snippet}”
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
