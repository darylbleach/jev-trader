import { expect, test } from "bun:test";
import { MidRing, parseTick, returnPips } from "./state";

test("parseTick accepts bid and ask", () => {
  expect(parseTick({ bid: 2650.1, ask: 2650.4, volume: 12 })).toEqual({
    bid: 2650.1,
    ask: 2650.4,
    volume: 12,
    ts: undefined,
  });
});

test("parseTick accepts mid or price", () => {
  expect(parseTick({ mid: 2650.2 })?.bid).toBe(2650.2);
  expect(parseTick({ price: "2651" })?.ask).toBe(2651);
});

test("parseTick rejects inverted quotes", () => {
  expect(parseTick({ bid: 10, ask: 9 })).toBeNull();
  expect(parseTick({})).toBeNull();
  expect(parseTick(null)).toBeNull();
});

test("returnPips is the mid delta in pips", () => {
  expect(returnPips([100, 100.10, 100.30], 2, 0.01)).toBeCloseTo(30);
  expect(returnPips([100], 1, 0.01)).toBe(0);
});

test("MidRing builds gold state and blocks a wide spread", () => {
  const ring = new MidRing();
  ring.push(2650);
  ring.push(2650.5);
  const state = ring.build({ bid: 2650.0, ask: 2651.0, volume: 3 }, {
    ts: 1,
    horizonMs: 6_000,
    intervalMs: 1000,
    point: 0.01,
    maxSpreadPips: 30,
  });
  expect(state.market).toBe("XAUUSD");
  expect(state.mid).toBeCloseTo(2650.5);
  expect(state.spreadPips).toBeCloseTo(100);
  expect(state.allowed).toEqual({ buy: false, sell: false });
  expect(state.returnsPips.last1).toBeCloseTo(50);
});
