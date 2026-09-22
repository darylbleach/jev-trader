import type { DummyTrade } from "./types";

export type DummyPauseReason = "drawdown" | "floor" | "manual";

export interface DummyPauseGate {
  pause: boolean;
  reason: DummyPauseReason | null;
}

export interface DummyPauseInput {
  /** GOLD_DEMO. Production (false) never pauses dummy entries. */
  demo: boolean;
  realizedUsd: number;
  /** Highest realized P/L seen this session (can be 0 at start). */
  realizedPeak: number;
  /**
   * Negative USD allowed below the session peak before new entries stop.
   * `-20` means pause at peak minus $20. `null` disables the peak gate.
   */
  pauseDrawdownUsd: number | null;
  /**
   * Absolute realized floor. `-80` means pause at or below -$80 even after resume.
   * `null` disables the hard floor.
   */
  pauseFloorUsd: number | null;
}

/**
 * Session peak from closed dummy tickets. Starts at 0 so a first-loss hole
 * still measures from flat, not from the first print.
 */
export function realizedPeakFromTrades(trades: readonly Pick<DummyTrade, "pnl">[]): number {
  let run = 0;
  let peak = 0;
  for (const trade of trades) {
    run += trade.pnl;
    if (run > peak) peak = run;
  }
  return peak;
}

/**
 * Demo-only dummy entry pause. Jev still decides; the caller just stays flat
 * instead of opening a new ticket. Open tickets still run to SL/TP.
 *
 * Two gates, either one is enough:
 * - peak drawdown: realized <= peak + pauseDrawdownUsd (default peak -$20)
 * - hard floor: realized <= pauseFloorUsd (default -$80)
 */
export function shouldPauseDummyEntries(input: DummyPauseInput): DummyPauseGate {
  if (!input.demo) return { pause: false, reason: null };
  if (input.pauseFloorUsd !== null && input.realizedUsd <= input.pauseFloorUsd) {
    return { pause: true, reason: "floor" };
  }
  if (
    input.pauseDrawdownUsd !== null &&
    input.realizedUsd <= input.realizedPeak + input.pauseDrawdownUsd
  ) {
    return { pause: true, reason: "drawdown" };
  }
  return { pause: false, reason: null };
}
