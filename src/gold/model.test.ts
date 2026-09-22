import { expect, test } from "bun:test";
import { GOLD_QUESTIONS, goldDecisionFromEvaluate, goldModelKind } from "./model";

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

test("gold Jev questions ask for a small scalp, not a swing hold", () => {
  const q = GOLD_QUESTIONS.direction;
  const blob = [
    q.instructions.question,
    q.instructions.goal,
    q.instructions.timing,
    q.instructions.inputs,
    q.criteria.buy,
    q.criteria.sell,
  ].join(" ");
  expect(blob).toMatch(/scalp/i);
  expect(blob).toMatch(/small/i);
  expect(blob).toMatch(/spread/);
  expect(blob).toMatch(/commission/);
  expect(q.criteria.buy).toMatch(/Do not wait for a large uptrend/);
  expect(q.criteria.sell).toMatch(/Do not wait for a large downtrend/);
  expect(q.instructions.goal).toMatch(/Do not hold for a large trend/);
  expect(blob).toContain("$2.50");
  expect(blob).toContain("$1.50");
  expect(blob).toContain("small bounce");
  expect(blob).not.toContain("$0.40");
  expect(blob).not.toContain("$0.60");
  expect(blob).not.toContain("$1.00");
  expect(blob).not.toContain("\u2013");
  expect(blob).not.toContain("\u2014");
});

test("GOLD_MODEL=jev selects Jev at call time even if MODEL is mock", () => {
  expect(goldModelKind({ GOLD_MODEL: "jev", MODEL: "mock" })).toBe("jev");
  expect(goldModelKind({ MODEL: "mock" })).toBe("mock");
  expect(goldModelKind({ GOLD_MODEL: "mock", MODEL: "jev" })).toBe("mock");
});
