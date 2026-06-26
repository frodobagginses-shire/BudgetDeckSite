import { tcgplayerDeckUrl, type BuyCard } from "@/lib/affiliate";

export function BuyDeckButton({ cards }: { cards: BuyCard[] }) {
  if (cards.length === 0) return null;
  return (
    <a
      href={tcgplayerDeckUrl(cards)}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      className="bg-brand-600 inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
    >
      Buy this deck on TCGplayer
    </a>
  );
}
