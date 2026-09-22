import { expect, test } from "bun:test";
import { realizedPeakFromTrades, shouldPauseDummyEntries } from "./pause";

test("realized peak walks closed tickets from flat", () => {
  expect(realizedPeakFromTrades([])).toBe(0);
  expect(realizedPeakFromTrades([{ pnl: -20 }])).toBe(0);
  expect(realizedPeakFromTrades([{ pnl: 11 }, { pnl: -3 }, { pnl: 8 }])).toBe(16);
  expect(realizedPeakFromTrades([{ pnl: 11 }, { pnl: -2 }, { pnl: -2 }, { pnl: -20 }])).toBe(11);
});

test("production GOLD_DEMO=false never pauses dummy entries", () => {
  const gate = shouldPauseDummyEntries({
    demo: false,
    realizedUsd: -80,
    realizedPeak: 11,
    pauseDrawdownUsd: -20,
    pauseFloorUsd: -40,
  });
  expect(gate.pause).toBe(false);
  expect(gate.reason).toBeNull();
});

test("peak drawdown pauses $20 under the session high", () => {
  expect(
    shouldPauseDummyEntries({
      demo: true,
      realizedUsd: -9,
      realizedPeak: 11,
      pauseDrawdownUsd: -20,
      pauseFloorUsd: -40,
    }),
  ).toEqual({ pause: true, reason: "drawdown" });
  expect(
    shouldPauseDummyEntries({
      demo: true,
      realizedUsd: -8,
      realizedPeak: 11,
      pauseDrawdownUsd: -20,
      pauseFloorUsd: -40,
    }),
  ).toEqual({ pause: false, reason: null });
});

test("hard floor pauses at -$40 even after a resume resets the peak", () => {
  expect(
    shouldPauseDummyEntries({
      demo: true,
      realizedUsd: -40,
      realizedPeak: -40,
      pauseDrawdownUsd: -20,
      pauseFloorUsd: -40,
    }),
  ).toEqual({ pause: true, reason: "floor" });
  expect(
    shouldPauseDummyEntries({
      demo: true,
      realizedUsd: -43,
      realizedPeak: -43,
      pauseDrawdownUsd: -20,
      pauseFloorUsd: -40,
    }),
  ).toEqual({ pause: true, reason: "floor" });
});

test("floor wins over drawdown when both are hit", () => {
  expect(
    shouldPauseDummyEntries({
      demo: true,
      realizedUsd: -43,
      realizedPeak: 11,
      pauseDrawdownUsd: -20,
      pauseFloorUsd: -40,
    }).reason,
  ).toBe("floor");
});

test("turning a gate off leaves the other one live", () => {
  expect(
    shouldPauseDummyEntries({
      demo: true,
      realizedUsd: -25,
      realizedPeak: 0,
      pauseDrawdownUsd: null,
      pauseFloorUsd: -40,
    }),
  ).toEqual({ pause: false, reason: null });
  expect(
    shouldPauseDummyEntries({
      demo: true,
      realizedUsd: -25,
      realizedPeak: 0,
      pauseDrawdownUsd: -20,
      pauseFloorUsd: null,
    }),
  ).toEqual({ pause: true, reason: "drawdown" });
});
