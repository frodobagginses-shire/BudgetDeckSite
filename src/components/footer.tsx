import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-border/70 text-muted-foreground mt-auto border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-6 py-8 text-xs sm:flex-row sm:items-center">
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
          . Prices via TCGplayer. Not affiliated with Wizards of the Coast.
        </div>
      </div>
    </footer>
  );
}
