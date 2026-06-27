"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/articles", label: "Articles" },
  { href: "/decks", label: "Your decks" },
  { href: "/playgroups", label: "Playgroups" },
  { href: "/matches", label: "Matches" },
];

export function NavBar() {
  const pathname = usePathname();
  const active = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const cls = (href: string) =>
    `rounded-md px-3 py-1.5 transition-colors ${
      active(href)
        ? "bg-muted text-foreground font-medium"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
    }`;

  return (
    <header className="border-border/70 bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-5xl items-center gap-1 px-6 py-3 text-sm">
        <Link
          href="/"
          className="mr-3 flex items-center gap-2 font-bold tracking-tight"
        >
          <span className="from-brand-400 to-brand-600 inline-block size-5 rounded-md bg-gradient-to-br" />
          Budget Deck Site
        </Link>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={cls(l.href)}>
            {l.label}
          </Link>
        ))}
        <Link href="/account" className={`ml-auto ${cls("/account")}`}>
          Account
        </Link>
      </nav>
    </header>
  );
}
