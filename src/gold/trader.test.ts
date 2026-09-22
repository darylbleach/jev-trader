import { expect, test } from "bun:test";
import { DummyMt5Account } from "./dummy-mt5";
import type { GoldDecision, GoldModel } from "./model";
import type { GoldState } from "./state";
import { GoldTrader } from "./trader";

class FixedModel implements GoldModel {
  readonly name = "fixed";
  constructor(public action: GoldDecision["action"] = "buy") {}
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
  expect(snap.slPoints).toBe(200);
  expect(snap.tpPoints).toBe(300);
  expect(snap.horizonMs).toBe(10000);
  expect(snap.fillMode).toBe("book");
  expect(snap.pauseRealizedUsd).toBe(-20);
  expect(snap.pauseFloorUsd).toBe(-80);
  expect(snap.entriesPaused).toBe(false);
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

const dummyOpts = {
  lot: 0.01,
  slPoints: 600,
  tpPoints: 800,
  point: 0.01,
  contractSize: 100,
  historySize: 20,
  fillMode: "mid" as const,
};

function dummyAccount() {
  return new DummyMt5Account(dummyOpts);
}

test("dry-run snapshot exposes realized, open, total, and last ticket pnl", async () => {
  const trader = new GoldTrader(new FixedModel("buy"), dummyAccount());
  await trader.onTick({ bid: 2650, ask: 2650.2 }, 1_000);
  const open = trader.snapshot();
  expect(open.simulated).toBe(true);
  expect(open.openTicket?.side).toBe("buy");
  expect(open.unrealizedUsd).toBeCloseTo(0);
  expect(open.totals.unrealizedUsd).toBeCloseTo(0);
  expect(open.dummyPnl.totalUsd).toBeCloseTo(0);

  const held = new GoldTrader(new FixedModel("buy"), dummyAccount());
  await held.onTick({ bid: 2650, ask: 2650 }, 1_000);
  await held.onTick({ bid: 2658, ask: 2658 }, 2_000);
  const snap = held.snapshot();
  expect(snap.lastTicket?.reason).toBe("tp");
  expect(snap.realizedUsd).toBeCloseTo(8);
  expect(snap.unrealizedUsd).toBeCloseTo(0);
  expect(snap.pnlUsd).toBeCloseTo(8);
  expect(snap.wins).toBe(1);
  expect(snap.losses).toBe(0);
  expect(snap.lastTicket?.pnl).toBeCloseTo(8);
  expect(snap.totals.realizedUsd).toBeCloseTo(8);
  expect(snap.totals.pnlUsd).toBeCloseTo(8);
  expect(snap.dummyPnl.wins).toBe(1);
});

test("a late tick still marks dummy open pnl", async () => {
  const trader = new GoldTrader(new FixedModel("buy"), dummyAccount());
  await trader.onTick({ bid: 2650, ask: 2650 }, 1_000);
  await trader.onTick({ bid: 2651, ask: 2651 }, 1_100);
  const snap = trader.snapshot();
  expect(snap.totals.lateTicks).toBe(1);
  expect(snap.openTicket?.side).toBe("buy");
  expect(snap.unrealizedUsd).toBeCloseTo(1);
  expect(trader.history.at(-1)?.pnl?.unrealizedUsd).toBeCloseTo(1);
});

test("dummy MT5 opens a buy ticket on the first signal", async () => {
  const trader = new GoldTrader(new FixedModel("buy"), new DummyMt5Account(dummyOpts));
  const fills: string[] = [];
  trader.onFill = (f) => fills.push(`${f.kind}:${f.side}`);
  await trader.onTick({ bid: 2650, ask: 2650.2 }, 1_000);
  const snap = trader.snapshot();
  expect(snap.dummyMt5).toBe(true);
  expect(snap.openTicket?.side).toBe("buy");
  expect(snap.openTicket?.openPrice).toBeCloseTo(2650.1);
  expect(snap.openTicket?.sl).toBeCloseTo(2644.1);
  expect(snap.openTicket?.tp).toBeCloseTo(2658.1);
  expect(fills).toEqual(["open:buy"]);
  expect(snap.totals.fills).toBe(1);
});

test("default book fill mode buys at ask on the live trader", async () => {
  const trader = new GoldTrader(
    new FixedModel("buy"),
    new DummyMt5Account({ ...dummyOpts, fillMode: "book" }),
  );
  await trader.onTick({ bid: 2650, ask: 2650.5 }, 1_000);
  const snap = trader.snapshot();
  expect(snap.fillMode).toBe("book");
  expect(snap.openTicket?.openPrice).toBeCloseTo(2650.5);
  expect(snap.unrealizedUsd).toBeCloseTo(-0.5);
});

test("dummy MT5 holds a reverse while the live mid is unchanged", async () => {
  const model = new FixedModel("buy");
  const trader = new GoldTrader(model, new DummyMt5Account(dummyOpts));
  await trader.onTick({ bid: 2650, ask: 2650 }, 1_000);
  model.action = "sell";
  await trader.onTick({ bid: 2650, ask: 2650 }, 2_000);
  const snap = trader.snapshot();
  expect(snap.latest?.action).toBe("sell");
  expect(snap.position).toBe("buy");
  expect(snap.openTicket?.side).toBe("buy");
  expect(snap.openTicket?.openPrice).toBe(2650);
  expect(snap.dummyTrades).toHaveLength(0);
  expect(snap.wins).toBe(0);
  expect(snap.losses).toBe(0);
  expect(snap.realizedUsd).toBe(0);
  expect(snap.totals.fills).toBe(1);
});

test("an opposite signal leaves the open scalp on", async () => {
  const model = new FixedModel("buy");
  const trader = new GoldTrader(model, new DummyMt5Account(dummyOpts));
  await trader.onTick({ bid: 2650, ask: 2650.2 }, 1_000);
  model.action = "sell";
  await trader.onTick({ bid: 2651, ask: 2651.2 }, 2_000);
  const snap = trader.snapshot();
  expect(snap.latest?.action).toBe("sell");
  expect(snap.position).toBe("buy");
  expect(snap.openTicket?.side).toBe("buy");
  expect(snap.dummyTrades).toHaveLength(0);
  expect(snap.totals.fills).toBe(1);
});

test("after take profit the next decision opens the new side", async () => {
  const model = new FixedModel("buy");
  const trader = new GoldTrader(model, new DummyMt5Account(dummyOpts));
  await trader.onTick({ bid: 2650, ask: 2650.2 }, 1_000);
  model.action = "sell";
  await trader.onTick({ bid: 2658.1, ask: 2658.3 }, 3_000);
  const snap = trader.snapshot();
  expect(snap.dummyTrades[0]?.reason).toBe("tp");
  expect(snap.dummyTrades[0]?.pnl).toBeGreaterThan(0);
  expect(snap.openTicket?.side).toBe("sell");
  expect(snap.position).toBe("sell");
});

test("dummy MT5 closes on SL touch while the ticket is open", async () => {
  const trader = new GoldTrader(new FixedModel("buy"), new DummyMt5Account(dummyOpts));
  await trader.onTick({ bid: 2650, ask: 2650.2 }, 1_000);
  await trader.onTick({ bid: 2643.9, ask: 2644.1 }, 1_100);
  const snap = trader.snapshot();
  expect(snap.openTicket).toBeNull();
  expect(snap.dummyTrades[0]?.reason).toBe("sl");
  expect(snap.dummyTrades[0]?.pnl).toBeLessThan(0);
  expect(trader.history.at(-1)?.late).toBe(true);
});

test("dummy MT5 closes on TP touch", async () => {
  const trader = new GoldTrader(new FixedModel("buy"), new DummyMt5Account(dummyOpts));
  await trader.onTick({ bid: 2650, ask: 2650.2 }, 1_000);
  await trader.onTick({ bid: 2658.1, ask: 2658.3 }, 1_100);
  const snap = trader.snapshot();
  expect(snap.dummyTrades[0]?.reason).toBe("tp");
  expect(snap.dummyTrades[0]?.pnl).toBeGreaterThan(0);
});

test("a broker stop flattens the published position", async () => {
  const trader = new GoldTrader(new FixedModel("buy"), null);
  await trader.onTick({ bid: 2650, ask: 2650.2 }, 1_000);
  expect(trader.snapshot().position).toBe("buy");
  trader.reportFill({
    ticket: 9,
    side: "buy",
    lots: 0.01,
    price: 2644,
    symbol: "XAUUSD",
    kind: "close",
    reason: "sl",
  });
  expect(trader.snapshot().position).toBe("flat");
  expect(trader.signal()?.position).toBe("flat");
});

test("dummy MT5 can be disabled", async () => {
  const trader = new GoldTrader(new FixedModel("buy"), null);
  await trader.onTick({ bid: 2650, ask: 2650.2 }, 1_000);
  const snap = trader.snapshot();
  expect(snap.dummyMt5).toBe(false);
  expect(snap.openTicket).toBeNull();
  expect(snap.totals.fills).toBe(0);
});

function closedLoss(ticket: number, pnl: number): import("./types").DummyTrade {
  return {
    ticket,
    side: "buy",
    lots: 0.01,
    openPrice: 2650,
    sl: 2650 + pnl,
    tp: 2652,
    closePrice: 2650 + pnl,
    reason: "sl",
    pnl,
    openTs: ticket,
    closeTs: ticket + 1,
  };
}

function hydrateFlat(trader: GoldTrader, trades: import("./types").DummyTrade[]): void {
  const realized = trades.reduce((sum, t) => sum + t.pnl, 0);
  const losses = trades.filter((t) => t.pnl < 0).length;
  const wins = trades.filter((t) => t.pnl > 0).length;
  trader.hydrateProof({
    version: 1,
    savedAt: 1,
    startedAt: 1,
    seq: 0,
    position: "flat",
    totals: { ticks: 0, decisions: 0, lateTicks: 0, fills: 0, jevUsd: 0 },
    dummy: {
      nextTicket: trades.length + 1,
      open: null,
      trades,
      realized,
      wins,
      losses,
      last: trades.at(-1) ?? null,
    },
  });
}

test("drawdown pause blocks new entries until POST resume", async () => {
  const trader = new GoldTrader(new FixedModel("buy"), new DummyMt5Account({ ...dummyOpts, fillMode: "book" }));
  hydrateFlat(trader, [closedLoss(1, -20)]);
  expect(trader.snapshot().realizedUsd).toBe(-20);
  expect(trader.snapshot().entriesPaused).toBe(true);
  expect(trader.snapshot().pauseReason).toBe("drawdown");
  expect(trader.snapshot().realizedPeak).toBe(0);

  await trader.onTick({ bid: 2650, ask: 2650.5 }, 1_000);
  expect(trader.snapshot().openTicket).toBeNull();
  expect(trader.snapshot().position).toBe("flat");
  expect(trader.snapshot().entriesPaused).toBe(true);

  const resumed = trader.resumeEntries();
  expect(resumed.ok).toBe(true);
  expect(resumed.entriesPaused).toBe(false);
  expect(trader.snapshot().entriesPaused).toBe(false);
  expect(trader.snapshot().realizedPeak).toBe(-20);

  await trader.onTick({ bid: 2650, ask: 2650.5 }, 2_000);
  expect(trader.snapshot().openTicket?.side).toBe("buy");
  expect(trader.snapshot().entriesPaused).toBe(false);
});

test("peak drawdown pauses $20 under a green start", async () => {
  const trader = new GoldTrader(new FixedModel("buy"), new DummyMt5Account({ ...dummyOpts, fillMode: "book" }));
  hydrateFlat(trader, [closedLoss(1, 11), closedLoss(2, -20)]);
  expect(trader.snapshot().realizedUsd).toBe(-9);
  expect(trader.snapshot().realizedPeak).toBe(11);
  expect(trader.snapshot().entriesPaused).toBe(true);
  expect(trader.snapshot().pauseReason).toBe("drawdown");
  await trader.onTick({ bid: 2650, ask: 2650.5 }, 1_000);
  expect(trader.snapshot().openTicket).toBeNull();
});

test("hard floor stays paused after resume so overnight cannot print another deep hole", async () => {
  const trader = new GoldTrader(new FixedModel("buy"), new DummyMt5Account({ ...dummyOpts, fillMode: "book" }));
  hydrateFlat(trader, [closedLoss(1, 11), closedLoss(2, -96)]);
  expect(trader.snapshot().realizedUsd).toBe(-85);
  expect(trader.snapshot().entriesPaused).toBe(true);
  expect(trader.snapshot().pauseReason).toBe("floor");
  const resumed = trader.resumeEntries();
  expect(resumed.entriesPaused).toBe(true);
  expect(resumed.pauseReason).toBe("floor");
  expect(trader.snapshot().entriesPaused).toBe(true);
  await trader.onTick({ bid: 2650, ask: 2650.5 }, 1_000);
  expect(trader.snapshot().openTicket).toBeNull();
});

test("after a watched resume another deep hole re-pauses at the hard floor", async () => {
  const trader = new GoldTrader(new FixedModel("buy"), new DummyMt5Account({ ...dummyOpts, fillMode: "book" }));
  hydrateFlat(trader, [closedLoss(1, -20)]);
  expect(trader.resumeEntries().entriesPaused).toBe(false);
  hydrateFlat(trader, [closedLoss(1, -20), closedLoss(2, -60)]);
  expect(trader.snapshot().realizedUsd).toBe(-80);
  expect(trader.snapshot().entriesPaused).toBe(true);
  expect(trader.snapshot().pauseReason).toBe("floor");
  await trader.onTick({ bid: 2650, ask: 2650.5 }, 1_000);
  expect(trader.snapshot().openTicket).toBeNull();
});

test("POST /pause blocks new entries and survives proof hydrate", async () => {
  const trader = new GoldTrader(new FixedModel("buy"), new DummyMt5Account({ ...dummyOpts, fillMode: "book" }));
  hydrateFlat(trader, [closedLoss(1, -9)]);
  expect(trader.snapshot().entriesPaused).toBe(false);
  const paused = trader.pauseEntries();
  expect(paused.ok).toBe(true);
  expect(paused.entriesPaused).toBe(true);
  expect(paused.pauseReason).toBe("manual");
  expect(trader.snapshot().entriesPaused).toBe(true);

  await trader.onTick({ bid: 2650, ask: 2650.5 }, 1_000);
  expect(trader.snapshot().openTicket).toBeNull();
  expect(trader.snapshot().entriesPaused).toBe(true);
  expect(trader.snapshot().pauseReason).toBe("manual");

  const proof = trader.exportProof(2_000);
  expect(proof.entriesForcePaused).toBe(true);
  const restored = new GoldTrader(new FixedModel("buy"), new DummyMt5Account({ ...dummyOpts, fillMode: "book" }));
  restored.hydrateProof(proof);
  expect(restored.snapshot().entriesPaused).toBe(true);
  expect(restored.snapshot().pauseReason).toBe("manual");
  expect(restored.snapshot().realizedUsd).toBe(-9);
  await restored.onTick({ bid: 2650, ask: 2650.5 }, 3_000);
  expect(restored.snapshot().openTicket).toBeNull();

  expect(restored.resumeEntries().entriesPaused).toBe(false);
  await restored.onTick({ bid: 2650, ask: 2650.5 }, 4_000);
  expect(restored.snapshot().openTicket?.side).toBe("buy");
});

test("resetSession wipes scored tape, clears force pause, and refreshes startedAt", async () => {
  const trader = new GoldTrader(new FixedModel("buy"), new DummyMt5Account({ ...dummyOpts, fillMode: "book" }));
  hydrateFlat(trader, [closedLoss(1, 11), closedLoss(2, -20), closedLoss(3, -38)]);
  trader.pauseEntries();
  expect(trader.snapshot().wins + trader.snapshot().losses).toBe(3);
  expect(trader.snapshot().realizedUsd).toBe(-47);
  expect(trader.snapshot().entriesPaused).toBe(true);
  expect(trader.exportProof().entriesForcePaused).toBe(true);
  const beforeStarted = trader.startedAt;

  const wiped = trader.resetSession(9_000);
  expect(wiped.ok).toBe(true);
  expect(wiped.startedAt).toBe(9_000);
  expect(wiped.wins).toBe(0);
  expect(wiped.losses).toBe(0);
  expect(wiped.realizedUsd).toBe(0);
  expect(wiped.entriesPaused).toBe(false);
  expect(wiped.entriesForcePaused).toBe(false);
  expect(wiped.openTicket).toBeNull();

  const snap = trader.snapshot();
  expect(snap.startedAt).toBe(9_000);
  expect(snap.startedAt).not.toBe(beforeStarted);
  expect(snap.wins).toBe(0);
  expect(snap.losses).toBe(0);
  expect(snap.realizedUsd).toBe(0);
  expect(snap.dummyTrades).toHaveLength(0);
  expect(snap.openTicket).toBeNull();
  expect(snap.entriesPaused).toBe(false);
  expect(snap.pauseReason).toBeNull();
  expect(snap.realizedPeak).toBe(0);
  expect(trader.exportProof(9_001).entriesForcePaused).toBe(false);
  expect(trader.exportProof(9_001).dummy?.trades).toHaveLength(0);

  await trader.onTick({ bid: 2650, ask: 2650.5 }, 10_000);
  expect(trader.snapshot().openTicket?.side).toBe("buy");
  expect(trader.snapshot().entriesPaused).toBe(false);
});
