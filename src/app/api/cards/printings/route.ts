import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/cards/printings?oracleId=... → all printings of a card, cheapest first. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const oracleId = searchParams.get("oracleId");
  if (!oracleId) return NextResponse.json({ printings: [] });

  const supabase = await createClient();
  const { data } = await supabase
    .from("cards")
    .select("scryfall_id, set_code, collector_number, price_usd, price_usd_foil")
    .eq("oracle_id", oracleId)
    .order("price_usd", { ascending: true, nullsFirst: false })
    .limit(80);

  const printings = (data ?? []).map((p) => ({
    scryfall_id: p.scryfall_id,
    set_code: p.set_code,
    collector_number: p.collector_number,
    price_usd: (p.price_usd ?? p.price_usd_foil) as number | null,
  }));
  return NextResponse.json({ printings });
}
