import type { GoldAction } from "./model";
import type { PositionSide } from "./policy";

export interface GoldSignal {
  ts: number;
  seq: number;
  mid: number;
  bid: number;
  ask: number;
  spreadPips: number;
  action: GoldAction;
  probabilities: Record<GoldAction, number>;
  latencyMs: number;
  late: boolean;
  sim: boolean;
  lot: number;
  slPoints: number;
  tpPoints: number;
  position: PositionSide;
  reverse: boolean;
  spreadOk: boolean;
}

export interface GoldFill {
  ticket: number | string;
  side: "buy" | "sell";
  lots: number;
  price: number;
  symbol?: string;
  ts?: number;
}

export interface GoldEvent {
  ts: number;
  mid: number;
  bid: number;
  ask: number;
  spreadPips: number;
  decision: GoldSignal | null;
  fill: GoldFill | null;
  late: boolean;
  lateReason?: "busy" | "interval";
}

export interface GoldTotals {
  ticks: number;
  decisions: number;
  lateTicks: number;
  fills: number;
  jevUsd: number;
}
