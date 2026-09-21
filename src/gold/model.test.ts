import { expect, test } from "bun:test";
import { goldDecisionFromEvaluate } from "./model";

test("Jev buy choice maps to a gold buy decision", () => {
  const d = goldDecisionFromEvaluate("buy", { buy: 0.72, sell: 0.28 }, 94, 1200);
  expect(d.action).toBe("buy");
  expect(d.probabilities.buy).toBeCloseTo(0.72);
  expect(d.probabilities.sell).toBeCloseTo(0.28);
  expect(d.probabilities.hold).toBe(0);
  expect(d.latencyMs).toBe(94);
  expect(d.inputTokens).toBe(1200);
});

test("Jev sell choice maps to a gold sell decision", () => {
  const d = goldDecisionFromEvaluate("sell", { buy: 0.31, sell: 0.69 }, 80, 900);
  expect(d.action).toBe("sell");
  expect(d.probabilities.sell).toBeCloseTo(0.69);
});

test("missing probabilities treat the chosen side as 1", () => {
  const d = goldDecisionFromEvaluate("buy", undefined, 10, 0);
  expect(d.action).toBe("buy");
  expect(d.probabilities.buy).toBe(1);
});
