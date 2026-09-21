import { goldConfig } from "./config";
import type { GoldTrader } from "./trader";
import type { GoldFeedKind } from "./types";
import type { GoldTick } from "./state";
import { GOLD_WALK_FALLBACK_MID, demoTickFromMid, nextDemoMid } from "./walk";

/** Live XAUUSD bid/ask. This book reprints many times a minute. */
export const GOLD_BOOK_URL =
  "https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD";
/** Single printed mid. It often sits still for most of a minute, then jumps. */
export const GOLD_SPOT_URL = "https://api.gold-api.com/price/XAU";
export const GOLD_SPOT_FALLBACK_URL =
  "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1m&range=1d";

export interface LiveGoldState {
  mid: number | null;
  live: boolean;
  bid?: number | null;
  ask?: number | null;
}

/** Clock the 1s poller and the Cloudflare GoldRoom alarm share. */
export interface LiveGoldClock extends LiveGoldState {
  lastFetch: number;
}

export interface SpotQuote {
  bid: number | null;
  ask: number | null;
  mid: number;
  /** True when bid and ask came from a live book, not a single printed mid. */
  book: boolean;
}

export type SpotFetch = (input: string, init?: RequestInit) => Promise<Response>;

const BOOK_PROFILES = ["elite", "prime", "premium", "standard"] as const;

function isGoldMid(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 100 && n < 100_000;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function bookQuote(bid: number, ask: number): SpotQuote | null {
  if (!isGoldMid(bid) || !isGoldMid(ask) || ask < bid) return null;
  return { bid, ask, mid: (bid + ask) / 2, book: true };
}

/** Swissquote public XAU/USD book. Prefer the tighter profile on SwissquoteLtd. */
export function parseSwissquoteBook(body: unknown): SpotQuote | null {
  if (!Array.isArray(body)) return null;
  const rows = body as Array<{
    topo?: { platform?: string };
    spreadProfilePrices?: Array<{ spreadProfile?: string; bid?: number; ask?: number }>;
  }>;
  const platform = rows.find((row) => row.topo?.platform === "SwissquoteLtd") ?? rows[0];
  const prices = platform?.spreadProfilePrices ?? [];
  const pick = BOOK_PROFILES.map((name) => prices.find((row) => row.spreadProfile === name)).find(Boolean) ?? prices[0];
  if (!pick) return null;
  const bid = num(pick.bid);
  const ask = num(pick.ask);
  if (bid === null || ask === null) return null;
  return bookQuote(bid, ask);
}

/** Read a live book, a {price|mid} print, or a Yahoo chart. A book wins over a lone mid. */
export function parseGoldSpotQuote(body: unknown): SpotQuote | null {
  const book = parseSwissquoteBook(body);
  if (book) return book;
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const o = body as Record<string, unknown>;
  const bid = num(o.bid);
  const ask = num(o.ask);
  if (bid !== null && ask !== null) {
    const quoted = bookQuote(bid, ask);
    if (quoted) return quoted;
  }
  const direct = num(o.price) ?? num(o.mid);
  if (isGoldMid(direct)) return { bid: null, ask: null, mid: direct, book: false };

  const chart = o.chart as
    | {
        result?: Array<{
          meta?: { regularMarketPrice?: number };
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        }>;
      }
    | undefined;
  const metaPrice = chart?.result?.[0]?.meta?.regularMarketPrice;
  if (isGoldMid(metaPrice)) return { bid: null, ask: null, mid: metaPrice, book: false };
  const closes = chart?.result?.[0]?.indicators?.quote?.[0]?.close;
  if (Array.isArray(closes)) {
    for (let i = closes.length - 1; i >= 0; i--) {
      const close = closes[i];
      if (isGoldMid(close)) return { bid: null, ask: null, mid: close, book: false };
    }
  }
  return null;
}

/** Mid only. Kept so older callers and tests still read a printed price. */
export function parseGoldSpotPrice(body: unknown): number | null {
  return parseGoldSpotQuote(body)?.mid ?? null;
}

/** Book feed first, then the configured URL, then a printed mid, then Yahoo. */
export function goldSpotUrls(override?: string): string[] {
  const configured = override || goldConfig.spotUrl || GOLD_BOOK_URL;
  const urls = [GOLD_BOOK_URL, configured, GOLD_SPOT_URL, GOLD_SPOT_FALLBACK_URL];
  return urls.filter((url, index) => url.length > 0 && urls.indexOf(url) === index);
}

export function tickFromQuote(quote: SpotQuote): GoldTick {
  if (quote.book && quote.bid !== null && quote.ask !== null) {
    return { bid: quote.bid, ask: quote.ask, volume: 1 };
  }
  return demoTickFromMid(quote.mid);
}

export async function fetchLiveGoldQuote(opts?: {
  fetch?: SpotFetch;
  urls?: string[];
  timeoutMs?: number;
}): Promise<SpotQuote | null> {
  const fetchFn = opts?.fetch ?? fetch;
  const urls = opts?.urls ?? goldSpotUrls();
  const timeoutMs = opts?.timeoutMs ?? 4000;
  let printed: SpotQuote | null = null;
  for (const url of urls) {
    try {
      const res = await fetchFn(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          accept: "application/json",
          "user-agent": "jev-gold-demo",
        },
      });
      if (!res.ok) continue;
      const quote = parseGoldSpotQuote(await res.json());
      if (!quote) continue;
      if (quote.book) return quote;
      if (!printed) printed = quote;
    } catch {
      // try the next source
    }
  }
  return printed;
}

export async function fetchLiveGoldMid(opts?: {
  fetch?: SpotFetch;
  urls?: string[];
  timeoutMs?: number;
}): Promise<number | null> {
  return (await fetchLiveGoldQuote(opts))?.mid ?? null;
}

/**
 * Prefer a fresh live book. If the fetch fails, hold the last live quote.
 * Walk only when no live quote has landed yet, so the page still ticks.
 */
export async function resolveGoldMid(
  state: LiveGoldState,
  opts?: { fetch?: SpotFetch; urls?: string[]; timeoutMs?: number },
): Promise<{ mid: number; bid: number | null; ask: number | null; live: boolean }> {
  const fetched = await fetchLiveGoldQuote(opts);
  if (fetched !== null) {
    return { mid: fetched.mid, bid: fetched.bid, ask: fetched.ask, live: true };
  }
  if (state.live && state.mid !== null) {
    return { mid: state.mid, bid: state.bid ?? null, ask: state.ask ?? null, live: true };
  }
  const fallback = state.mid ?? GOLD_WALK_FALLBACK_MID;
  return { mid: nextDemoMid(fallback), bid: null, ask: null, live: false };
}

export function feedKindFromLive(live: boolean, fallback: GoldFeedKind = "demo"): GoldFeedKind {
  return live ? "live" : fallback;
}

export async function seedGoldMid(opts?: { fetch?: SpotFetch; urls?: string[] }): Promise<number> {
  return (await fetchLiveGoldMid(opts)) ?? GOLD_WALK_FALLBACK_MID;
}

/**
 * One refresh / hold / walk step. Local `bun run gold` and GoldRoom both call this
 * so Cloudflare cannot keep a leftover walk-only or sticky-print policy.
 */
export async function stepLiveGoldQuote(
  clock: LiveGoldClock,
  now: number,
  opts?: { fetch?: SpotFetch; urls?: string[]; refreshMs?: number },
): Promise<LiveGoldClock> {
  const refreshMs = opts?.refreshMs && opts.refreshMs > 0 ? opts.refreshMs : goldConfig.spotRefreshMs;
  const missing = clock.mid === null || clock.mid <= 0;
  const stale = now - clock.lastFetch >= refreshMs || missing;
  if (stale) {
    const next = await resolveGoldMid(
      { mid: missing ? null : clock.mid, live: clock.live, bid: clock.bid, ask: clock.ask },
      { fetch: opts?.fetch, urls: opts?.urls },
    );
    return { mid: next.mid, bid: next.bid, ask: next.ask, live: next.live, lastFetch: now };
  }
  if (!clock.live && clock.mid !== null) {
    return { mid: nextDemoMid(clock.mid), bid: null, ask: null, live: false, lastFetch: clock.lastFetch };
  }
  return clock;
}

export function startLiveGoldPoller(
  trader: GoldTrader,
  intervalMs: number,
  opts?: {
    fetch?: SpotFetch;
    urls?: string[];
    refreshMs?: number;
    onSource?: (feed: GoldFeedKind) => void;
  },
): () => void {
  const refreshMs = opts?.refreshMs && opts.refreshMs > 0 ? opts.refreshMs : goldConfig.spotRefreshMs;
  let stopped = false;
  let clock: LiveGoldClock = { mid: null, bid: null, ask: null, live: false, lastFetch: 0 };
  let lastKind: GoldFeedKind | null = null;

  const step = async () => {
    if (stopped) return;
    clock = await stepLiveGoldQuote(clock, Date.now(), {
      fetch: opts?.fetch,
      urls: opts?.urls,
      refreshMs,
    });
    const kind = feedKindFromLive(clock.live);
    if (kind !== lastKind) {
      lastKind = kind;
      opts?.onSource?.(kind);
    }
    if (clock.mid !== null) {
      const quote: SpotQuote = {
        mid: clock.mid,
        bid: clock.bid ?? null,
        ask: clock.ask ?? null,
        book: clock.bid != null && clock.ask != null,
      };
      await trader.onTick(tickFromQuote(quote));
    }
  };

  const id = setInterval(() => {
    void step();
  }, intervalMs);
  void step();
  return () => {
    stopped = true;
    clearInterval(id);
  };
}
