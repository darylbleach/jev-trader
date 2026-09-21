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

export type DummyCloseReason = "signal" | "sl" | "tp";

export interface DummyTicket {
  ticket: number;
  side: "buy" | "sell";
  lots: number;
  openPrice: number;
  sl: number;
  tp: number;
  openTs: number;
}

export interface DummyTrade {
  ticket: number;
  side: "buy" | "sell";
  lots: number;
  openPrice: number;
  sl: number;
  tp: number;
  closePrice: number;
  reason: DummyCloseReason;
  pnl: number;
  openTs: number;
  closeTs: number;
}

export interface DummyPnL {
  realizedUsd: number;
  unrealizedUsd: number;
  totalUsd: number;
  wins: number;
  losses: number;
}

export interface GoldFill {
  ticket: number | string;
  side: "buy" | "sell";
  lots: number;
  price: number;
  symbol?: string;
  ts?: number;
  kind?: "open" | "close";
  openPrice?: number;
  closePrice?: number;
  sl?: number;
  tp?: number;
  reason?: DummyCloseReason;
  pnl?: number;
  simulated?: boolean;
}

export type DummyFill = GoldFill & {
  ticket: number;
  kind: "open" | "close";
  openPrice: number;
  sl: number;
  tp: number;
  simulated: true;
};

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
  pnl?: DummyPnL;
  lastTicket?: DummyTrade | null;
}

export interface GoldTotals {
  ticks: number;
  decisions: number;
  lateTicks: number;
  fills: number;
  jevUsd: number;
  realizedUsd: number;
  unrealizedUsd: number;
  pnlUsd: number;
  wins: number;
  losses: number;
}
