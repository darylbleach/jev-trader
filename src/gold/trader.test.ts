import { expect, test } from "bun:test";
import type { GoldDecision, GoldModel } from "./model";
import type { GoldState } from "./state";
import { GoldTrader } from "./trader";

class FixedModel implements GoldModel {
  readonly name = "fixed";
  constructor(private action: GoldDecision["action"] = "buy") {}
  async decide(_state: GoldState): Promise<GoldDecision> {
    return {
      action: this.action,
      probabilities: { buy: this.action === "buy" ? 0.8 : 0.2, sell: this.action === "sell" ? 0.8 : 0.2, hold: 0 },
      latencyMs: 1,
      inputTokens: 10,
    };
  }
}

test("first tick produces a signal", async () => {
  const trader = new GoldTrader(new FixedModel("buy"));
  await trader.onTick({ bid: 2650, ask: 2650.2 }, 1_000);
  const s = trader.signal();
  expect(s?.action).toBe("buy");
  expect(s?.late).toBe(false);
  expect(s?.position).toBe("buy");
  expect(s?.seq).toBe(1);
  expect(s?.slPoints).toBeGreaterThan(0);
  expect(s?.tpPoints).toBeGreaterThan(0);
});

test("signal carries non-zero SL and TP points from gold config", async () => {
  const trader = new GoldTrader(new FixedModel("buy"));
  await trader.onTick({ bid: 2650, ask: 2650.2 }, 1_000);
  const s = trader.signal();
  const snap = trader.snapshot();
  expect(s?.slPoints).toBe(snap.slPoints);
  expect(s?.tpPoints).toBe(snap.tpPoints);
  expect(snap.slPoints).toBe(600);
  expect(snap.tpPoints).toBe(800);
  expect(snap.horizonMs).toBe(6000);
});

test("overlapping ticks mark late and keep the last signal", async () => {
  const trader = new GoldTrader(new FixedModel("buy"));
  await trader.onTick({ bid: 2650, ask: 2650.2 }, 1_000);
  await trader.onTick({ bid: 2651, ask: 2651.2 }, 1_100);
  const s = trader.signal();
  expect(s?.seq).toBe(1);
  expect(s?.mid).toBeCloseTo(2650.1);
  expect(trader.history.at(-1)?.late).toBe(true);
  expect(trader.snapshot().totals.lateTicks).toBe(1);
  expect(trader.snapshot().totals.decisions).toBe(1);
});

test("a later tick after the interval decides again", async () => {
  const model = new FixedModel("sell");
  const trader = new GoldTrader(model);
  await trader.onTick({ bid: 2650, ask: 2650.2 }, 1_000);
  await trader.onTick({ bid: 2649, ask: 2649.2 }, 2_000);
  expect(trader.signal()?.action).toBe("sell");
  expect(trader.signal()?.seq).toBe(2);
  expect(trader.snapshot().position).toBe("sell");
});
