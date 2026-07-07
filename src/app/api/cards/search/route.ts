import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCardQuery } from "@/lib/search/parse-query";
import {
  canBeCommander,
  isBackground,
  partnersAllowed,
  type RulesCard,
} from "@/lib/commander";

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

  // When searching within a deck: surface likely-in-budget cards first
  // (per-card budget = cap / (deck size * 0.3)) and only show cards that can
  // actually go in the deck (format-legal + within the commander color identity).
  let pBudget: number | null = null;
  let pFormat: string | null = null;
  let pIdentity: string[] | null = null;
  const deckId = searchParams.get("deckId");
  if (deckId) {
    const { data: deck } = await supabase
      .from("decks")
      .select("threshold_amount, game_format")
      .eq("id", deckId)
      .maybeSingle();
    if (deck) {
      const format = (deck.game_format ?? "casual") as string;
      pFormat = format === "casual" ? null : format;
      if (deck.threshold_amount) {
        const size = format === "commander" ? 100 : 60;
        pBudget = Number(deck.threshold_amount) / (size * 0.3);
      }
      if (format === "commander") {
        const { data: cmd } = await supabase
          .from("deck_cards")
          .select("scryfall_id")
          .eq("deck_id", deckId)
          .eq("is_commander", true);
        const ids = (cmd ?? []).map((r) => r.scryfall_id as string);
        if (ids.length) {
          const { data: cc } = await supabase
            .from("cards")
            .select("color_identity")
            .in("scryfall_id", ids);
          const set = new Set<string>();
          for (const c of cc ?? [])
            for (const col of (c.color_identity as string[]) ?? []) set.add(col);
          pIdentity = [...set]; // [] = colorless commander → colorless cards only
        }
      }
    }
  }

  // partnerFor=<oracle_id>: restrict results to cards that can legally be a
  // second commander alongside that card (Partner, Backgrounds, etc.).
  // A partner can extend color identity, so no identity filter applies.
  const partnerFor = searchParams.get("partnerFor");
  let anchor: RulesCard | null = null;
  if (partnerFor) {
    const { data: a } = await supabase
      .from("cards")
      .select("name, type_line, oracle_text, keywords")
      .eq("oracle_id", partnerFor)
      .limit(1)
      .maybeSingle();
    anchor = (a as RulesCard | null) ?? null;
    pFormat = "commander";
    pIdentity = null;
    pBudget = null;
  }

  const { data, error } = await supabase.rpc("search_cards", {
    q: parsed.text,
    p_types: parsed.types.length ? parsed.types : null,
    p_ci: parsed.colorIdentity,
    p_mv_min: parsed.mvMin,
    p_mv_max: parsed.mvMax,
    p_rarities: parsed.rarities.length ? parsed.rarities : null,
    p_limit: anchor ? limit * 5 : limit,
    p_budget: pBudget,
    p_format: pFormat,
    p_identity: pIdentity,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let results = (data ?? []) as { oracle_id: string; name: string }[];
  if (anchor && results.length) {
    const { data: rules } = await supabase
      .from("cards")
      .select("oracle_id, name, type_line, oracle_text, keywords")
      .in(
        "oracle_id",
        results.map((r) => r.oracle_id)
      );
    const eligible = new Set(
      (rules ?? [])
        .filter((c) => {
          const rc = c as unknown as RulesCard;
          return (
            partnersAllowed(anchor!, rc) &&
            (canBeCommander(rc) || isBackground(rc)) &&
            rc.name !== anchor!.name
          );
        })
        .map((c) => c.oracle_id as string)
    );
    results = results.filter((r) => eligible.has(r.oracle_id)).slice(0, limit);
  }

  return NextResponse.json({ results });
}
