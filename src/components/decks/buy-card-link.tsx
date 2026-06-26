import { tcgplayerCardUrl } from "@/lib/affiliate";

export function BuyCardLink({ name }: { name: string }) {
  return (
    <a
      href={tcgplayerCardUrl(name)}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      className="text-muted-foreground hover:text-brand-600 text-xs"
      title={`Buy ${name} on TCGplayer`}
    >
      buy
    </a>
  );
}
