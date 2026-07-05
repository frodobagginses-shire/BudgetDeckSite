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

export function NavBar({ account }: { account: { handle: string } | null }) {
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
          {/* Two fanned cards with a price tag corner */}
          <svg
            viewBox="0 0 24 24"
            className="text-brand-600 size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="7.5" y="3.5" width="11" height="15" rx="1.5" transform="rotate(8 13 11)" />
            <rect x="4" y="5" width="11" height="15" rx="1.5" fill="var(--background)" />
            <text
              x="9.5"
              y="16"
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill="currentColor"
              stroke="none"
            >
              $
            </text>
          </svg>
          Budget Deck Site
        </Link>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={cls(l.href)}>
            {l.label}
          </Link>
        ))}
        {account ? (
          <Link
            href={`/users/${account.handle}`}
            className={`ml-auto ${cls(`/users/${account.handle}`)}`}
          >
            @{account.handle}
          </Link>
        ) : (
          <Link href="/login" className={`ml-auto ${cls("/login")}`}>
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
