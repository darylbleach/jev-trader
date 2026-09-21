import { expect, test } from "bun:test";
import { DecisionThrottle } from "./throttle";

test("first tick runs", () => {
  const t = new DecisionThrottle(1000);
  expect(t.tryStart(100)).toEqual({ kind: "run" });
  expect(t.inFlight).toBe(true);
});

test("tick inside the interval is late", () => {
  const t = new DecisionThrottle(1000);
  expect(t.tryStart(0).kind).toBe("run");
  t.finish();
  expect(t.tryStart(999)).toEqual({ kind: "late", reason: "interval" });
});

test("tick after the interval runs again", () => {
  const t = new DecisionThrottle(1000);
  expect(t.tryStart(0).kind).toBe("run");
  t.finish();
  expect(t.tryStart(1000).kind).toBe("run");
});

test("in-flight tick is late even after the interval", () => {
  const t = new DecisionThrottle(1000);
  expect(t.tryStart(0).kind).toBe("run");
  expect(t.tryStart(5000)).toEqual({ kind: "late", reason: "busy" });
  t.finish();
  expect(t.tryStart(5000).kind).toBe("run");
});
