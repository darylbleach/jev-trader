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

function dummyAccount(): DummyMt5Account {
  return new DummyMt5Account({
    lot: 0.01,
    slPoints: 600,
    tpPoints: 800,
    point: 0.01,
    contractSize: 100,
    historySize: 20,
  });
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

  const model = new FixedModel("buy");
  const flip = new GoldTrader(model, dummyAccount());
  await flip.onTick({ bid: 2650, ask: 2650 }, 1_000);
  model.action = "sell";
  await flip.onTick({ bid: 2651.5, ask: 2651.5 }, 2_000);
  const snap = flip.snapshot();
  expect(snap.realizedUsd).toBeCloseTo(1.5);
  expect(snap.unrealizedUsd).toBeCloseTo(0);
  expect(snap.pnlUsd).toBeCloseTo(1.5);
  expect(snap.wins).toBe(1);
  expect(snap.losses).toBe(0);
  expect(snap.lastTicket?.pnl).toBeCloseTo(1.5);
  expect(snap.totals.realizedUsd).toBeCloseTo(1.5);
  expect(snap.totals.pnlUsd).toBeCloseTo(1.5);
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

const dummyOpts = {
  lot: 0.01,
  slPoints: 600,
  tpPoints: 800,
  point: 0.01,
  contractSize: 100,
  historySize: 20,
};

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

test("dummy MT5 reverse closes at mid then opens the other side", async () => {
  const model = new FixedModel("buy");
  const trader = new GoldTrader(model, new DummyMt5Account(dummyOpts));
  await trader.onTick({ bid: 2650, ask: 2650.2 }, 1_000);
  model.action = "sell";
  await trader.onTick({ bid: 2651, ask: 2651.2 }, 2_000);
  const snap = trader.snapshot();
  expect(snap.position).toBe("sell");
  expect(snap.openTicket?.side).toBe("sell");
  expect(snap.dummyTrades).toHaveLength(1);
  expect(snap.dummyTrades[0]?.reason).toBe("signal");
  expect(snap.dummyTrades[0]?.closePrice).toBeCloseTo(2651.1);
  expect(snap.totals.fills).toBe(3);
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

test("dummy MT5 can be disabled", async () => {
  const trader = new GoldTrader(new FixedModel("buy"), null);
  await trader.onTick({ bid: 2650, ask: 2650.2 }, 1_000);
  const snap = trader.snapshot();
  expect(snap.dummyMt5).toBe(false);
  expect(snap.openTicket).toBeNull();
  expect(snap.totals.fills).toBe(0);
});
