import { expect, test } from "bun:test";
import { GOLD_ROOM_IDLE_MS, keepGoldAlarm } from "./alarm";

const now = 1_000_000;

test("demo room keeps ticking with no browser", () => {
  expect(
    keepGoldAlarm({
      demo: true,
      viewers: 0,
      lastSeen: now - GOLD_ROOM_IDLE_MS - 1,
      now,
    }),
  ).toBe(true);
});

test("demo room keeps ticking while someone is watching", () => {
  expect(keepGoldAlarm({ demo: true, viewers: 2, lastSeen: now, now })).toBe(true);
});

test("production room keeps ticking while a viewer is connected", () => {
  expect(
    keepGoldAlarm({
      demo: false,
      viewers: 1,
      lastSeen: now - GOLD_ROOM_IDLE_MS - 1,
      now,
    }),
  ).toBe(true);
});

test("production room keeps ticking during the idle grace", () => {
  expect(
    keepGoldAlarm({
      demo: false,
      viewers: 0,
      lastSeen: now - GOLD_ROOM_IDLE_MS + 1,
      now,
    }),
  ).toBe(true);
});

test("production room stops after the idle grace with no viewer", () => {
  expect(
    keepGoldAlarm({
      demo: false,
      viewers: 0,
      lastSeen: now - GOLD_ROOM_IDLE_MS - 1,
      now,
    }),
  ).toBe(false);
});
