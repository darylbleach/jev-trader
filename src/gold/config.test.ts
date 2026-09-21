import { expect, test } from "bun:test";
import { GOLD_DEFAULT_HORIZON_MS, GOLD_DEFAULT_SL_POINTS, GOLD_DEFAULT_TP_POINTS, goldConfig, parsePositiveInt } from "./config";

test("gold SL and TP defaults are a tight scalp exit at SYMBOL_POINT 0.01", () => {
  expect(GOLD_DEFAULT_SL_POINTS).toBe(600);
  expect(GOLD_DEFAULT_TP_POINTS).toBe(800);
  expect(GOLD_DEFAULT_SL_POINTS * 0.01).toBe(6);
  expect(GOLD_DEFAULT_TP_POINTS * 0.01).toBe(8);
  expect(GOLD_DEFAULT_TP_POINTS).toBeGreaterThan(GOLD_DEFAULT_SL_POINTS);
  expect(GOLD_DEFAULT_SL_POINTS).toBeGreaterThanOrEqual(500);
  expect(GOLD_DEFAULT_SL_POINTS).toBeLessThanOrEqual(800);
  expect(GOLD_DEFAULT_TP_POINTS).toBeGreaterThanOrEqual(600);
  expect(GOLD_DEFAULT_TP_POINTS).toBeLessThanOrEqual(1000);
  expect(GOLD_DEFAULT_SL_POINTS * 0.01).toBeGreaterThan(0.15);
});

test("gold horizon is a short scalp window and decisions stay frequent", () => {
  expect(GOLD_DEFAULT_HORIZON_MS).toBe(6000);
  expect(goldConfig.horizonMs).toBe(GOLD_DEFAULT_HORIZON_MS);
  expect(goldConfig.intervalMs).toBeLessThanOrEqual(1000);
  expect(goldConfig.reverse).toBe(true);
});

test("goldConfig exposes non-zero SL and TP points", () => {
  expect(goldConfig.slPoints).toBeGreaterThan(0);
  expect(goldConfig.tpPoints).toBeGreaterThan(0);
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
