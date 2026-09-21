import { goldConfig } from "./config";
import type { GoldTrader } from "./trader";

const FALLBACK_MID = 2650;

export async function seedGoldMid(): Promise<number> {
  try {
    const res = await fetch("https://api.gold-api.com/price/XAU", { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const body = await res.json() as { price?: number };
      if (typeof body.price === "number" && body.price > 100 && body.price < 100_000) return body.price;
    }
  } catch {
    // demo still runs from the fallback mid
  }
  return FALLBACK_MID;
}

/** Random-walk ticks around a seed mid so the demo moves without an EA or vendor feed. */
export function startDemoWalk(trader: GoldTrader, intervalMs: number, seed: number): () => void {
  let mid = seed;
  const halfSpread = Math.min(20, goldConfig.maxSpreadPips * 0.5) * goldConfig.point / 2;
  const step = () => {
    mid = Math.max(100, mid + (Math.random() - 0.5) * 0.8);
    void trader.onTick({
      bid: mid - halfSpread,
      ask: mid + halfSpread,
      volume: 1 + Math.floor(Math.random() * 8),
    });
  };
  const id = setInterval(step, intervalMs);
  step();
  return () => clearInterval(id);
}
