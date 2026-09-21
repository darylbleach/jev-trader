import { expect, test } from "bun:test";
import { createSseHub, handleGoldHttp, parseFill, type GoldHttpTrader, type GoldMeta } from "./http";
import type { GoldFill, GoldSignal } from "../types";

const meta: GoldMeta = {
  model: "mock",
  market: "XAUUSD",
  dryRun: true,
  startedAt: 1,
  feed: "demo",
};

function fakeTrader(overrides: Partial<GoldHttpTrader> = {}): GoldHttpTrader {
  let latest: GoldSignal | null = null;
  const fills: GoldFill[] = [];
  return {
    history: [],
    snapshot: () => ({ model: "mock", latest, fills }),
    signal: () => latest,
    async onTick(tick) {
      latest = {
        ts: Date.now(),
        seq: 1,
        mid: (tick.bid + tick.ask) / 2,
        bid: tick.bid,
        ask: tick.ask,
        spreadPips: 10,
        action: "buy",
        probabilities: { buy: 0.6, sell: 0.4, hold: 0 },
        latencyMs: 5,
        late: false,
        sim: true,
        lot: 0.01,
        slPoints: 600,
        tpPoints: 800,
        position: "buy",
        reverse: true,
        spreadOk: true,
      };
    },
    reportFill(fill) {
      fills.push(fill);
      return fill;
    },
    ...overrides,
  };
}

test("parseFill needs ticket side lots price", () => {
  expect(parseFill({})).toBeNull();
  expect(parseFill({ ticket: 7, side: "buy", lots: 0.01, price: 2650, kind: "open" })?.ticket).toBe(7);
});

test("GET /status and /signal /tick /fill", async () => {
  const trader = fakeTrader();
  const hub = createSseHub();
  const status = await handleGoldHttp(new Request("https://demo.test/status"), trader, meta, hub);
  expect(status.status).toBe(200);
  const body = await status.json() as { market: string; feed: string };
  expect(body.market).toBe("XAUUSD");
  expect(body.feed).toBe("demo");

  const missing = await handleGoldHttp(new Request("https://demo.test/signal"), trader, meta, hub);
  expect(missing.status).toBe(404);

  const tick = await handleGoldHttp(new Request("https://demo.test/tick", {
    method: "POST",
    body: JSON.stringify({ mid: 2651 }),
  }), trader, meta, hub);
  expect(tick.status).toBe(200);
  const t = await tick.json() as { ok: boolean; latest: { action: string } };
  expect(t.ok).toBe(true);
  expect(t.latest.action).toBe("buy");

  const fill = await handleGoldHttp(new Request("https://demo.test/fill", {
    method: "POST",
    body: JSON.stringify({ ticket: 1, side: "buy", lots: 0.01, price: 2651 }),
  }), trader, meta, hub);
  expect(fill.status).toBe(200);
});

test("GET /events is an SSE snapshot stream", async () => {
  const trader = fakeTrader();
  const hub = createSseHub();
  const res = await handleGoldHttp(new Request("https://demo.test/events"), trader, meta, hub);
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toContain("text/event-stream");
  const reader = res.body?.getReader();
  expect(reader).toBeTruthy();
  const first = await reader!.read();
  const text = new TextDecoder().decode(first.value);
  expect(text).toContain("event: snapshot");
  expect(text).not.toContain("\u2013");
  expect(text).not.toContain("\u2014");
  await reader!.cancel();
  expect(hub.size).toBe(0);
});
