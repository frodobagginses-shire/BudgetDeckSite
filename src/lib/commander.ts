/** Pure rules helpers for commander legality, partners, and singleton limits.
 * Operate on the subset of card fields we store. Degrades gracefully when
 * oracle_text / keywords are missing (pre-sync): commander legality falls back
 * to the type line, and singleton allows only basic lands. */

export interface RulesCard {
  name: string;
  type_line: string | null;
  oracle_text: string | null;
  keywords: string[] | null;
}

const lc = (s: string | null | undefined) => (s ?? "").toLowerCase();
const hasKw = (c: RulesCard, kw: string) =>
  (c.keywords ?? []).some((k) => k.toLowerCase() === kw.toLowerCase());
const eqName = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

export function isLegendaryCreature(c: RulesCard): boolean {
  const t = lc(c.type_line);
  return t.includes("legendary") && t.includes("creature");
}

export function isBackground(c: RulesCard): boolean {
  return lc(c.type_line).includes("background");
}

/** Can this card be a deck's (primary) commander on its own? */
export function canBeCommander(c: RulesCard): boolean {
  return (
    isLegendaryCreature(c) || lc(c.oracle_text).includes("can be your commander")
  );
}

function genericPartner(c: RulesCard): boolean {
  // Scryfall lists plain "Partner" as a keyword; "Partner with" is separate.
  if (hasKw(c, "Partner")) return true;
  const o = lc(c.oracle_text);
  return /\bpartner\b/.test(o) && !o.includes("partner with");
}

function partnerWithName(c: RulesCard): string | null {
  const m = lc(c.oracle_text).match(/partner with ([^\n.(]+)/);
  return m ? m[1].trim() : null;
}

function chooseBackground(c: RulesCard): boolean {
  return hasKw(c, "Choose a Background") || lc(c.oracle_text).includes("choose a background");
}
function friendsForever(c: RulesCard): boolean {
  return hasKw(c, "Friends forever") || lc(c.oracle_text).includes("friends forever");
}
function doctorsCompanion(c: RulesCard): boolean {
  return hasKw(c, "Doctor's companion") || lc(c.oracle_text).includes("doctor's companion");
}
function isDoctor(c: RulesCard): boolean {
  return lc(c.type_line).includes("time lord doctor");
}

/** May these two cards legally be a deck's two commanders together? */
export function partnersAllowed(a: RulesCard, b: RulesCard): boolean {
  if (genericPartner(a) && genericPartner(b)) return true;

  const an = partnerWithName(a);
  const bn = partnerWithName(b);
  if (an && eqName(an, b.name)) return true;
  if (bn && eqName(bn, a.name)) return true;

  if (chooseBackground(a) && isBackground(b)) return true;
  if (chooseBackground(b) && isBackground(a)) return true;

  if (friendsForever(a) && friendsForever(b)) return true;

  if (doctorsCompanion(a) && isDoctor(b)) return true;
  if (doctorsCompanion(b) && isDoctor(a)) return true;

  return false;
}

/** Cards allowed in any quantity (basics + "any number of cards named …"). */
export function unlimitedCopies(c: RulesCard): boolean {
  const t = lc(c.type_line);
  if (t.includes("basic") && t.includes("land")) return true;
  return /a deck can have (any number of|up to [\w-]+) cards named/.test(
    lc(c.oracle_text)
  );
}

/** Max copies of a card for a format (before "unlimited" exceptions). */
export function maxCopies(format: string): number {
  return format === "commander" ? 1 : 4;
}
