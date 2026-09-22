import { expect, test } from "bun:test";
import {
  GOLD_DEFAULT_HORIZON_MS,
  GOLD_DEFAULT_SL_POINTS,
  GOLD_DEFAULT_TP_POINTS,
  goldConfig,
  parseFillMode,
  parsePositiveInt,
} from "./config";

test("gold SL and TP defaults clear a half dollar book with room", () => {
  expect(GOLD_DEFAULT_SL_POINTS).toBe(200);
  expect(GOLD_DEFAULT_TP_POINTS).toBe(100);
  expect(GOLD_DEFAULT_SL_POINTS * 0.01).toBeCloseTo(2);
  expect(GOLD_DEFAULT_TP_POINTS * 0.01).toBeCloseTo(1);
  expect(GOLD_DEFAULT_SL_POINTS).toBeGreaterThan(GOLD_DEFAULT_TP_POINTS);
  expect(GOLD_DEFAULT_SL_POINTS).toBeGreaterThan(15);
  expect(GOLD_DEFAULT_SL_POINTS).toBeLessThanOrEqual(300);
  expect(GOLD_DEFAULT_TP_POINTS).toBeLessThanOrEqual(200);
  expect(GOLD_DEFAULT_SL_POINTS * 0.01).toBeGreaterThan(0.5);
  expect(GOLD_DEFAULT_TP_POINTS * 0.01).toBeGreaterThan(0.5);
  // Equal mark travel on a $0.50 book: spread+TP == SL-spread
  expect(0.5 + GOLD_DEFAULT_TP_POINTS * 0.01).toBeCloseTo(GOLD_DEFAULT_SL_POINTS * 0.01 - 0.5);
});

test("gold horizon is a short scalp window and decisions stay frequent", () => {
  expect(GOLD_DEFAULT_HORIZON_MS).toBe(6000);
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

test("parseFillMode defaults to book and accepts mid for comparison", () => {
  expect(parseFillMode(undefined)).toBe("book");
  expect(parseFillMode("")).toBe("book");
  expect(parseFillMode("book")).toBe("book");
  expect(parseFillMode("MID")).toBe("mid");
  expect(parseFillMode("junk")).toBe("book");
});
