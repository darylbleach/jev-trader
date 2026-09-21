import type { PositionSide } from "./policy";
import type { DummyCloseReason, DummyFill, DummyTicket, DummyTrade } from "./types";

export type DummySide = "buy" | "sell";

export interface DummyMt5Options {
  lot: number;
  slPoints: number;
  tpPoints: number;
  point: number;
  contractSize: number;
  historySize: number;
}

export function stopPrices(
  side: DummySide,
  openPrice: number,
  slPoints: number,
  tpPoints: number,
  point: number,
): { sl: number; tp: number } {
  const slDist = slPoints * point;
  const tpDist = tpPoints * point;
  if (side === "buy") return { sl: openPrice - slDist, tp: openPrice + tpDist };
  return { sl: openPrice + slDist, tp: openPrice - tpDist };
}

/** XAUUSD CFD: (close - open) * contract size * lots, flipped for sells. */
export function ticketPnl(
  side: DummySide,
  openPrice: number,
  closePrice: number,
  lots: number,
  contractSize: number,
): number {
  const dir = side === "buy" ? 1 : -1;
  return (closePrice - openPrice) * dir * contractSize * lots;
}

export function slTpHit(ticket: DummyTicket, mid: number): DummyCloseReason | null {
  if (ticket.side === "buy") {
    if (mid <= ticket.sl) return "sl";
    if (mid >= ticket.tp) return "tp";
    return null;
  }
  if (mid >= ticket.sl) return "sl";
  if (mid <= ticket.tp) return "tp";
  return null;
}

/**
 * In-process stand-in for JevLeader market tickets. Opens at mid, attaches SL/TP,
 * reverses by closing then opening, and exits on SL/TP touch.
 */
export class DummyMt5Account {
  private nextTicket = 1;
  private open: DummyTicket | null = null;
  private trades: DummyTrade[] = [];
  private realized = 0;
  private wins = 0;
  private losses = 0;
  private last: DummyTrade | null = null;

  constructor(private readonly opts: DummyMt5Options) {}

  get openTicket(): DummyTicket | null {
    return this.open;
  }

  get closedTrades(): readonly DummyTrade[] {
    return this.trades;
  }

  get lastTicket(): DummyTrade | null {
    return this.last;
  }

  get realizedPnl(): number {
    return this.realized;
  }

  get winCount(): number {
    return this.wins;
  }

  get lossCount(): number {
    return this.losses;
  }

  floatingPnl(mid: number): number {
    if (!this.open) return 0;
    return ticketPnl(this.open.side, this.open.openPrice, mid, this.open.lots, this.opts.contractSize);
  }

  snapshot(mid: number) {
    const realizedPnl = this.realized;
    const floatingPnl = this.floatingPnl(mid);
    return {
      enabled: true,
      openTicket: this.open,
      trades: this.trades.slice(),
      lastTicket: this.last,
      realizedPnl,
      floatingPnl,
      realizedUsd: realizedPnl,
      unrealizedUsd: floatingPnl,
      pnlUsd: realizedPnl + floatingPnl,
      wins: this.wins,
      losses: this.losses,
    };
  }

  /** Close at the SL or TP price if mid has touched either. */
  checkStops(mid: number, ts: number): DummyFill | null {
    if (!this.open) return null;
    const hit = slTpHit(this.open, mid);
    if (!hit) return null;
    const closePrice = hit === "sl" ? this.open.sl : this.open.tp;
    return this.closeAt(closePrice, hit, ts);
  }

  /**
   * Match JevLeader: if the standing position differs from the open ticket,
   * close the old one at mid (signal) then open the other side.
   */
  sync(want: PositionSide, mid: number, ts: number): DummyFill[] {
    const fills: DummyFill[] = [];
    const have: PositionSide = this.open?.side ?? "flat";
    if (have === want) return fills;
    if (this.open) {
      const closed = this.closeAt(mid, "signal", ts);
      if (closed) fills.push(closed);
    }
    if (want === "buy" || want === "sell") fills.push(this.openAt(want, mid, ts));
    return fills;
  }

  private openAt(side: DummySide, mid: number, ts: number): DummyFill {
    const { sl, tp } = stopPrices(side, mid, this.opts.slPoints, this.opts.tpPoints, this.opts.point);
    const ticket = this.nextTicket++;
    const lots = this.opts.lot;
    this.open = { ticket, side, lots, openPrice: mid, sl, tp, openTs: ts };
    return {
      ticket,
      side,
      lots,
      price: mid,
      symbol: "XAUUSD",
      kind: "open",
      openPrice: mid,
      sl,
      tp,
      simulated: true,
      ts,
    };
  }

  private closeAt(price: number, reason: DummyCloseReason, ts: number): DummyFill | null {
    const t = this.open;
    if (!t) return null;
    const pnl = ticketPnl(t.side, t.openPrice, price, t.lots, this.opts.contractSize);
    this.realized += pnl;
    const trade: DummyTrade = {
      ticket: t.ticket,
      side: t.side,
      lots: t.lots,
      openPrice: t.openPrice,
      sl: t.sl,
      tp: t.tp,
      closePrice: price,
      reason,
      pnl,
      openTs: t.openTs,
      closeTs: ts,
    };
    this.trades.push(trade);
    if (this.trades.length > this.opts.historySize) this.trades.shift();
    this.last = trade;
    if (pnl > 0) this.wins += 1;
    else if (pnl < 0) this.losses += 1;
    this.open = null;
    return {
      ticket: t.ticket,
      side: t.side,
      lots: t.lots,
      price,
      symbol: "XAUUSD",
      kind: "close",
      openPrice: t.openPrice,
      closePrice: price,
      sl: t.sl,
      tp: t.tp,
      reason,
      pnl,
      simulated: true,
      ts,
    };
  }
}
