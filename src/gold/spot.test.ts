import { expect, test } from "bun:test";
import type { GoldDecision, GoldModel } from "./model";
import { feedKindFromLive, parseGoldSpotPrice, resolveGoldMid, startLiveGoldPoller } from "./spot";
import type { GoldState } from "./state";
import { GoldTrader } from "./trader";

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

test("parseGoldSpotPrice reads gold-api, mid/bid-ask, and yahoo chart", () => {
  expect(parseGoldSpotPrice({ price: 4341.5, symbol: "XAU" })).toBe(4341.5);
  expect(parseGoldSpotPrice({ mid: 4340 })).toBe(4340);
  expect(parseGoldSpotPrice({ bid: 4340, ask: 4342 })).toBe(4341);
  expect(parseGoldSpotPrice({
    chart: { result: [{ meta: { regularMarketPrice: 4330 } }] },
  })).toBe(4330);
  expect(parseGoldSpotPrice({
    chart: { result: [{ indicators: { quote: [{ close: [null, 4328.25] }] } }] },
  })).toBe(4328.25);
  expect(parseGoldSpotPrice({ price: 1 })).toBeNull();
  expect(parseGoldSpotPrice({})).toBeNull();
});

test("resolveGoldMid holds the last live quote when the spot fetch fails", async () => {
  const fail: typeof fetch = async () => new Response("nope", { status: 500 });
  const next = await resolveGoldMid({ mid: 4341.5, live: true }, { fetch: fail });
  expect(next.live).toBe(true);
  expect(next.mid).toBe(4341.5);
});

test("resolveGoldMid walks only when no live quote has landed", async () => {
  const fail: typeof fetch = async () => new Response("nope", { status: 500 });
  const next = await resolveGoldMid({ mid: 2650, live: false }, { fetch: fail });
  expect(next.live).toBe(false);
  expect(next.mid).toBeGreaterThanOrEqual(100);
  expect(next.mid).toBeLessThan(2700);
});

test("resolveGoldMid prefers a fresh live spot over a held mid", async () => {
  const ok: typeof fetch = async () =>
    new Response(JSON.stringify({ price: 4350.1 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  const next = await resolveGoldMid({ mid: 4341.5, live: true }, { fetch: ok, urls: ["https://spot.test/xau"] });
  expect(next.live).toBe(true);
  expect(next.mid).toBe(4350.1);
});

test("startLiveGoldPoller posts a live tick the model can decide on", async () => {
  const fetchFn: typeof fetch = async () =>
    new Response(JSON.stringify({ price: 4341.25 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  const trader = new GoldTrader(new FixedModel());
  const kinds: string[] = [];
  const stop = startLiveGoldPoller(trader, 60_000, {
    fetch: fetchFn,
    refreshMs: 1,
    urls: ["https://spot.test/xau"],
    onSource: (kind) => kinds.push(kind),
  });
  await Bun.sleep(40);
  stop();
  const s = trader.signal();
  expect(s?.action).toBe("buy");
  expect(s?.mid).toBeCloseTo(4341.25, 1);
  expect(s?.slPoints).toBeGreaterThan(0);
  expect(s?.tpPoints).toBeGreaterThan(0);
  expect(kinds).toContain("live");
  expect(feedKindFromLive(true)).toBe("live");
  expect(feedKindFromLive(false)).toBe("demo");
});
