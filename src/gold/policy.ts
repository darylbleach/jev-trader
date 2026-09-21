export type PositionSide = "buy" | "sell" | "flat";
export type SignalSide = "buy" | "sell";

/**
 * Netting-style leader policy. Flat opens the signal side. Same side holds.
 * Opposite signal reverses when `reverse` is true, otherwise flattens.
 */
export function nextPosition(current: PositionSide, signal: SignalSide, reverse: boolean): PositionSide {
  if (current === "flat") return signal;
  if (current === signal) return current;
  return reverse ? signal : "flat";
}

/**
 * An open scalp stays on until stop or take profit.
 * A flat book takes the latest buy or sell.
 */
export function holdScalp(current: PositionSide, signal: SignalSide): PositionSide {
  if (current === "flat") return signal;
  return current;
}

export interface LotScaleInput {
  leaderLot: number;
  leaderEquity: number;
  followerEquity: number;
  lotMult: number;
  minLot: number;
  maxLot: number;
  lotStep: number;
}

/** Round down to `lotStep`, then clamp to [minLot, maxLot]. Zero or invalid inputs yield 0. */
export function scaleLots(input: LotScaleInput): number {
  const { leaderLot, leaderEquity, followerEquity, lotMult, minLot, maxLot, lotStep } = input;
  if (!(leaderLot > 0) || !(leaderEquity > 0) || !(followerEquity > 0) || !(lotMult > 0)) return 0;
  if (!(lotStep > 0) || !(maxLot > 0)) return 0;
  const raw = lotMult * leaderLot * (followerEquity / leaderEquity);
  const stepped = Math.floor(raw / lotStep + 1e-12) * lotStep;
  const rounded = Number(stepped.toFixed(8));
  if (rounded < minLot) return 0;
  return Math.min(maxLot, rounded);
}

export function spreadPips(bid: number, ask: number, point: number): number {
  if (!(point > 0) || !(bid > 0) || !(ask > 0)) return Number.POSITIVE_INFINITY;
  return (ask - bid) / point;
}

export function midPrice(bid: number, ask: number): number {
  return (bid + ask) / 2;
}

/**
 * EA rule for stop and take-profit distance: use the input if it is > 0, else the
 * signal, else the hardcoded default. Never returns 0.
 */
export function resolveExitPoints(input: number, signal: number, fallback: number): number {
  const pick = input > 0 ? input : signal > 0 ? signal : fallback;
  if (!Number.isFinite(pick) || pick <= 0) return Math.max(1, Math.floor(fallback) || 1);
  return Math.floor(pick);
}

/** Raise SL/TP points to SYMBOL_TRADE_STOPS_LEVEL so the broker does not reject the order. */
export function clampStopsLevel(points: number, stopsLevel: number): number {
  const stops = Number.isFinite(stopsLevel) && stopsLevel > 0 ? Math.floor(stopsLevel) : 0;
  const pts = Number.isFinite(points) ? Math.floor(points) : 0;
  return Math.max(1, Math.max(stops, pts));
}
