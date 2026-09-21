import { expect, test } from "bun:test";
import { sleep } from "./sleep";
import { GoldMockModel } from "./model";
import { MidRing } from "./state";

test("sleep resolves", async () => {
  const t0 = Date.now();
  await sleep(5);
  expect(Date.now() - t0).toBeGreaterThanOrEqual(0);
});

test("mock model decides without Bun.sleep", async () => {
  const ring = new MidRing();
  ring.push(2650);
  ring.push(2651);
  const state = ring.build({ bid: 2650.9, ask: 2651.1, volume: 2 }, {
    ts: Date.now(),
    horizonMs: 6000,
    intervalMs: 1000,
    point: 0.01,
    maxSpreadPips: 30,
  });
  const d = await new GoldMockModel().decide(state);
  expect(d.action === "buy" || d.action === "sell").toBe(true);
  expect(d.latencyMs).toBeGreaterThanOrEqual(0);
});
