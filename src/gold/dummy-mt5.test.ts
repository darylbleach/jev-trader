import { expect, test } from "bun:test";
import { DummyMt5Account, dummyReverseAllowed, exitPrice, fillPrice, slTpHit, stopPrices, ticketPnl } from "./dummy-mt5";
import { parseFill } from "./server";

const opts = {
  lot: 0.01,
  slPoints: 600,
  tpPoints: 800,
  point: 0.01,
  contractSize: 100,
  historySize: 20,
};

const flat = (mid: number) => ({ bid: mid, ask: mid });
const book = (bid: number, ask: number) => ({ bid, ask });

test("buy ticket places SL below and TP above the fill", () => {
  const { sl, tp } = stopPrices("buy", 2650, 600, 800, 0.01);
  expect(sl).toBeCloseTo(2644);
  expect(tp).toBeCloseTo(2658);
});

test("sell ticket places SL above and TP below the fill", () => {
  const { sl, tp } = stopPrices("sell", 2650, 600, 800, 0.01);
  expect(sl).toBeCloseTo(2656);
  expect(tp).toBeCloseTo(2642);
});

test("fillPrice buys the ask and sells the bid", () => {
  expect(fillPrice("buy", book(2650, 2650.5))).toBeCloseTo(2650.5);
  expect(fillPrice("sell", book(2650, 2650.5))).toBeCloseTo(2650);
});

test("exitPrice marks longs on bid and shorts on ask", () => {
  expect(exitPrice("buy", book(2650, 2650.5))).toBeCloseTo(2650);
  expect(exitPrice("sell", book(2650, 2650.5))).toBeCloseTo(2650.5);
});

test("XAUUSD pnl is contract size times lots", () => {
  expect(ticketPnl("buy", 2650, 2658, 0.01, 100)).toBeCloseTo(8);
  expect(ticketPnl("sell", 2650, 2644, 0.01, 100)).toBeCloseTo(6);
  expect(ticketPnl("buy", 2650, 2644, 0.01, 100)).toBeCloseTo(-6);
});

test("dummy open buys at ask with SL and TP from that fill", () => {
  const acct = new DummyMt5Account(opts);
  const fills = acct.sync("buy", book(2650, 2650.5), 1_000);
  expect(fills).toHaveLength(1);
  expect(fills[0]?.kind).toBe("open");
  expect(fills[0]?.side).toBe("buy");
  expect(fills[0]?.lots).toBe(0.01);
  expect(fills[0]?.price).toBeCloseTo(2650.5);
  expect(fills[0]?.sl).toBeCloseTo(2644.5);
  expect(fills[0]?.tp).toBeCloseTo(2658.5);
  expect(acct.openTicket?.ticket).toBe(1);
});

test("dummy open sells at bid with SL and TP from that fill", () => {
  const acct = new DummyMt5Account(opts);
  const fills = acct.sync("sell", book(2649.7, 2650.2), 1_000);
  expect(fills[0]?.price).toBeCloseTo(2649.7);
  expect(fills[0]?.sl).toBeCloseTo(2655.7);
  expect(fills[0]?.tp).toBeCloseTo(2641.7);
});

test("same side sync is a no-op", () => {
  const acct = new DummyMt5Account(opts);
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
  const acct = new DummyMt5Account(opts);
  acct.sync("buy", flat(2650), 1);
  expect(acct.sync("sell", flat(2650), 2)).toEqual([]);
  expect(acct.openTicket?.side).toBe("buy");
  expect(acct.openTicket?.ticket).toBe(1);
  expect(acct.closedTrades).toHaveLength(0);
  expect(acct.sync("sell", flat(2650.005), 3)).toEqual([]);
  expect(acct.openTicket?.side).toBe("buy");
});

test("an opposite side holds the open scalp until stop or target", () => {
  const acct = new DummyMt5Account(opts);
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

test("flatten closes only on the exit side", () => {
  const acct = new DummyMt5Account(opts);
  acct.sync("sell", book(2650, 2650.4), 1);
  const fills = acct.sync("flat", book(2648, 2648.4), 2);
  expect(fills).toHaveLength(1);
  expect(fills[0]?.kind).toBe("close");
  expect(fills[0]?.reason).toBe("signal");
  // Sell opened at bid 2650; flat covers at ask 2648.4 → pnl (2650-2648.4)*1 = 1.6
  expect(fills[0]?.pnl).toBeCloseTo(1.6);
  expect(acct.openTicket).toBeNull();
});

test("exit bid touching SL closes a long as sl", () => {
  const acct = new DummyMt5Account(opts);
  acct.sync("buy", book(2650, 2650.5), 1);
  // Bid at the long SL; ask can sit wider and still count as a stop.
  const fill = acct.checkStops(book(2644.5, 2645), 2);
  expect(fill?.kind).toBe("close");
  expect(fill?.reason).toBe("sl");
  expect(fill?.price).toBeCloseTo(2644.5);
  expect(fill?.pnl).toBeCloseTo(-6);
  expect(acct.openTicket).toBeNull();
  expect(slTpHit(
    { ticket: 1, side: "buy", lots: 0.01, openPrice: 2650.5, sl: 2644.5, tp: 2658.5, openTs: 1 },
    book(2644.5, 2645),
  )).toBe("sl");
});

test("exit ask touching TP closes a short as tp", () => {
  const acct = new DummyMt5Account(opts);
  acct.sync("sell", book(2650, 2650.5), 1);
  const fill = acct.checkStops(book(2641.5, 2642), 2);
  expect(fill?.reason).toBe("tp");
  expect(fill?.price).toBeCloseTo(2642);
  expect(fill?.pnl).toBeCloseTo(8);
});

test("wide book does not TP a long until the bid reaches the target", () => {
  const acct = new DummyMt5Account(opts);
  acct.sync("buy", book(2650, 2650.5), 1);
  // Mid and ask already through TP, but bid has not: ticket stays open.
  expect(acct.checkStops(book(2658, 2658.5), 2)).toBeNull();
  expect(acct.openTicket?.side).toBe("buy");
  const fill = acct.checkStops(book(2658.5, 2659), 3);
  expect(fill?.reason).toBe("tp");
});

test("wide book does not SL a long until the bid reaches the stop", () => {
  const acct = new DummyMt5Account(opts);
  acct.sync("buy", book(2650, 2650.5), 1);
  // Mid already through SL while bid is still above it.
  expect(acct.checkStops(book(2644.6, 2644.1), 2)).toBeNull();
  expect(acct.openTicket?.side).toBe("buy");
});

test("book between SL and TP leaves the ticket open", () => {
  const acct = new DummyMt5Account(opts);
  acct.sync("buy", flat(2650), 1);
  expect(acct.checkStops(book(2651, 2651.4), 2)).toBeNull();
  expect(acct.openTicket?.side).toBe("buy");
});

test("realized plus floating uses exit side marks", () => {
  const acct = new DummyMt5Account(opts);
  acct.sync("buy", flat(2650), 1);
  acct.checkStops(flat(2658), 2);
  expect(acct.lastTicket?.pnl).toBeCloseTo(8);
  expect(acct.winCount).toBe(1);
  expect(acct.lossCount).toBe(0);
  acct.sync("sell", book(2652, 2652.4), 3);
  // Short opened at bid 2652; floating marks at ask 2651.4 → +0.6
  expect(acct.floatingPnl(book(2651, 2651.4))).toBeCloseTo(0.6);
  const snap = acct.snapshot(book(2651, 2651.4));
  expect(snap.realizedUsd).toBeCloseTo(8);
  expect(snap.unrealizedUsd).toBeCloseTo(0.6);
  expect(snap.pnlUsd).toBeCloseTo(8.6);
  expect(snap.wins).toBe(1);
  expect(snap.losses).toBe(0);
  expect(snap.lastTicket?.reason).toBe("tp");
});

test("a stop loss is a loss and a take profit is a win", () => {
  const acct = new DummyMt5Account(opts);
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
  const acct = new DummyMt5Account(opts);
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
