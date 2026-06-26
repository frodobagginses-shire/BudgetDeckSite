/**
 * V-3 (STUB) — TCGplayer affiliate links.
 * --------------------------------------------------------------------------
 * TCGplayer affiliate approval requires the site to be live and reviewed, so
 * this is stubbed: until NEXT_PUBLIC_TCGPLAYER_AFFILIATE_ID is set, the links
 * still work (they just earn no commission). Once approved, set that env var —
 * and ideally replace `withAffiliate` below with TCGplayer's Impact partner-link
 * format (tcgplayer.pxf.io/...), which is the official tracked-link mechanism.
 *
 * Affiliate codes are not secret (they appear in the outgoing URL), so the
 * NEXT_PUBLIC_ prefix is intentional — it lets both server and client build links.
 */
const AFF = process.env.NEXT_PUBLIC_TCGPLAYER_AFFILIATE_ID ?? "";

function withAffiliate(url: string): string {
  if (!AFF) return url;
  const u = new URL(url);
  u.searchParams.set("utm_source", AFF);
  u.searchParams.set("utm_campaign", "budgetdecksite");
  return u.toString();
}

export interface BuyCard {
  name: string;
  quantity: number;
}

/** Whole-deck "Buy this deck" via TCGplayer Mass Entry. */
export function tcgplayerDeckUrl(cards: BuyCard[]): string {
  const list = cards.map((c) => `${c.quantity} ${c.name}`).join("\n");
  const params = new URLSearchParams({ productline: "Magic", c: list });
  return withAffiliate(`https://www.tcgplayer.com/massentry?${params.toString()}`);
}

/** Single-card buy link (search by name). */
export function tcgplayerCardUrl(name: string): string {
  const params = new URLSearchParams({ q: name });
  return withAffiliate(
    `https://www.tcgplayer.com/search/magic/product?${params.toString()}`
  );
}
