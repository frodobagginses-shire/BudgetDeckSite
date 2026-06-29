import { manapoolCardUrl } from "@/lib/affiliate";

export function BuyCardLink({ name }: { name: string }) {
  return (
    <a
      href={manapoolCardUrl(name)}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      className="text-muted-foreground hover:text-brand-600 text-xs"
      title={`Buy ${name} on Mana Pool`}
    >
      buy
    </a>
  );
}
