import { expect, test } from "bun:test";
import { DummyMt5Account } from "./dummy-mt5";
import type { GoldDecision, GoldModel } from "./model-mock";
import { parseProofState, PROOF_STATE_VERSION, type GoldProofState } from "./proof-state";
import type { GoldState } from "./state";
import { GoldTrader } from "./trader";

const opts = {
  lot: 0.01,
  slPoints: 600,
  tpPoints: 800,
  point: 0.01,
  contractSize: 100,
  historySize: 50,
  fillMode: "mid" as const,
};

class FixedModel implements GoldModel {
  name = "fixed";
  constructor(private action: GoldDecision["action"] = "buy") {}
  async decide(_state: GoldState): Promise<GoldDecision> {
    return {
      action: this.action,
      probabilities: { buy: this.action === "buy" ? 1 : 0, sell: this.action === "sell" ? 1 : 0, hold: 0 },
      latencyMs: 1,
      inputTokens: 0,
    };
  }
}

test("parseProofState rejects garbage", () => {
  expect(parseProofState(null)).toBeNull();
  expect(parseProofState({})).toBeNull();
  expect(parseProofState({ version: 99 })).toBeNull();
});

test("dummy account export and hydrate round-trips closed trades and P/L", () => {
  const a = new DummyMt5Account(opts);
  a.sync("buy", { bid: 2650, ask: 2650 }, 1_000);
  a.checkStops({ bid: 2658, ask: 2658 }, 2_000);
  expect(a.closedTrades).toHaveLength(1);
  expect(a.realizedPnl).toBeCloseTo(8);
  expect(a.winCount).toBe(1);

  const b = new DummyMt5Account(opts);
  b.hydrate(a.exportState());
  expect(b.closedTrades).toHaveLength(1);
  expect(b.closedTrades[0]?.pnl).toBeCloseTo(8);
  expect(b.realizedPnl).toBeCloseTo(8);
  expect(b.winCount).toBe(1);
  expect(b.lossCount).toBe(0);
  expect(b.openTicket).toBeNull();
  expect(b.lastTicket?.ticket).toBe(1);
});

test("dummy hydrate restores an open ticket and next id", () => {
  const a = new DummyMt5Account(opts);
  a.sync("sell", { bid: 2650, ask: 2650 }, 1_000);
  const b = new DummyMt5Account(opts);
  b.hydrate(a.exportState());
  expect(b.openTicket?.side).toBe("sell");
  expect(b.openTicket?.openPrice).toBe(2650);
  const fills = b.sync("flat", { bid: 2649, ask: 2649 }, 2_000);
  expect(fills[0]?.ticket).toBe(1);
  expect(b.exportState().nextTicket).toBe(2);
});

test("trader proof export survives a fresh trader hydrate", async () => {
  const first = new GoldTrader(new FixedModel("buy"), new DummyMt5Account(opts));
  first.startedAt = 1_700_000_000_000;
  await first.onTick({ bid: 2650, ask: 2650 }, 1_000);
  await first.onTick({ bid: 2658, ask: 2658 }, 2_000);
  const proof = first.exportProof(3_000);
  expect(proof.version).toBe(PROOF_STATE_VERSION);
  expect(proof.dummy?.trades).toHaveLength(1);
  expect(proof.dummy?.realized).toBeCloseTo(8);
  expect(proof.totals.decisions).toBeGreaterThanOrEqual(1);

  const second = new GoldTrader(new FixedModel("buy"), new DummyMt5Account(opts));
  second.hydrateProof(proof);
  const snap = second.snapshot();
  expect(snap.startedAt).toBe(1_700_000_000_000);
  expect(snap.wins).toBe(1);
  expect(snap.realizedUsd).toBeCloseTo(8);
  expect(snap.dummyTrades).toHaveLength(1);
  expect(parseProofState(proof)?.dummy?.trades[0]?.pnl).toBeCloseTo(8);
});

test("parseProofState accepts a full export blob", () => {
  const blob: GoldProofState = {
    version: 1,
    savedAt: 10,
    startedAt: 1,
    seq: 3,
    position: "flat",
    totals: { ticks: 10, decisions: 5, lateTicks: 1, fills: 2, jevUsd: 0.01 },
    dummy: {
      nextTicket: 2,
      open: null,
      trades: [
        {
          ticket: 1,
          side: "buy",
          lots: 0.01,
          openPrice: 2650,
          sl: 2644,
          tp: 2658,
          closePrice: 2658,
          reason: "tp",
          pnl: 8,
          openTs: 1,
          closeTs: 2,
        },
      ],
      realized: 8,
      wins: 1,
      losses: 0,
      last: {
        ticket: 1,
        side: "buy",
        lots: 0.01,
        openPrice: 2650,
        sl: 2644,
        tp: 2658,
        closePrice: 2658,
        reason: "tp",
        pnl: 8,
        openTs: 1,
        closeTs: 2,
      },
    },
  };
  const parsed = parseProofState(blob);
  expect(parsed?.totals.decisions).toBe(5);
  expect(parsed?.dummy?.wins).toBe(1);
});

test("parseProofState keeps the force-pause latch and peak", () => {
  const blob: GoldProofState = {
    version: 1,
    savedAt: 10,
    startedAt: 1,
    seq: 3,
    position: "flat",
    totals: { ticks: 1, decisions: 1, lateTicks: 0, fills: 0, jevUsd: 0 },
    dummy: null,
    entriesForcePaused: true,
    realizedPeak: -41,
  };
  const parsed = parseProofState(blob);
  expect(parsed?.entriesForcePaused).toBe(true);
  expect(parsed?.realizedPeak).toBe(-41);
});
