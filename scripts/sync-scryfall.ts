/**
 * F-3 — Scryfall nightly sync
 * --------------------------------------------------------------------------
 * Streams the Scryfall "default_cards" bulk file and upserts every paper
 * printing into the `cards` table. Idempotent (upsert on scryfall_id), so a
 * re-run refreshes prices without creating duplicate rows.
 *
 * Run:  npm run sync:scryfall
 * Env:  SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 *
 * Scryfall etiquette: we send a descriptive User-Agent + Accept header and make
 * only two requests (the bulk index + one file download), well under their
 * rate limits. Bulk data is what they ask heavy consumers to use.
 */
import { createClient } from "@supabase/supabase-js";
import { parser } from "stream-json";
import { streamArray } from "stream-json/streamers/StreamArray";
import { pipeline } from "node:stream/promises";
import { Readable, Writable } from "node:stream";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_AGENT =
  "BudgetDeckSite/1.0 (+https://github.com/frodobagginses-shire/BudgetDeckSite)";
const BATCH_SIZE = 500;

// Non-playable / non-addable layouts we don't want polluting search or pricing.
const SKIP_LAYOUTS = new Set([
  "token",
  "double_faced_token",
  "emblem",
  "art_series",
  "vanguard",
  "scheme",
  "planar",
  "augment",
  "host",
]);

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing env: set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

interface ScryfallCard {
  id: string;
  oracle_id?: string;
  name: string;
  set?: string;
  collector_number?: string;
  type_line?: string;
  cmc?: number;
  color_identity?: string[];
  rarity?: string;
  layout?: string;
  image_uris?: { normal?: string; small?: string; art_crop?: string };
  card_faces?: {
    image_uris?: { normal?: string; small?: string; art_crop?: string };
  }[];
  prices?: { usd?: string | null; usd_foil?: string | null };
  games?: string[];
  legalities?: Record<string, string>;
  released_at?: string;
  digital?: boolean;
  edhrec_rank?: number;
}

interface CardRow {
  scryfall_id: string;
  oracle_id: string;
  name: string;
  set_code: string | null;
  collector_number: string | null;
  type_line: string | null;
  cmc: number | null;
  color_identity: string[];
  rarity: string | null;
  layout: string | null;
  image_normal: string | null;
  image_small: string | null;
  image_art_crop: string | null;
  price_usd: number | null;
  price_usd_foil: number | null;
  games: string[];
  legalities: Record<string, string>;
  released_at: string | null;
  edhrec_rank: number | null;
}

const num = (v?: string | null): number | null =>
  v == null || v === "" ? null : Number(v);

function toRow(c: ScryfallCard): CardRow | null {
  if (!c.oracle_id) return null; // tokens / non-cards without an oracle id
  if (c.digital) return null; // Arena/MTGO-only printings
  if (!(c.games ?? []).includes("paper")) return null; // paper formats only
  if (c.layout && SKIP_LAYOUTS.has(c.layout)) return null;

  const img = c.image_uris ?? c.card_faces?.[0]?.image_uris ?? {};
  return {
    scryfall_id: c.id,
    oracle_id: c.oracle_id,
    name: c.name,
    set_code: c.set ?? null,
    collector_number: c.collector_number ?? null,
    type_line: c.type_line ?? null,
    cmc: c.cmc ?? null,
    color_identity: c.color_identity ?? [],
    rarity: c.rarity ?? null,
    layout: c.layout ?? null,
    image_normal: img.normal ?? null,
    image_small: img.small ?? null,
    image_art_crop: img.art_crop ?? null,
    price_usd: num(c.prices?.usd),
    price_usd_foil: num(c.prices?.usd_foil),
    games: c.games ?? [],
    legalities: c.legalities ?? {},
    released_at: c.released_at ?? null,
    edhrec_rank: c.edhrec_rank ?? null,
  };
}

async function getBulkDownloadUrl(): Promise<string> {
  const res = await fetch("https://api.scryfall.com/bulk-data", {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`bulk-data index failed: HTTP ${res.status}`);
  const json = (await res.json()) as { data: { type: string; download_uri: string }[] };
  const def = json.data.find((d) => d.type === "default_cards");
  if (!def) throw new Error("default_cards bulk type not found in index");
  return def.download_uri;
}

async function upsertBatch(rows: CardRow[]): Promise<void> {
  const { error } = await supabase
    .from("cards")
    .upsert(rows, { onConflict: "scryfall_id" });
  if (error) throw new Error(`upsert failed: ${error.message}`);
}

async function main(): Promise<void> {
  const started = Date.now();
  const url = await getBulkDownloadUrl();
  console.log(`[sync] downloading default_cards bulk: ${url}`);

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok || !res.body) {
    throw new Error(`bulk download failed: HTTP ${res.status}`);
  }

  let processed = 0;
  let upserted = 0;
  let skipped = 0;
  let errors = 0;
  let batch: CardRow[] = [];

  const flush = async (): Promise<void> => {
    if (batch.length === 0) return;
    const toSend = batch;
    batch = [];
    try {
      await upsertBatch(toSend);
      upserted += toSend.length;
    } catch (e) {
      errors++;
      console.error(`[sync] ${(e as Error).message}`);
    }
  };

  const sink = new Writable({
    objectMode: true,
    write(chunk: { value: ScryfallCard }, _enc, cb) {
      processed++;
      const row = toRow(chunk.value);
      if (!row) {
        skipped++;
        cb();
        return;
      }
      batch.push(row);
      if (batch.length >= BATCH_SIZE) {
        if (processed % 20000 < BATCH_SIZE) {
          console.log(`[sync] processed ${processed}, upserted ${upserted}…`);
        }
        flush().then(() => cb(), cb);
        return;
      }
      cb();
    },
  });

  const nodeStream = Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]);
  await pipeline(nodeStream, parser(), streamArray(), sink);
  await flush();

  // F-4: recompute cheapest printing per oracle card from the freshly synced data.
  // Non-fatal: the card data (the critical part) is already saved, so a slow or
  // failed refresh is a warning — it does not fail the job. Budget prices may be
  // stale until the next successful refresh.
  console.log("[sync] refreshing card_cheapest…");
  const { error: rpcErr } = await supabase.rpc("refresh_card_cheapest");
  if (rpcErr) {
    console.warn(
      `[sync] WARNING: card_cheapest refresh failed (${rpcErr.message}). Card data updated; cheapest prices may be stale until the next run.`
    );
  } else {
    console.log("[sync] card_cheapest refreshed.");
  }

  const secs = ((Date.now() - started) / 1000).toFixed(0);
  console.log(
    `[sync] done in ${secs}s — processed ${processed}, upserted ${upserted}, skipped ${skipped}, batch-errors ${errors}`
  );
  if (errors > 0) process.exit(1);
}

main().catch((e) => {
  console.error("[sync] fatal:", e);
  process.exit(1);
});
