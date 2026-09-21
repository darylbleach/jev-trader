import { expect, test } from "bun:test";
import { DummyMt5Account, slTpHit, stopPrices, ticketPnl } from "./dummy-mt5";
import { parseFill } from "./server";

const opts = {
  lot: 0.01,
  slPoints: 600,
  tpPoints: 800,
  point: 0.01,
  contractSize: 100,
  historySize: 20,
};

test("buy ticket places SL below and TP above mid", () => {
  const { sl, tp } = stopPrices("buy", 2650, 600, 800, 0.01);
  expect(sl).toBeCloseTo(2644);
  expect(tp).toBeCloseTo(2658);
});

test("sell ticket places SL above and TP below mid", () => {
  const { sl, tp } = stopPrices("sell", 2650, 600, 800, 0.01);
  expect(sl).toBeCloseTo(2656);
  expect(tp).toBeCloseTo(2642);
});

test("XAUUSD pnl is contract size times lots", () => {
  expect(ticketPnl("buy", 2650, 2658, 0.01, 100)).toBeCloseTo(8);
  expect(ticketPnl("sell", 2650, 2644, 0.01, 100)).toBeCloseTo(6);
  expect(ticketPnl("buy", 2650, 2644, 0.01, 100)).toBeCloseTo(-6);
});

test("dummy open records ticket, mid, SL, and TP", () => {
  const acct = new DummyMt5Account(opts);
  const fills = acct.sync("buy", 2650.1, 1_000);
  expect(fills).toHaveLength(1);
  expect(fills[0]?.kind).toBe("open");
  expect(fills[0]?.side).toBe("buy");
  expect(fills[0]?.lots).toBe(0.01);
  expect(fills[0]?.price).toBeCloseTo(2650.1);
  expect(fills[0]?.sl).toBeCloseTo(2644.1);
  expect(fills[0]?.tp).toBeCloseTo(2658.1);
  expect(acct.openTicket?.ticket).toBe(1);
});

test("same side sync is a no-op", () => {
  const acct = new DummyMt5Account(opts);
  acct.sync("buy", 2650, 1);
  expect(acct.sync("buy", 2651, 2)).toEqual([]);
  expect(acct.openTicket?.openPrice).toBe(2650);
});

test("reverse closes the old ticket at mid then opens the other side", () => {
  const acct = new DummyMt5Account(opts);
  acct.sync("buy", 2650, 1);
  const fills = acct.sync("sell", 2651.5, 2);
  expect(fills).toHaveLength(2);
  expect(fills[0]?.kind).toBe("close");
  expect(fills[0]?.reason).toBe("signal");
  expect(fills[0]?.price).toBeCloseTo(2651.5);
  expect(fills[0]?.pnl).toBeCloseTo(1.5);
  expect(fills[1]?.kind).toBe("open");
  expect(fills[1]?.side).toBe("sell");
  expect(fills[1]?.ticket).toBe(2);
  expect(acct.openTicket?.side).toBe("sell");
  expect(acct.closedTrades).toHaveLength(1);
  expect(acct.realizedPnl).toBeCloseTo(1.5);
});

test("flatten closes only", () => {
  const acct = new DummyMt5Account(opts);
  acct.sync("sell", 2650, 1);
  const fills = acct.sync("flat", 2648, 2);
  expect(fills).toHaveLength(1);
  expect(fills[0]?.kind).toBe("close");
  expect(fills[0]?.reason).toBe("signal");
  expect(fills[0]?.pnl).toBeCloseTo(2);
  expect(acct.openTicket).toBeNull();
});

test("price touching SL closes as sl", () => {
  const acct = new DummyMt5Account(opts);
  acct.sync("buy", 2650, 1);
  const fill = acct.checkStops(2644, 2);
  expect(fill?.kind).toBe("close");
  expect(fill?.reason).toBe("sl");
  expect(fill?.price).toBeCloseTo(2644);
  expect(fill?.pnl).toBeCloseTo(-6);
  expect(acct.openTicket).toBeNull();
  expect(slTpHit({ ticket: 1, side: "buy", lots: 0.01, openPrice: 2650, sl: 2644, tp: 2658, openTs: 1 }, 2644)).toBe("sl");
});

test("price touching TP closes as tp", () => {
  const acct = new DummyMt5Account(opts);
  acct.sync("sell", 2650, 1);
  const fill = acct.checkStops(2642, 2);
  expect(fill?.reason).toBe("tp");
  expect(fill?.price).toBeCloseTo(2642);
  expect(fill?.pnl).toBeCloseTo(8);
});

test("mid between SL and TP leaves the ticket open", () => {
  const acct = new DummyMt5Account(opts);
  acct.sync("buy", 2650, 1);
  expect(acct.checkStops(2651.2, 2)).toBeNull();
  expect(acct.openTicket?.side).toBe("buy");
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
