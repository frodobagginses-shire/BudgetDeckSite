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
  banner_scryfall_id: string | null;
  banner_pos_x: number;
  banner_pos_y: number;
  archetypes: string[];
  record_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeckRecord {
  wins: number;
  losses: number;
  draws: number;
  beat: string[];
  lost_to: string[];
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
  mana_cost: string | null;
  cmc: number | null;
  color_identity: string[];
  rarity: string | null;
  set_code: string | null;
  collector_number: string | null;
  board: Board;
  quantity: number;
  counts_toward_budget: boolean;
  unit_cheapest: number | null;
  unit_bling: number | null;
  line_cheapest: number | null;
  line_bling: number | null;
}

export interface ArticleSummary {
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  featured_cards: string[];
  author_id: string | null;
  published_at: string | null;
  is_featured?: boolean;
}

export interface BrowseDeck {
  id: string;
  name: string;
  game_format: string;
  threshold_amount: number | null;
  owner_handle: string | null;
  budget_price: number;
  card_count: number;
  like_count: number;
  updated_at: string;
}

export interface LockIn {
  budget_price: number;
  bling_price: number | null;
  locked_at: string;
  kind: "creator" | "visitor";
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
  edhrec_rank?: number | null;
  legal?: boolean;
  in_identity?: boolean;
}
