import Link from "next/link";
import { manapoolHomeUrl } from "@/lib/affiliate";

export function Footer() {
  return (
    <footer className="border-border/70 text-muted-foreground mt-auto border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-8 text-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Link href="/browse" className="hover:text-foreground">
            Browse
          </Link>
          <Link href="/articles" className="hover:text-foreground">
            Articles
          </Link>
          <Link href="/decks/new" className="hover:text-foreground">
            New deck
          </Link>
          <a
            href={manapoolHomeUrl()}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            title="Buy Magic cards on Mana Pool"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/MP_Badges_partner_blue.svg"
              alt="Mana Pool affiliate partner"
              className="h-7 w-auto"
            />
          </a>
        </div>
        <div className="sm:ml-auto sm:text-right">
          Card data &amp; images courtesy of{" "}
          <a
            href="https://scryfall.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground underline"
          >
            Scryfall
          </a>
          . Prices via TCGplayer. Buy links are Mana Pool affiliate links. Not
          affiliated with Wizards of the Coast.
        </div>
      </div>
    </footer>
  );
}
