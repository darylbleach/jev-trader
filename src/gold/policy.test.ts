import { expect, test } from "bun:test";
import { clampStopsLevel, holdScalp, midPrice, nextPosition, resolveExitPoints, scaleLots, spreadPips } from "./policy";

test("equal equity copies the leader lot", () => {
  expect(scaleLots({
    leaderLot: 0.10,
    leaderEquity: 1000,
    followerEquity: 1000,
    lotMult: 1,
    minLot: 0.01,
    maxLot: 5,
    lotStep: 0.01,
  })).toBe(0.1);
});

test("half equity halves the lot", () => {
  expect(scaleLots({
    leaderLot: 0.20,
    leaderEquity: 2000,
    followerEquity: 1000,
    lotMult: 1,
    minLot: 0.01,
    maxLot: 5,
    lotStep: 0.01,
  })).toBe(0.1);
});

test("lot step rounds down", () => {
  expect(scaleLots({
    leaderLot: 0.13,
    leaderEquity: 1000,
    followerEquity: 1000,
    lotMult: 1,
    minLot: 0.01,
    maxLot: 5,
    lotStep: 0.05,
  })).toBe(0.1);
});

test("caps at max lot", () => {
  expect(scaleLots({
    leaderLot: 2,
    leaderEquity: 1000,
    followerEquity: 10000,
    lotMult: 1,
    minLot: 0.01,
    maxLot: 1,
    lotStep: 0.01,
  })).toBe(1);
});

test("below min lot after rounding is 0", () => {
  expect(scaleLots({
    leaderLot: 0.01,
    leaderEquity: 10000,
    followerEquity: 100,
    lotMult: 1,
    minLot: 0.01,
    maxLot: 5,
    lotStep: 0.01,
  })).toBe(0);
});

test("invalid leader equity is 0", () => {
  expect(scaleLots({
    leaderLot: 0.1,
    leaderEquity: 0,
    followerEquity: 1000,
    lotMult: 1,
    minLot: 0.01,
    maxLot: 5,
    lotStep: 0.01,
  })).toBe(0);
});

test("lot multiplier scales the copy", () => {
  expect(scaleLots({
    leaderLot: 0.10,
    leaderEquity: 1000,
    followerEquity: 1000,
    lotMult: 2,
    minLot: 0.01,
    maxLot: 5,
    lotStep: 0.01,
  })).toBe(0.2);
});

test("flat opens the signal side", () => {
  expect(nextPosition("flat", "buy", true)).toBe("buy");
  expect(nextPosition("flat", "sell", true)).toBe("sell");
});

test("same side holds", () => {
  expect(nextPosition("buy", "buy", true)).toBe("buy");
});

test("opposite signal reverses when enabled", () => {
  expect(nextPosition("buy", "sell", true)).toBe("sell");
});

test("opposite signal flattens when reverse is off", () => {
  expect(nextPosition("buy", "sell", false)).toBe("flat");
});

test("an open scalp holds until it is flat again", () => {
  expect(holdScalp("flat", "buy")).toBe("buy");
  expect(holdScalp("flat", "sell")).toBe("sell");
  expect(holdScalp("buy", "sell")).toBe("buy");
  expect(holdScalp("sell", "buy")).toBe("sell");
  expect(holdScalp("buy", "buy")).toBe("buy");
});

test("spread and mid", () => {
  expect(spreadPips(2650.10, 2650.40, 0.01)).toBeCloseTo(30);
  expect(midPrice(2650.10, 2650.40)).toBeCloseTo(2650.25);
});

test("exit points prefer the EA input, then the signal, then the default", () => {
  expect(resolveExitPoints(1800, 2000, 2000)).toBe(1800);
  expect(resolveExitPoints(0, 2000, 1500)).toBe(2000);
  expect(resolveExitPoints(0, 0, 2000)).toBe(2000);
  expect(resolveExitPoints(-5, Number.NaN, 2500)).toBe(2500);
});

test("exit points never resolve to zero", () => {
  expect(resolveExitPoints(0, 0, 0)).toBe(1);
  expect(resolveExitPoints(0, -1, -10)).toBe(1);
});

test("stops level raises a too-close SL or TP", () => {
  expect(clampStopsLevel(2000, 500)).toBe(2000);
  expect(clampStopsLevel(2000, 3000)).toBe(3000);
  expect(clampStopsLevel(0, 0)).toBe(1);
  expect(clampStopsLevel(-8, Number.NaN)).toBe(1);
});
