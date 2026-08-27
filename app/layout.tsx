import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono, Caveat } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import GrazeBackground from "@/components/GrazeBackground";
import { auth } from "@/lib/auth";

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
    "A community marketplace connecting real industry problems, academic research, and student/practitioner solutions. Take what's useful. Leave something back.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${plexMono.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-cream text-ink">
        <div className="relative min-h-full">
          <GrazeBackground />
          <div className="relative z-[2] flex flex-col min-h-full">
            <Header session={session} />
            <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
