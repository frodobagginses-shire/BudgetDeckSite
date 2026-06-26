import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/cards/by-name?name=Lightning Bolt
 * Resolves a card by exact (case-insensitive) name → image + cheapest price,
 * for the hover/click card popovers in articles and primers.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = (searchParams.get("name") ?? "").trim();
  if (!name) return NextResponse.json({ card: null });

  const supabase = await createClient();
  const { data: card } = await supabase
    .from("cards")
    .select("name, oracle_id, image_normal, image_small")
    .ilike("name", name)
    .limit(1)
    .maybeSingle();
  if (!card) return NextResponse.json({ card: null });

  const { data: cheap } = await supabase
    .from("card_cheapest")
    .select("cheapest_price_usd")
    .eq("oracle_id", card.oracle_id)
    .maybeSingle();

  return NextResponse.json({
    card: {
      name: card.name,
      image_normal: card.image_normal,
      image_small: card.image_small,
      cheapest_price_usd: cheap?.cheapest_price_usd ?? null,
    },
  });
}
