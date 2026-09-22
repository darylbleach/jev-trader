import type { PositionSide } from "./policy";
import type { DummyMt5Persisted } from "./proof-state";
import type { DummyCloseReason, DummyFill, DummyTicket, DummyTrade } from "./types";

export type DummySide = "buy" | "sell";

/** Live book used for bid/ask fills and exit-side stop checks. */
export interface DummyBook {
  bid: number;
  ask: number;
}

export interface DummyMt5Options {
  lot: number;
  slPoints: number;
  tpPoints: number;
  point: number;
  contractSize: number;
  historySize: number;
  /** Hold a reverse until mid has moved at least this many points from the open. Default 1. */
  minReversePoints?: number;
}

/** True when the live mid has moved enough to justify a dummy reverse close. */
export function dummyReverseAllowed(
  openPrice: number,
  mid: number,
  minPoints: number,
  point: number,
): boolean {
  if (!(point > 0) || !(minPoints > 0)) return true;
  return Math.abs(mid - openPrice) >= minPoints * point - 1e-9;
}

/** Buy opens at ask; sell opens at bid. */
export function fillPrice(side: DummySide, book: DummyBook): number {
  return side === "buy" ? book.ask : book.bid;
}

/** Longs mark/exit on bid; shorts mark/exit on ask. */
export function exitPrice(side: DummySide, book: DummyBook): number {
  return side === "buy" ? book.bid : book.ask;
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

/**
 * Judge stops on the exit side of the book: bid for longs, ask for shorts.
 * That matches a market close (sell to bid / buy to ask).
 */
export function slTpHit(ticket: DummyTicket, book: DummyBook): DummyCloseReason | null {
  const px = exitPrice(ticket.side, book);
  if (ticket.side === "buy") {
    if (px <= ticket.sl) return "sl";
    if (px >= ticket.tp) return "tp";
    return null;
  }
  if (px >= ticket.sl) return "sl";
  if (px <= ticket.tp) return "tp";
  return null;
}

/**
 * In-process stand-in for JevLeader market tickets. Opens buy at ask / sell at bid,
 * attaches SL/TP from that fill, and exits when the exit side touches SL/TP.
 * An opposite side does not scratch the open ticket.
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

  /** Snapshot for Durable Object / file persistence. Survives process and DO restarts. */
  exportState(): DummyMt5Persisted {
    return {
      nextTicket: this.nextTicket,
      open: this.open ? { ...this.open } : null,
      trades: this.trades.map((t) => ({ ...t })),
      realized: this.realized,
      wins: this.wins,
      losses: this.losses,
      last: this.last ? { ...this.last } : null,
    };
  }

  /** Restore closed trades, open ticket, and aggregates from durable storage. */
  hydrate(state: DummyMt5Persisted): void {
    this.nextTicket = state.nextTicket;
    this.open = state.open ? { ...state.open } : null;
    this.trades = state.trades.map((t) => ({ ...t }));
    this.realized = state.realized;
    this.wins = state.wins;
    this.losses = state.losses;
    this.last = state.last ? { ...state.last } : null;
  }

  floatingPnl(book: DummyBook): number {
    if (!this.open) return 0;
    const mark = exitPrice(this.open.side, book);
    return ticketPnl(this.open.side, this.open.openPrice, mark, this.open.lots, this.opts.contractSize);
  }

  snapshot(book: DummyBook) {
    const realizedPnl = this.realized;
    const floatingPnl = this.floatingPnl(book);
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

  /** Close at the SL or TP price if the exit side has touched either. */
  checkStops(book: DummyBook, ts: number): DummyFill | null {
    if (!this.open) return null;
    const hit = slTpHit(this.open, book);
    if (!hit) return null;
    const closePrice = hit === "sl" ? this.open.sl : this.open.tp;
    return this.closeAt(closePrice, hit, ts);
  }

  /**
   * Open the wanted side when flat. An opposite buy or sell leaves the ticket
   * alone so the stop and take profit can finish the scalp.
   * Flatten still closes on the exit side of the book.
   */
  sync(want: PositionSide, book: DummyBook, ts: number): DummyFill[] {
    const fills: DummyFill[] = [];
    const have: PositionSide = this.open?.side ?? "flat";
    if (have === want) return fills;
    if (this.open && (want === "buy" || want === "sell")) return fills;
    if (this.open) {
      const closed = this.closeAt(exitPrice(this.open.side, book), "signal", ts);
      if (closed) fills.push(closed);
    }
    if (want === "buy" || want === "sell") fills.push(this.openAt(want, book, ts));
    return fills;
  }

  private openAt(side: DummySide, book: DummyBook, ts: number): DummyFill {
    const price = fillPrice(side, book);
    const { sl, tp } = stopPrices(side, price, this.opts.slPoints, this.opts.tpPoints, this.opts.point);
    const ticket = this.nextTicket++;
    const lots = this.opts.lot;
    this.open = { ticket, side, lots, openPrice: price, sl, tp, openTs: ts };
    return {
      ticket,
      side,
      lots,
      price,
      symbol: "XAUUSD",
      kind: "open",
      openPrice: price,
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
