import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCardQuery } from "@/lib/search/parse-query";

/**
 * GET /api/cards/search?q=lightning bolt&limit=20
 * Returns up to `limit` cards (one per oracle card, cheapest printing) matching
 * the query. Supports the Scryfall-subset syntax in parse-query.ts.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limitParam = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitParam) ? limitParam : 20;

  const parsed = parseCardQuery(q);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_cards", {
    q: parsed.text,
    p_types: parsed.types.length ? parsed.types : null,
    p_ci: parsed.colorIdentity,
    p_mv_min: parsed.mvMin,
    p_mv_max: parsed.mvMax,
    p_rarities: parsed.rarities.length ? parsed.rarities : null,
    p_limit: limit,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ results: data ?? [] });
}
