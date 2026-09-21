import { goldConfig } from "./config";
import type { GoldTick } from "./state";
import type { GoldTrader } from "./trader";

export const GOLD_WALK_FALLBACK_MID = 2650;

/** @deprecated Prefer `seedGoldMid` / `resolveGoldMid` in `./spot`. Kept for the walk fallback. */
export async function seedGoldMid(): Promise<number> {
  try {
    const res = await fetch("https://api.gold-api.com/price/XAU", { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const body = await res.json() as { price?: number };
      if (typeof body.price === "number" && body.price > 100 && body.price < 100_000) return body.price;
    }
  } catch {
    // walk still runs from the fallback mid
  }
  return GOLD_WALK_FALLBACK_MID;
}

export function nextDemoMid(mid: number): number {
  return Math.max(100, mid + (Math.random() - 0.5) * 0.8);
}

export function demoTickFromMid(mid: number): GoldTick {
  const halfSpread = Math.min(20, goldConfig.maxSpreadPips * 0.5) * goldConfig.point / 2;
  return {
    bid: mid - halfSpread,
    ask: mid + halfSpread,
    volume: 1 + Math.floor(Math.random() * 8),
  };
}

/** Last-resort random walk when no live gold spot can be fetched. */
export function startDemoWalk(trader: GoldTrader, intervalMs: number, seed: number): () => void {
  let mid = seed;
  const step = () => {
    mid = nextDemoMid(mid);
    void trader.onTick(demoTickFromMid(mid));
  };
  const id = setInterval(step, intervalMs);
  step();
  return () => clearInterval(id);
}
