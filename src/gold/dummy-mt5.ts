import type { PositionSide } from "./policy";
import type { DummyMt5Persisted } from "./proof-state";
import type { DummyCloseReason, DummyFill, DummyTicket, DummyTrade } from "./types";

export type DummySide = "buy" | "sell";

/** Default proof path: buy at ask, sell at bid, exit on the opposing book side. */
export type DummyFillMode = "book" | "mid";

export interface BookQuote {
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
  /**
   * `book` (default): open buys at ask / sells at bid; SL/TP and floating P and L use the exit side
   * (bid for buys, ask for sells). `mid` is comparison-only and must be labeled as mid-fill.
   */
  fillMode?: DummyFillMode;
}

export function midOf(quote: BookQuote): number {
  return (quote.bid + quote.ask) / 2;
}

/** Entry price for a market ticket under the active fill mode. */
export function entryPrice(side: DummySide, quote: BookQuote, mode: DummyFillMode): number {
  if (mode === "mid") return midOf(quote);
  return side === "buy" ? quote.ask : quote.bid;
}

/**
 * Exit / mark price for an open ticket: buys flatten on the bid, sells on the ask.
 * Mid mode marks and exits at mid for comparison only.
 */
export function exitPrice(side: DummySide, quote: BookQuote, mode: DummyFillMode): number {
  if (mode === "mid") return midOf(quote);
  return side === "buy" ? quote.bid : quote.ask;
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

/** Judge SL/TP on the exit book side (bid for buys, ask for sells) unless mid mode. */
export function slTpHit(ticket: DummyTicket, quote: BookQuote, mode: DummyFillMode = "book"): DummyCloseReason | null {
  const mark = exitPrice(ticket.side, quote, mode);
  if (ticket.side === "buy") {
    if (mark <= ticket.sl) return "sl";
    if (mark >= ticket.tp) return "tp";
    return null;
  }
  if (mark >= ticket.sl) return "sl";
  if (mark <= ticket.tp) return "tp";
  return null;
}

/**
 * In-process stand-in for JevLeader market tickets. Default fill mode is the live book:
 * buy at ask, sell at bid, attach SL/TP from the fill, exit when the opposing side touches.
 */
export class DummyMt5Account {
  private nextTicket = 1;
  private open: DummyTicket | null = null;
  private trades: DummyTrade[] = [];
  private realized = 0;
  private wins = 0;
  private losses = 0;
  private last: DummyTrade | null = null;
  private readonly fillMode: DummyFillMode;

  constructor(private readonly opts: DummyMt5Options) {
    this.fillMode = opts.fillMode ?? "book";
  }

  get mode(): DummyFillMode {
    return this.fillMode;
  }

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

  /** Clear the scored session: open ticket, closed tape, wins/losses/realized. */
  resetSession(): void {
    this.nextTicket = 1;
    this.open = null;
    this.trades = [];
    this.realized = 0;
    this.wins = 0;
    this.losses = 0;
    this.last = null;
  }

  floatingPnl(quote: BookQuote): number {
    if (!this.open) return 0;
    const mark = exitPrice(this.open.side, quote, this.fillMode);
    return ticketPnl(this.open.side, this.open.openPrice, mark, this.open.lots, this.opts.contractSize);
  }

  snapshot(quote: BookQuote) {
    const realizedPnl = this.realized;
    const floatingPnl = this.floatingPnl(quote);
    return {
      enabled: true,
      fillMode: this.fillMode,
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
  checkStops(quote: BookQuote, ts: number): DummyFill | null {
    if (!this.open) return null;
    const hit = slTpHit(this.open, quote, this.fillMode);
    if (!hit) return null;
    const closePrice = hit === "sl" ? this.open.sl : this.open.tp;
    return this.closeAt(closePrice, hit, ts);
  }

  /**
   * Open the wanted side when flat. An opposite buy or sell leaves the ticket
   * alone so the stop and take profit can finish the scalp.
   * Flatten still closes on the exit book side (or mid in mid mode).
   */
  sync(want: PositionSide, quote: BookQuote, ts: number): DummyFill[] {
    const fills: DummyFill[] = [];
    const have: PositionSide = this.open?.side ?? "flat";
    if (have === want) return fills;
    if (this.open && (want === "buy" || want === "sell")) return fills;
    if (this.open) {
      const closed = this.closeAt(exitPrice(this.open.side, quote, this.fillMode), "signal", ts);
      if (closed) fills.push(closed);
    }
    if (want === "buy" || want === "sell") fills.push(this.openAt(want, quote, ts));
    return fills;
  }

  private openAt(side: DummySide, quote: BookQuote, ts: number): DummyFill {
    const price = entryPrice(side, quote, this.fillMode);
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
