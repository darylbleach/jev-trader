import { expect, test } from "bun:test";
import {
  GOLD_DEFAULT_HORIZON_MS,
  GOLD_DEFAULT_MIN_REVERSE_POINTS,
  GOLD_DEFAULT_PAUSE_FLOOR_USD,
  GOLD_DEFAULT_PAUSE_REALIZED_USD,
  GOLD_DEFAULT_SL_POINTS,
  GOLD_DEFAULT_TP_POINTS,
  goldConfig,
  parseFillMode,
  parsePauseFloorUsd,
  parsePauseRealizedUsd,
  parsePositiveInt,
} from "./config";

test("gold SL and TP defaults flip cash R:R for ~40% breakeven WR", () => {
  expect(GOLD_DEFAULT_SL_POINTS).toBe(200);
  expect(GOLD_DEFAULT_TP_POINTS).toBe(300);
  expect(GOLD_DEFAULT_SL_POINTS * 0.01).toBeCloseTo(2);
  expect(GOLD_DEFAULT_TP_POINTS * 0.01).toBeCloseTo(3);
  expect(GOLD_DEFAULT_TP_POINTS).toBeGreaterThan(GOLD_DEFAULT_SL_POINTS);
  expect(GOLD_DEFAULT_SL_POINTS).toBeGreaterThan(15);
  expect(GOLD_DEFAULT_SL_POINTS).toBeLessThanOrEqual(400);
  expect(GOLD_DEFAULT_TP_POINTS).toBeLessThanOrEqual(400);
  expect(GOLD_DEFAULT_SL_POINTS * 0.01).toBeGreaterThan(0.5);
  expect(GOLD_DEFAULT_TP_POINTS * 0.01).toBeGreaterThan(0.5);
  // Cash breakeven WR = SL/(TP+SL) ≈ 40%
  expect(GOLD_DEFAULT_SL_POINTS / (GOLD_DEFAULT_TP_POINTS + GOLD_DEFAULT_SL_POINTS)).toBeCloseTo(0.4);
  // At 50% WR: E = 0.5*3 + 0.5*(-2) = +0.5 per trade
  expect(0.5 * 3 + 0.5 * -2).toBeCloseTo(0.5);
});

test("gold horizon is a short scalp window and decisions stay frequent", () => {
  expect(GOLD_DEFAULT_HORIZON_MS).toBe(10000);
  expect(goldConfig.horizonMs).toBe(GOLD_DEFAULT_HORIZON_MS);
  expect(goldConfig.intervalMs).toBeLessThanOrEqual(1000);
  expect(goldConfig.reverse).toBe(true);
});

test("goldConfig exposes non-zero SL and TP points and default book fills", () => {
  expect(goldConfig.slPoints).toBeGreaterThan(0);
  expect(goldConfig.tpPoints).toBeGreaterThan(0);
  expect(goldConfig.fillMode).toBe("book");
});

test("dummy MT5 is on by default in dry-run", () => {
  expect(goldConfig.dryRun).toBe(true);
  expect(goldConfig.dummyMt5).toBe(true);
  expect(goldConfig.contractSize).toBe(100);
  expect(goldConfig.minReversePoints).toBe(GOLD_DEFAULT_MIN_REVERSE_POINTS);
  expect(GOLD_DEFAULT_MIN_REVERSE_POINTS).toBe(50);
  expect(goldConfig.spotRefreshMs).toBe(1000);
});

test("parsePositiveInt keeps valid points and falls back on zero or junk", () => {
  expect(parsePositiveInt(undefined, 2000)).toBe(2000);
  expect(parsePositiveInt("", 2000)).toBe(2000);
  expect(parsePositiveInt("0", 2000)).toBe(2000);
  expect(parsePositiveInt("-3", 2000)).toBe(2000);
  expect(parsePositiveInt("nope", 2000)).toBe(2000);
  expect(parsePositiveInt("1800.9", 2000)).toBe(1800);
  expect(parsePositiveInt("3000", 2000)).toBe(3000);
});

test("parseFillMode defaults to book and accepts mid for comparison", () => {
  expect(parseFillMode(undefined)).toBe("book");
  expect(parseFillMode("")).toBe("book");
  expect(parseFillMode("book")).toBe("book");
  expect(parseFillMode("MID")).toBe("mid");
  expect(parseFillMode("junk")).toBe("book");
});

test("parsePauseRealizedUsd defaults to -20 and can be turned off", () => {
  expect(GOLD_DEFAULT_PAUSE_REALIZED_USD).toBe(-20);
  expect(parsePauseRealizedUsd(undefined)).toBe(-20);
  expect(parsePauseRealizedUsd("")).toBe(-20);
  expect(parsePauseRealizedUsd("-25")).toBe(-25);
  expect(parsePauseRealizedUsd("off")).toBeNull();
  expect(parsePauseRealizedUsd("none")).toBeNull();
  expect(parsePauseRealizedUsd("junk")).toBe(-20);
  expect(goldConfig.pauseRealizedUsd).toBe(-20);
});

test("parsePauseFloorUsd defaults to -80 and can be turned off", () => {
  expect(GOLD_DEFAULT_PAUSE_FLOOR_USD).toBe(-80);
  expect(parsePauseFloorUsd(undefined)).toBe(-80);
  expect(parsePauseFloorUsd("")).toBe(-80);
  expect(parsePauseFloorUsd("-50")).toBe(-50);
  expect(parsePauseFloorUsd("off")).toBeNull();
  expect(parsePauseFloorUsd("junk")).toBe(-80);
  expect(goldConfig.pauseFloorUsd).toBe(-80);
});
