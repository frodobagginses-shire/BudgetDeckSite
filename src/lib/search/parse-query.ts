/**
 * F-6 — card search query parser.
 * Parses a subset of Scryfall syntax into structured filters:
 *   t:/type:          card type substring (AND across multiple)
 *   c:/ci:/id:        color identity letters (WUBRG); result = identity ⊆ given
 *   r:/rarity:        common|uncommon|rare|mythic (or first letter)
 *   mv:/cmc: + op     mana value comparisons: =, >=, <=, >, <
 * Anything else is treated as free-text name search.
 *
 * Notes: > and < are approximated with a tiny epsilon against inclusive bounds
 * (fine for the integer/half mana values MTG uses). Pure + deterministic so it
 * can be unit-tested without a database.
 */
export interface ParsedQuery {
  text: string | null;
  types: string[];
  colorIdentity: string[] | null;
  rarities: string[];
  mvMin: number | null;
  mvMax: number | null;
}

const RARITY_MAP: Record<string, string> = {
  c: "common",
  u: "uncommon",
  r: "rare",
  m: "mythic",
  common: "common",
  uncommon: "uncommon",
  rare: "rare",
  mythic: "mythic",
};

export function parseCardQuery(input: string): ParsedQuery {
  const out: ParsedQuery = {
    text: null,
    types: [],
    colorIdentity: null,
    rarities: [],
    mvMin: null,
    mvMax: null,
  };
  const free: string[] = [];

  for (const token of input.trim().split(/\s+/).filter(Boolean)) {
    let m: RegExpMatchArray | null;

    if ((m = token.match(/^(?:t|type):(.+)$/i))) {
      out.types.push(m[1].toLowerCase());
    } else if ((m = token.match(/^(?:c|ci|id|identity):(.+)$/i))) {
      const letters = m[1]
        .toUpperCase()
        .split("")
        .filter((ch) => "WUBRG".includes(ch));
      out.colorIdentity = Array.from(
        new Set([...(out.colorIdentity ?? []), ...letters])
      );
    } else if ((m = token.match(/^(?:r|rarity):(.+)$/i))) {
      const v = m[1].toLowerCase();
      const rar = RARITY_MAP[v] ?? RARITY_MAP[v[0]];
      if (rar && !out.rarities.includes(rar)) out.rarities.push(rar);
    } else if ((m = token.match(/^(?:mv|cmc)(>=|<=|>|<|=)(\d+(?:\.\d+)?)$/i))) {
      const op = m[1];
      const n = parseFloat(m[2]);
      const setMin = (x: number) =>
        (out.mvMin = out.mvMin == null ? x : Math.max(out.mvMin, x));
      const setMax = (x: number) =>
        (out.mvMax = out.mvMax == null ? x : Math.min(out.mvMax, x));
      if (op === "=") {
        setMin(n);
        setMax(n);
      } else if (op === ">=") {
        setMin(n);
      } else if (op === ">") {
        setMin(n + 0.001);
      } else if (op === "<=") {
        setMax(n);
      } else if (op === "<") {
        setMax(n - 0.001);
      }
    } else {
      free.push(token);
    }
  }

  out.text = free.length ? free.join(" ") : null;
  return out;
}
