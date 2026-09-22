import { expect, test } from "bun:test";
import {
  DummyMt5Account,
  dummyReverseAllowed,
  entryPrice,
  exitPrice,
  slTpHit,
  stopPrices,
  ticketPnl,
  type BookQuote,
} from "./dummy-mt5";
import { parseFill } from "./server";

const midOpts = {
  lot: 0.01,
  slPoints: 600,
  tpPoints: 800,
  point: 0.01,
  contractSize: 100,
  historySize: 20,
  fillMode: "mid" as const,
};

const bookOpts = {
  ...midOpts,
  fillMode: "book" as const,
};

const flat = (mid: number): BookQuote => ({ bid: mid, ask: mid });
const book = (bid: number, ask: number): BookQuote => ({ bid, ask });

test("buy ticket places SL below and TP above open", () => {
  const { sl, tp } = stopPrices("buy", 2650, 600, 800, 0.01);
  expect(sl).toBeCloseTo(2644);
  expect(tp).toBeCloseTo(2658);
});

test("sell ticket places SL above and TP below open", () => {
  const { sl, tp } = stopPrices("sell", 2650, 600, 800, 0.01);
  expect(sl).toBeCloseTo(2656);
  expect(tp).toBeCloseTo(2642);
});

test("XAUUSD pnl is contract size times lots", () => {
  expect(ticketPnl("buy", 2650, 2658, 0.01, 100)).toBeCloseTo(8);
  expect(ticketPnl("sell", 2650, 2644, 0.01, 100)).toBeCloseTo(6);
  expect(ticketPnl("buy", 2650, 2644, 0.01, 100)).toBeCloseTo(-6);
});

test("book mode buys at ask and sells at bid", () => {
  const q = book(2650.0, 2650.5);
  expect(entryPrice("buy", q, "book")).toBeCloseTo(2650.5);
  expect(entryPrice("sell", q, "book")).toBeCloseTo(2650.0);
  expect(exitPrice("buy", q, "book")).toBeCloseTo(2650.0);
  expect(exitPrice("sell", q, "book")).toBeCloseTo(2650.5);
  expect(entryPrice("buy", q, "mid")).toBeCloseTo(2650.25);
});

test("dummy open records ticket, mid fill, SL, and TP", () => {
  const acct = new DummyMt5Account(midOpts);
  const fills = acct.sync("buy", flat(2650.1), 1_000);
  expect(fills).toHaveLength(1);
  expect(fills[0]?.kind).toBe("open");
  expect(fills[0]?.side).toBe("buy");
  expect(fills[0]?.lots).toBe(0.01);
  expect(fills[0]?.price).toBeCloseTo(2650.1);
  expect(fills[0]?.sl).toBeCloseTo(2644.1);
  expect(fills[0]?.tp).toBeCloseTo(2658.1);
  expect(acct.openTicket?.ticket).toBe(1);
});

test("book mode open buy fills at ask and SL/TP from that fill", () => {
  const acct = new DummyMt5Account(bookOpts);
  const fills = acct.sync("buy", book(2650.0, 2650.5), 1_000);
  expect(fills[0]?.price).toBeCloseTo(2650.5);
  expect(fills[0]?.sl).toBeCloseTo(2644.5);
  expect(fills[0]?.tp).toBeCloseTo(2658.5);
  expect(acct.floatingPnl(book(2650.0, 2650.5))).toBeCloseTo(-0.5);
});

test("book mode judges buy SL/TP on the bid", () => {
  const acct = new DummyMt5Account(bookOpts);
  acct.sync("buy", book(2650.0, 2650.5), 1);
  expect(acct.checkStops(book(2644.6, 2651.0), 2)).toBeNull();
  const stopped = acct.checkStops(book(2644.5, 2651.0), 3);
  expect(stopped?.reason).toBe("sl");
  expect(stopped?.price).toBeCloseTo(2644.5);
});

test("book mode judges sell SL/TP on the ask", () => {
  const acct = new DummyMt5Account(bookOpts);
  acct.sync("sell", book(2650.0, 2650.5), 1);
  expect(acct.openTicket?.openPrice).toBeCloseTo(2650.0);
  expect(acct.openTicket?.tp).toBeCloseTo(2642.0);
  const hit = acct.checkStops(book(2641.5, 2642.0), 2);
  expect(hit?.reason).toBe("tp");
  expect(hit?.pnl).toBeCloseTo(8);
});

test("book mode does not close a buy when only the ask reaches TP", () => {
  const acct = new DummyMt5Account(bookOpts);
  acct.sync("buy", book(2650.0, 2650.5), 1);
  expect(acct.openTicket?.tp).toBeCloseTo(2658.5);
  expect(acct.checkStops(book(2658.4, 2658.5), 2)).toBeNull();
  const hit = acct.checkStops(book(2658.5, 2659.0), 3);
  expect(hit?.reason).toBe("tp");
});

test("book mode does not take a sell when only the bid reaches TP", () => {
  const acct = new DummyMt5Account(bookOpts);
  acct.sync("sell", book(2650.0, 2650.5), 1);
  expect(acct.openTicket?.tp).toBeCloseTo(2642.0);
  expect(acct.checkStops(book(2642.0, 2642.5), 2)).toBeNull();
  const hit = acct.checkStops(book(2641.5, 2642.0), 3);
  expect(hit?.reason).toBe("tp");
});

test("book flatten still closes a buy on the bid", () => {
  const acct = new DummyMt5Account(bookOpts);
  acct.sync("buy", book(2650.0, 2650.5), 1);
  const fills = acct.sync("flat", book(2649.0, 2649.5), 2);
  expect(fills).toHaveLength(1);
  expect(fills[0]?.kind).toBe("close");
  expect(fills[0]?.reason).toBe("signal");
  expect(fills[0]?.price).toBeCloseTo(2649.0);
  expect(fills[0]?.pnl).toBeCloseTo(-1.5);
});

test("same side sync is a no-op", () => {
  const acct = new DummyMt5Account(midOpts);
  acct.sync("buy", flat(2650), 1);
  expect(acct.sync("buy", flat(2651), 2)).toEqual([]);
  expect(acct.openTicket?.openPrice).toBe(2650);
});

test("dummyReverseAllowed needs at least one point of mid move", () => {
  expect(dummyReverseAllowed(2650, 2650, 1, 0.01)).toBe(false);
  expect(dummyReverseAllowed(2650, 2650.005, 1, 0.01)).toBe(false);
  expect(dummyReverseAllowed(2650, 2650.01, 1, 0.01)).toBe(true);
  expect(dummyReverseAllowed(2650, 2649.99, 1, 0.01)).toBe(true);
  expect(dummyReverseAllowed(2650, 2650, 0, 0.01)).toBe(true);
});

test("reverse at the same mid holds the open ticket", () => {
  const acct = new DummyMt5Account(midOpts);
  acct.sync("buy", flat(2650), 1);
  expect(acct.sync("sell", flat(2650), 2)).toEqual([]);
  expect(acct.openTicket?.side).toBe("buy");
  expect(acct.openTicket?.ticket).toBe(1);
  expect(acct.closedTrades).toHaveLength(0);
  expect(acct.sync("sell", flat(2650.005), 3)).toEqual([]);
  expect(acct.openTicket?.side).toBe("buy");
});

test("an opposite side holds the open scalp until stop or target", () => {
  const acct = new DummyMt5Account(midOpts);
  acct.sync("buy", flat(2650), 1);
  expect(acct.sync("sell", flat(2651.5), 2)).toEqual([]);
  expect(acct.openTicket?.side).toBe("buy");
  expect(acct.closedTrades).toHaveLength(0);
  const stopped = acct.checkStops(flat(2644), 3);
  expect(stopped?.reason).toBe("sl");
  const next = acct.sync("sell", flat(2644), 4);
  expect(next).toHaveLength(1);
  expect(next[0]?.kind).toBe("open");
  expect(next[0]?.side).toBe("sell");
  expect(acct.openTicket?.side).toBe("sell");
});

test("flatten closes only", () => {
  const acct = new DummyMt5Account(midOpts);
  acct.sync("sell", flat(2650), 1);
  const fills = acct.sync("flat", flat(2648), 2);
  expect(fills).toHaveLength(1);
  expect(fills[0]?.kind).toBe("close");
  expect(fills[0]?.reason).toBe("signal");
  expect(fills[0]?.pnl).toBeCloseTo(2);
  expect(acct.openTicket).toBeNull();
});

test("price touching SL closes as sl", () => {
  const acct = new DummyMt5Account(midOpts);
  acct.sync("buy", flat(2650), 1);
  const fill = acct.checkStops(flat(2644), 2);
  expect(fill?.kind).toBe("close");
  expect(fill?.reason).toBe("sl");
  expect(fill?.price).toBeCloseTo(2644);
  expect(fill?.pnl).toBeCloseTo(-6);
  expect(acct.openTicket).toBeNull();
  expect(
    slTpHit(
      { ticket: 1, side: "buy", lots: 0.01, openPrice: 2650, sl: 2644, tp: 2658, openTs: 1 },
      flat(2644),
      "mid",
    ),
  ).toBe("sl");
});

test("price touching TP closes as tp", () => {
  const acct = new DummyMt5Account(midOpts);
  acct.sync("sell", flat(2650), 1);
  const fill = acct.checkStops(flat(2642), 2);
  expect(fill?.reason).toBe("tp");
  expect(fill?.price).toBeCloseTo(2642);
  expect(fill?.pnl).toBeCloseTo(8);
});

test("mid between SL and TP leaves the ticket open", () => {
  const acct = new DummyMt5Account(midOpts);
  acct.sync("buy", flat(2650), 1);
  expect(acct.checkStops(flat(2651.2), 2)).toBeNull();
  expect(acct.openTicket?.side).toBe("buy");
});

test("realized plus floating is combined pnl and last ticket keeps the close", () => {
  const acct = new DummyMt5Account(midOpts);
  acct.sync("buy", flat(2650), 1);
  acct.checkStops(flat(2658), 2);
  expect(acct.lastTicket?.pnl).toBeCloseTo(8);
  expect(acct.winCount).toBe(1);
  expect(acct.lossCount).toBe(0);
  acct.sync("sell", flat(2652), 3);
  expect(acct.floatingPnl(flat(2651))).toBeCloseTo(1);
  const snap = acct.snapshot(flat(2651));
  expect(snap.realizedUsd).toBeCloseTo(8);
  expect(snap.unrealizedUsd).toBeCloseTo(1);
  expect(snap.pnlUsd).toBeCloseTo(9);
  expect(snap.wins).toBe(1);
  expect(snap.losses).toBe(0);
  expect(snap.lastTicket?.reason).toBe("tp");
  expect(snap.fillMode).toBe("mid");
});

test("a stop loss is a loss and a take profit is a win", () => {
  const acct = new DummyMt5Account(midOpts);
  acct.sync("buy", flat(2650), 1);
  acct.checkStops(flat(2644), 2);
  expect(acct.winCount).toBe(0);
  expect(acct.lossCount).toBe(1);
  acct.sync("sell", flat(2644), 3);
  acct.checkStops(flat(2636), 4);
  expect(acct.lastTicket?.reason).toBe("tp");
  expect(acct.lastTicket?.pnl).toBeCloseTo(8);
  expect(acct.winCount).toBe(1);
  expect(acct.lossCount).toBe(1);
  expect(acct.realizedPnl).toBeCloseTo(2);
});

test("scratch close is neither a win nor a loss", () => {
  const acct = new DummyMt5Account(midOpts);
  acct.sync("buy", flat(2650), 1);
  acct.sync("flat", flat(2650), 2);
  expect(acct.lastTicket?.pnl).toBeCloseTo(0);
  expect(acct.winCount).toBe(0);
  expect(acct.lossCount).toBe(0);
});

test("1.00 lot and a $1 gold move is $100", () => {
  expect(ticketPnl("buy", 2000, 2001, 1, 100)).toBeCloseTo(100);
  expect(ticketPnl("sell", 2000, 2001, 1, 100)).toBeCloseTo(-100);
  expect(ticketPnl("buy", 2000, 2001, 0, 100)).toBeCloseTo(0);
});

test("parseFill keeps dummy close fields and still accepts a broker ticket", () => {
  const dummy = parseFill({
    ticket: 7,
    side: "buy",
    lots: 0.01,
    price: 2644,
    kind: "close",
    reason: "sl",
    openPrice: 2650,
    closePrice: 2644,
    sl: 2644,
    tp: 2658,
    pnl: -6,
    simulated: true,
  });
  expect(dummy?.reason).toBe("sl");
  expect(dummy?.pnl).toBe(-6);
  expect(dummy?.kind).toBe("close");
  const broker = parseFill({ ticket: 99, side: "sell", lots: 0.02, price: 2651.11, symbol: "XAUUSD" });
  expect(broker?.ticket).toBe(99);
  expect(broker?.side).toBe("sell");
  expect(broker?.kind).toBeUndefined();
});
