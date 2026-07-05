import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";

const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Budget Deck Site",
  description:
    "Deck builder for price-capped Magic formats. Prices come from the cheapest printing of each card, and a Lock In saves a dated snapshot of your list and its price.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let account: { handle: string } | null = null;
  if (user) {
    const { data: prof } = await supabase
      .from("users")
      .select("handle")
      .eq("id", user.id)
      .maybeSingle();
    if (prof?.handle) account = { handle: prof.handle as string };
  }

  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <NavBar account={account} />
        {children}
        <Footer />
      </body>
    </html>
  );
}
