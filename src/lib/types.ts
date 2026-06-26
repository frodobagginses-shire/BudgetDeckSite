export type Visibility = "public" | "unlisted" | "private";
export type Board = "main" | "side" | "considering" | "maybe";

export const GAME_FORMATS = [
  "commander",
  "vintage",
  "legacy",
  "modern",
  "pioneer",
  "standard",
  "pauper",
  "casual",
] as const;
export type GameFormat = (typeof GAME_FORMATS)[number];

export interface Deck {
  id: string;
  owner_id: string;
  name: string;
  game_format: string;
  threshold_amount: number | null;
  threshold_currency: string;
  visibility: Visibility;
  description_md: string | null;
  parent_deck_id: string | null;
  show_lineage: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeckTotals {
  budget_price: number;
  total_price: number;
  bling_price: number;
  excluded_value: number;
  card_count: number;
}

export interface PricedCard {
  scryfall_id: string;
  oracle_id: string;
  name: string;
  type_line: string | null;
  cmc: number | null;
  board: Board;
  quantity: number;
  counts_toward_budget: boolean;
  unit_cheapest: number | null;
  unit_bling: number | null;
  line_cheapest: number | null;
  line_bling: number | null;
}

export interface SearchCard {
  oracle_id: string;
  name: string;
  set_code: string | null;
  image_small: string | null;
  image_normal: string | null;
  type_line: string | null;
  cmc: number | null;
  color_identity: string[];
  rarity: string | null;
  cheapest_price_usd: number | null;
  is_foil: boolean;
}
