import { expect, test } from "bun:test";
import {
  GOLD_DEFAULT_HORIZON_MS,
  GOLD_DEFAULT_SL_POINTS,
  GOLD_DEFAULT_TP_POINTS,
  goldConfig,
  parsePositiveInt,
} from "./config";

test("gold SL and TP defaults clear a typical half dollar XAUUSD spread", () => {
  expect(GOLD_DEFAULT_SL_POINTS).toBe(250);
  expect(GOLD_DEFAULT_TP_POINTS).toBe(150);
  expect(GOLD_DEFAULT_SL_POINTS * 0.01).toBeCloseTo(2.5);
  expect(GOLD_DEFAULT_TP_POINTS * 0.01).toBeCloseTo(1.5);
  expect(GOLD_DEFAULT_SL_POINTS).toBeGreaterThan(GOLD_DEFAULT_TP_POINTS);
  // Target must beat a ~$0.50 Swissquote-style book with margin.
  expect(GOLD_DEFAULT_TP_POINTS * 0.01).toBeGreaterThan(0.5 + 0.5);
  // After buy-at-ask, exit bid sits ~$0.50 toward the stop; leave bounce room.
  expect(GOLD_DEFAULT_SL_POINTS * 0.01 - 0.5).toBeGreaterThanOrEqual(1.5);
  expect(GOLD_DEFAULT_SL_POINTS).toBeLessThanOrEqual(400);
  expect(GOLD_DEFAULT_TP_POINTS).toBeLessThanOrEqual(300);
});

test("gold horizon is a short scalp window and decisions stay frequent", () => {
  expect(GOLD_DEFAULT_HORIZON_MS).toBe(12000);
  expect(goldConfig.horizonMs).toBe(GOLD_DEFAULT_HORIZON_MS);
  expect(goldConfig.intervalMs).toBeLessThanOrEqual(1000);
  expect(goldConfig.reverse).toBe(true);
});

test("goldConfig exposes non-zero SL and TP points", () => {
  expect(goldConfig.slPoints).toBeGreaterThan(0);
  expect(goldConfig.tpPoints).toBeGreaterThan(0);
});

test("dummy MT5 is on by default in dry-run", () => {
  expect(goldConfig.dryRun).toBe(true);
  expect(goldConfig.dummyMt5).toBe(true);
  expect(goldConfig.contractSize).toBe(100);
  expect(goldConfig.minReversePoints).toBe(1);
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
