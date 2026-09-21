import { parseTick } from "./state";
import type { GoldTrader } from "./trader";

/** Optional dry-run feed: poll a JSON tick URL when no EA is posting. */
export function startFeedPoller(trader: GoldTrader, url: string, intervalMs: number): () => void {
  let stopped = false;
  let warned = false;
  const tick = async () => {
    if (stopped) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = parseTick(await res.json());
      if (!parsed) throw new Error("unrecognized tick shape");
      await trader.onTick(parsed);
    } catch (err) {
      if (!warned) {
        warned = true;
        console.log(`gold feed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };
  const id = setInterval(() => { void tick(); }, intervalMs);
  void tick();
  return () => {
    stopped = true;
    clearInterval(id);
  };
}
