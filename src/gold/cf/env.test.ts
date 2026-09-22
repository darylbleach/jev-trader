import { expect, test } from "bun:test";
import { applyWorkerEnv, GOLD_ENV_KEYS } from "./env";

test("GOLD_ENV_KEYS includes GOLD_MODEL and TYPESAFE_AI_API_KEY", () => {
  expect(GOLD_ENV_KEYS).toContain("GOLD_MODEL");
  expect(GOLD_ENV_KEYS).toContain("TYPESAFE_AI_API_KEY");
  expect(GOLD_ENV_KEYS).toContain("JEV_MODEL_ID");
  expect(GOLD_ENV_KEYS).toContain("GOLD_MIN_REVERSE_POINTS");
  expect(GOLD_ENV_KEYS).toContain("GOLD_FILL_MODE");
  expect(GOLD_ENV_KEYS).toContain("GOLD_PAUSE_REALIZED_USD");
});

test("applyWorkerEnv copies GOLD_MODEL and TYPESAFE_AI_API_KEY onto process.env", () => {
  const prevModel = process.env.GOLD_MODEL;
  const prevKey = process.env.TYPESAFE_AI_API_KEY;
  try {
    applyWorkerEnv({
      GOLD_MODEL: "jev",
      TYPESAFE_AI_API_KEY: "test-worker-secret",
      JEV_MODEL_ID: "jev-latest",
    });
    expect(process.env.GOLD_MODEL).toBe("jev");
    expect(process.env.TYPESAFE_AI_API_KEY).toBe("test-worker-secret");
    expect(process.env.JEV_MODEL_ID).toBe("jev-latest");
  } finally {
    if (prevModel === undefined) delete process.env.GOLD_MODEL;
    else process.env.GOLD_MODEL = prevModel;
    if (prevKey === undefined) delete process.env.TYPESAFE_AI_API_KEY;
    else process.env.TYPESAFE_AI_API_KEY = prevKey;
  }
});
