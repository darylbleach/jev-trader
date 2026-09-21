import { midPrice, spreadPips } from "./policy";

export interface GoldTick {
  bid: number;
  ask: number;
  volume?: number;
  ts?: number;
}

export interface GoldState {
  market: "XAUUSD";
  ts: number;
  horizonMs: number;
  intervalMs: number;
  bid: number;
  ask: number;
  mid: number;
  spreadPips: number;
  volume: number;
  returnsPips: { last1: number; last5: number; last20: number; last100: number };
  recentMids: string;
  allowed: { buy: boolean; sell: boolean };
}

const MAX_MIDS = 200;

export function parseTick(body: unknown): GoldTick | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const bid = num(o.bid);
  const ask = num(o.ask);
  if (bid !== null && ask !== null && bid > 0 && ask > 0 && ask >= bid) {
    return { bid, ask, volume: num(o.volume) ?? 0, ts: num(o.ts) ?? undefined };
  }
  const price = num(o.mid) ?? num(o.price);
  if (price !== null && price > 0) {
    return { bid: price, ask: price, volume: num(o.volume) ?? 0, ts: num(o.ts) ?? undefined };
  }
  return null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function returnPips(mids: readonly number[], steps: number, point: number): number {
  if (mids.length < steps + 1 || !(point > 0)) return 0;
  const newest = mids[mids.length - 1];
  const older = mids[mids.length - 1 - steps];
  if (newest === undefined || older === undefined) return 0;
  return (newest - older) / point;
}

export class MidRing {
  private mids: number[] = [];

  push(mid: number): void {
    this.mids.push(mid);
    if (this.mids.length > MAX_MIDS) this.mids.shift();
  }

  get values(): readonly number[] {
    return this.mids;
  }

  build(tick: GoldTick, opts: { ts: number; horizonMs: number; intervalMs: number; point: number; maxSpreadPips: number }): GoldState {
    const mid = midPrice(tick.bid, tick.ask);
    const spread = spreadPips(tick.bid, tick.ask, opts.point);
    const spreadOk = spread <= opts.maxSpreadPips;
    const sample = this.mids.filter((_, i) => i % 5 === this.mids.length % 5 || i >= this.mids.length - 1);
    const shown = (sample.length > 0 ? sample : this.mids).slice(-20);
    return {
      market: "XAUUSD",
      ts: opts.ts,
      horizonMs: opts.horizonMs,
      intervalMs: opts.intervalMs,
      bid: tick.bid,
      ask: tick.ask,
      mid,
      spreadPips: spread,
      volume: tick.volume ?? 0,
      returnsPips: {
        last1: returnPips(this.mids, 1, opts.point),
        last5: returnPips(this.mids, 5, opts.point),
        last20: returnPips(this.mids, 20, opts.point),
        last100: returnPips(this.mids, 100, opts.point),
      },
      recentMids: shown.map((p) => p.toFixed(2)).join(" "),
      allowed: { buy: spreadOk, sell: spreadOk },
    };
  }
}
