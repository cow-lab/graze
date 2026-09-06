import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono, Caveat } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import GrazeBackground from "@/components/GrazeBackground";
import LowBandwidthToggle from "@/components/LowBandwidthToggle";
import LowBandwidthSuggestion from "@/components/LowBandwidthSuggestion";
import { getCurrentUser } from "@/lib/session";
import { isLowBandwidth } from "@/lib/lowBandwidth";
import { getNotifications, getUnreadCount } from "@/lib/notifications";
import type { NotificationItem } from "@/components/NotificationBell";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Graze",
  description:
    "Find research worth reading, then do something with it. Plain-language explainers, live search across 250M+ works, and a board where you draw the connections yourself.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Resolved against the database rather than taken from the JWT alone, so a session
  // whose user has since been deleted renders as signed-out instead of linking to a
  // profile that 404s.
  const [user, lowBandwidth] = await Promise.all([getCurrentUser(), isLowBandwidth()]);

  // Notifications are only meaningful for a signed-in user, so nothing is queried for
  // anonymous visitors.
  let notifications: NotificationItem[] = [];
  let unreadCount = 0;
  if (user) {
    const [rows, count] = await Promise.all([getNotifications(user.id), getUnreadCount(user.id)]);
    unreadCount = count;
    notifications = rows.map((n) => ({
      id: n.id,
      type: n.type,
      read: n.readAt !== null,
      createdAt: n.createdAt.toISOString(),
      postId: n.postId,
      postTitle: n.post?.title ?? null,
      // An anonymous comment must not name its author here — that would quietly undo the
      // anonymity everywhere else in the app respects.
      actorName: n.comment?.isAnonymous
        ? n.actor?.cowNumber
          ? `Cow #${n.actor.cowNumber}`
          : "Someone"
        : (n.actor?.name ?? null),
      snippet: n.comment?.body ? n.comment.body.slice(0, 120) : null,
    }));
  }

  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${plexMono.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-cream text-ink">
        <div className="relative min-h-full">
          {/* Genuinely not rendered in low-bandwidth mode: the inline sky SVG and the
              repeating field tile never reach the HTML, rather than being downloaded and
              then hidden with CSS. That's the difference between saving bytes and just
              looking simpler. */}
          {!lowBandwidth && <GrazeBackground />}
          <div className="relative z-[2] flex flex-col min-h-full">
            <Header user={user} notifications={notifications} unreadCount={unreadCount} />
            <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">
              <LowBandwidthSuggestion enabled={lowBandwidth} />
              {children}
            </main>
            <footer className="w-full max-w-6xl mx-auto px-4 py-4 flex justify-end">
              <LowBandwidthToggle enabled={lowBandwidth} />
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
