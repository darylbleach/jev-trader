import type { PositionSide } from "./policy";
import type { DummyTicket, DummyTrade, GoldTotals } from "./types";

/** Closed trades + session aggregates that must survive DO restarts and deploys. */
export const PROOF_STATE_VERSION = 1 as const;

export interface DummyMt5Persisted {
  nextTicket: number;
  open: DummyTicket | null;
  trades: DummyTrade[];
  realized: number;
  wins: number;
  losses: number;
  last: DummyTrade | null;
}

export interface GoldProofState {
  version: typeof PROOF_STATE_VERSION;
  savedAt: number;
  startedAt: number;
  seq: number;
  position: PositionSide;
  totals: Pick<GoldTotals, "ticks" | "decisions" | "lateTicks" | "fills" | "jevUsd">;
  dummy: DummyMt5Persisted | null;
}

export function emptyProofTotals(): GoldProofState["totals"] {
  return { ticks: 0, decisions: 0, lateTicks: 0, fills: 0, jevUsd: 0 };
}

function isSide(v: unknown): v is "buy" | "sell" {
  return v === "buy" || v === "sell";
}

function isPosition(v: unknown): v is PositionSide {
  return v === "buy" || v === "sell" || v === "flat";
}

function isReason(v: unknown): v is DummyTrade["reason"] {
  return v === "signal" || v === "sl" || v === "tp";
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function parseTicket(raw: unknown): DummyTicket | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const ticket = num(o.ticket);
  const lots = num(o.lots);
  const openPrice = num(o.openPrice);
  const sl = num(o.sl);
  const tp = num(o.tp);
  const openTs = num(o.openTs);
  if (!isSide(o.side) || ticket === null || lots === null || openPrice === null || sl === null || tp === null || openTs === null) {
    return null;
  }
  return { ticket, side: o.side, lots, openPrice, sl, tp, openTs };
}

function parseTrade(raw: unknown): DummyTrade | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const ticket = num(o.ticket);
  const lots = num(o.lots);
  const openPrice = num(o.openPrice);
  const sl = num(o.sl);
  const tp = num(o.tp);
  const closePrice = num(o.closePrice);
  const pnl = num(o.pnl);
  const openTs = num(o.openTs);
  const closeTs = num(o.closeTs);
  if (
    !isSide(o.side) ||
    !isReason(o.reason) ||
    ticket === null ||
    lots === null ||
    openPrice === null ||
    sl === null ||
    tp === null ||
    closePrice === null ||
    pnl === null ||
    openTs === null ||
    closeTs === null
  ) {
    return null;
  }
  return { ticket, side: o.side, lots, openPrice, sl, tp, closePrice, reason: o.reason, pnl, openTs, closeTs };
}

function parseDummy(raw: unknown): DummyMt5Persisted | null {
  if (raw === null) return null;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const nextTicket = num(o.nextTicket);
  const realized = num(o.realized);
  const wins = num(o.wins);
  const losses = num(o.losses);
  if (nextTicket === null || realized === null || wins === null || losses === null) return null;
  if (!Array.isArray(o.trades)) return null;
  const trades: DummyTrade[] = [];
  for (const row of o.trades) {
    const trade = parseTrade(row);
    if (!trade) return null;
    trades.push(trade);
  }
  const open = o.open == null ? null : parseTicket(o.open);
  if (o.open != null && !open) return null;
  const last = o.last == null ? null : parseTrade(o.last);
  if (o.last != null && !last) return null;
  return { nextTicket, open, trades, realized, wins, losses, last };
}

/** Accept only a well-formed proof blob. Bad or partial storage is ignored so the room can boot. */
export function parseProofState(raw: unknown): GoldProofState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== PROOF_STATE_VERSION) return null;
  const savedAt = num(o.savedAt);
  const startedAt = num(o.startedAt);
  const seq = num(o.seq);
  if (savedAt === null || startedAt === null || seq === null || !isPosition(o.position)) return null;
  if (!o.totals || typeof o.totals !== "object") return null;
  const t = o.totals as Record<string, unknown>;
  const ticks = num(t.ticks);
  const decisions = num(t.decisions);
  const lateTicks = num(t.lateTicks);
  const fills = num(t.fills);
  const jevUsd = num(t.jevUsd);
  if (ticks === null || decisions === null || lateTicks === null || fills === null || jevUsd === null) return null;
  const dummy = parseDummy(o.dummy);
  if (o.dummy !== null && dummy === null) return null;
  return {
    version: PROOF_STATE_VERSION,
    savedAt,
    startedAt,
    seq,
    position: o.position,
    totals: { ticks, decisions, lateTicks, fills, jevUsd },
    dummy,
  };
}
