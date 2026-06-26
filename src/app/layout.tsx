import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Budget Deck Site — build & lock in price-capped Magic decks",
  description:
    "A Magic: The Gathering deck builder focused on price-capped decks. Build to a budget, validate on the cheapest printing, and Lock In a dated price.",
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
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <header className="border-border border-b">
          <nav className="mx-auto flex w-full max-w-5xl items-center gap-4 px-6 py-3 text-sm">
            <Link href="/" className="font-bold">
              Budget Deck Site
            </Link>
            <Link
              href="/decks"
              className="text-muted-foreground hover:text-foreground"
            >
              Your decks
            </Link>
            <Link
              href="/account"
              className="text-muted-foreground hover:text-foreground ml-auto"
            >
              Account
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
