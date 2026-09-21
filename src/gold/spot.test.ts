import { expect, test } from "bun:test";
import type { GoldDecision, GoldModel } from "./model";
import { feedKindFromLive, parseGoldSpotPrice, parseGoldSpotQuote, resolveGoldMid, startLiveGoldPoller, stepLiveGoldQuote } from "./spot";
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

const swissBook = [
  {
    topo: { platform: "AT", server: "AT" },
    spreadProfilePrices: [{ spreadProfile: "standard", bid: 100, ask: 200 }],
  },
  {
    topo: { platform: "SwissquoteLtd", server: "Live5" },
    spreadProfilePrices: [
      { spreadProfile: "premium", bid: 4348.1, ask: 4348.9 },
      { spreadProfile: "elite", bid: 4348.2, ask: 4348.7 },
    ],
  },
];

test("parseGoldSpotQuote prefers the Swissquote elite bid and ask", () => {
  const quote = parseGoldSpotQuote(swissBook);
  expect(quote?.book).toBe(true);
  expect(quote?.bid).toBeCloseTo(4348.2);
  expect(quote?.ask).toBeCloseTo(4348.7);
  expect(quote?.mid).toBeCloseTo(4348.45);
});

test("parseGoldSpotPrice reads gold-api, mid/bid-ask, and yahoo chart", () => {
  expect(parseGoldSpotPrice({ price: 4341.5, symbol: "XAU" })).toBe(4341.5);
  expect(parseGoldSpotQuote({ price: 4341.5 })?.book).toBe(false);
  expect(parseGoldSpotPrice({ mid: 4340 })).toBe(4340);
  expect(parseGoldSpotPrice({ bid: 4340, ask: 4342 })).toBe(4341);
  expect(parseGoldSpotQuote({ bid: 4340, ask: 4342 })?.book).toBe(true);
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

test("resolveGoldMid prefers a live book over an earlier printed mid", async () => {
  const fetchFn: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("gold-api")) {
      return new Response(JSON.stringify({ price: 4400 }), { status: 200 });
    }
    return new Response(JSON.stringify(swissBook), { status: 200 });
  };
  const next = await resolveGoldMid(
    { mid: 4300, live: true },
    { fetch: fetchFn, urls: ["https://api.gold-api.com/price/XAU", "https://forex-data-feed.swissquote.com/xau"] },
  );
  expect(next.live).toBe(true);
  expect(next.bid).toBeCloseTo(4348.2);
  expect(next.ask).toBeCloseTo(4348.7);
  expect(next.mid).toBeCloseTo(4348.45);
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

test("stepLiveGoldQuote holds a fresh live mid until refreshMs elapses", async () => {
  let hits = 0;
  const fetchFn: typeof fetch = async () => {
    hits += 1;
    return new Response(JSON.stringify({ price: 4341 + hits }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const first = await stepLiveGoldQuote(
    { mid: null, live: false, lastFetch: 0 },
    1_000,
    { fetch: fetchFn, refreshMs: 1000, urls: ["https://spot.test/xau"] },
  );
  expect(first.live).toBe(true);
  expect(first.mid).toBe(4342);
  expect(hits).toBe(1);
  const held = await stepLiveGoldQuote(first, 1_500, {
    fetch: fetchFn,
    refreshMs: 1000,
    urls: ["https://spot.test/xau"],
  });
  expect(held.mid).toBe(4342);
  expect(held.lastFetch).toBe(1_000);
  expect(hits).toBe(1);
  const refreshed = await stepLiveGoldQuote(held, 2_000, {
    fetch: fetchFn,
    refreshMs: 1000,
    urls: ["https://spot.test/xau"],
  });
  expect(refreshed.mid).toBe(4343);
  expect(refreshed.lastFetch).toBe(2_000);
  expect(hits).toBe(2);
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
