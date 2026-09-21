import { expect, test } from "bun:test";
import type { GoldDecision, GoldModel } from "./model";
import type { GoldState } from "./state";
import { GoldTrader } from "./trader";
import { startDemoWalk } from "./walk";

class FixedModel implements GoldModel {
  readonly name = "fixed";
  async decide(_state: GoldState): Promise<GoldDecision> {
    return {
      action: "buy",
      probabilities: { buy: 0.7, sell: 0.3, hold: 0 },
      latencyMs: 1,
      inputTokens: 8,
    };
  }
}

test("demo walk posts a tick the model can decide on", async () => {
  const trader = new GoldTrader(new FixedModel());
  const stop = startDemoWalk(trader, 60_000, 2650);
  await Bun.sleep(30);
  stop();
  const s = trader.signal();
  expect(s?.action).toBe("buy");
  expect(s?.mid).toBeGreaterThan(100);
  expect(s?.spreadOk).toBe(true);
  expect(s?.slPoints).toBeGreaterThan(0);
  expect(s?.tpPoints).toBeGreaterThan(0);
});
