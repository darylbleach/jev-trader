import { expect, test } from "bun:test";
import { DummyMt5Account } from "../dummy-mt5";
import type { GoldDecision, GoldModel } from "../model-mock";
import { PROOF_STATE_VERSION, type GoldProofState } from "../proof-state";
import type { GoldState } from "../state";
import { GoldTrader } from "../trader";
import { applyProofBoot, hydrationLooksIntact, resolveProofBoot } from "./proof-boot";

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
  async decide(_state: GoldState): Promise<GoldDecision> {
    return {
      action: "buy",
      probabilities: { buy: 1, sell: 0, hold: 0 },
      latencyMs: 1,
      inputTokens: 0,
    };
  }
}

function sampleProof(overrides: Partial<GoldProofState> = {}): GoldProofState {
  return {
    version: PROOF_STATE_VERSION,
    savedAt: 10,
    startedAt: 1,
    seq: 3,
    position: "flat",
    totals: { ticks: 10, decisions: 5, lateTicks: 0, fills: 1, jevUsd: 0.01 },
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
    ...overrides,
  };
}

test("resolveProofBoot treats missing storage as empty", () => {
  expect(resolveProofBoot(undefined).kind).toBe("empty");
  expect(resolveProofBoot(null).kind).toBe("empty");
});

test("resolveProofBoot hydrates a valid proof blob", () => {
  const result = resolveProofBoot(sampleProof());
  expect(result.kind).toBe("hydrated");
  if (result.kind === "hydrated") {
    expect(result.proof.dummy?.wins).toBe(1);
    expect(result.proof.dummy?.trades).toHaveLength(1);
  }
});

test("resolveProofBoot marks present-but-invalid storage as corrupt", () => {
  expect(resolveProofBoot({ version: 99 }).kind).toBe("corrupt");
  expect(resolveProofBoot({ version: 1, savedAt: "bad" }).kind).toBe("corrupt");
  expect(resolveProofBoot("not-json").kind).toBe("corrupt");
});

test("applyProofBoot refuses empty boot when proof key is corrupt", () => {
  const trader = new GoldTrader(new FixedModel(), new DummyMt5Account(opts));
  expect(() => applyProofBoot(trader, { version: 1 })).toThrow(/unreadable/);
  expect(trader.snapshot().wins).toBe(0);
  expect(trader.snapshot().dummyTrades).toHaveLength(0);
});

test("applyProofBoot never starts empty when a valid proof key exists", async () => {
  const first = new GoldTrader(new FixedModel(), new DummyMt5Account(opts));
  first.startedAt = 1_700_000_000_000;
  await first.onTick({ bid: 2650, ask: 2650 }, 1_000);
  await first.onTick({ bid: 2658, ask: 2658 }, 2_000);
  const proof = first.exportProof(3_000);
  expect(proof.dummy?.trades.length).toBe(1);

  const second = new GoldTrader(new FixedModel(), new DummyMt5Account(opts));
  const mode = applyProofBoot(second, proof);
  expect(mode).toBe("hydrated");
  const snap = second.snapshot();
  expect(snap.startedAt).toBe(1_700_000_000_000);
  expect(snap.wins).toBe(1);
  expect(snap.realizedUsd).toBeCloseTo(8);
  expect(snap.dummyTrades).toHaveLength(1);
  expect(hydrationLooksIntact(proof, snap)).toBe(true);
});

test("hydrationLooksIntact fails when wins diverge after restore", () => {
  const proof = sampleProof();
  expect(
    hydrationLooksIntact(proof, {
      wins: 0,
      losses: 0,
      realizedUsd: 8,
      dummyTrades: proof.dummy!.trades,
    }),
  ).toBe(false);
});
