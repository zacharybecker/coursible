import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MobileNav, TopNav } from "@/components/shell/app-nav";
import { CelebrationToast } from "@/components/gamification/celebration-toast";

const geistSans = Geist({
  // globals.css maps --font-sans into the Tailwind theme.
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ember — Learn anything, for real",
  description:
    "Structured, adaptive courses that get you to a real-world outcome — with streaks, mastery, and projects that stick.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background">
        <TopNav />
        <MobileNav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 md:pb-12">
          {children}
        </main>
        <CelebrationToast />
      </body>
    </html>
  );
}
