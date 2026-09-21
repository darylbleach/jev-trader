import { goldConfig } from "./config";
import type { GoldTrader } from "./trader";
import type { GoldFeedKind } from "./types";
import { GOLD_WALK_FALLBACK_MID, demoTickFromMid, nextDemoMid } from "./walk";

export const GOLD_SPOT_URL = "https://api.gold-api.com/price/XAU";
export const GOLD_SPOT_FALLBACK_URL =
  "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1m&range=1d";

export interface LiveGoldState {
  mid: number | null;
  live: boolean;
}

export type SpotFetch = (input: string, init?: RequestInit) => Promise<Response>;

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

/** Read a USD-per-ounce mid from gold-api, a {price|mid} JSON tick, or a Yahoo chart. */
export function parseGoldSpotPrice(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const direct = num(o.price) ?? num(o.mid);
  if (isGoldMid(direct)) return direct;
  const bid = num(o.bid);
  const ask = num(o.ask);
  if (isGoldMid(bid) && isGoldMid(ask)) return (bid + ask) / 2;

  const chart = o.chart as
    | {
        result?: Array<{
          meta?: { regularMarketPrice?: number };
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        }>;
      }
    | undefined;
  const metaPrice = chart?.result?.[0]?.meta?.regularMarketPrice;
  if (isGoldMid(metaPrice)) return metaPrice;
  const closes = chart?.result?.[0]?.indicators?.quote?.[0]?.close;
  if (Array.isArray(closes)) {
    for (let i = closes.length - 1; i >= 0; i--) {
      const close = closes[i];
      if (isGoldMid(close)) return close;
    }
  }
  return null;
}

export async function fetchLiveGoldMid(opts?: {
  fetch?: SpotFetch;
  urls?: string[];
  timeoutMs?: number;
}): Promise<number | null> {
  const fetchFn = opts?.fetch ?? fetch;
  const urls = opts?.urls ?? [goldConfig.spotUrl || GOLD_SPOT_URL, GOLD_SPOT_FALLBACK_URL];
  const timeoutMs = opts?.timeoutMs ?? 4000;
  for (const url of urls) {
    try {
      const res = await fetchFn(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept: "application/json" },
      });
      if (!res.ok) continue;
      const mid = parseGoldSpotPrice(await res.json());
      if (mid !== null) return mid;
    } catch {
      // try the next source
    }
  }
  return null;
}

/**
 * Prefer a fresh live spot. If the fetch fails, hold the last live mid.
 * Walk only when no live quote has landed yet, so the page still ticks.
 */
export async function resolveGoldMid(
  state: LiveGoldState,
  opts?: { fetch?: SpotFetch; urls?: string[]; timeoutMs?: number },
): Promise<{ mid: number; live: boolean }> {
  const fetched = await fetchLiveGoldMid(opts);
  if (fetched !== null) return { mid: fetched, live: true };
  if (state.live && state.mid !== null) return { mid: state.mid, live: true };
  const fallback = state.mid ?? GOLD_WALK_FALLBACK_MID;
  return { mid: nextDemoMid(fallback), live: false };
}

export function feedKindFromLive(live: boolean, fallback: GoldFeedKind = "demo"): GoldFeedKind {
  return live ? "live" : fallback;
}

export async function seedGoldMid(opts?: { fetch?: SpotFetch; urls?: string[] }): Promise<number> {
  return (await fetchLiveGoldMid(opts)) ?? GOLD_WALK_FALLBACK_MID;
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
  let state: LiveGoldState = { mid: null, live: false };
  let lastFetch = 0;
  let lastKind: GoldFeedKind | null = null;

  const step = async () => {
    if (stopped) return;
    const now = Date.now();
    const stale = now - lastFetch >= refreshMs || state.mid === null;
    if (stale) {
      lastFetch = now;
      state = await resolveGoldMid(state, { fetch: opts?.fetch, urls: opts?.urls });
    } else if (!state.live && state.mid !== null) {
      state = { mid: nextDemoMid(state.mid), live: false };
    }
    const kind = feedKindFromLive(state.live);
    if (kind !== lastKind) {
      lastKind = kind;
      opts?.onSource?.(kind);
    }
    if (state.mid !== null) await trader.onTick(demoTickFromMid(state.mid));
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
