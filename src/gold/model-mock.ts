import { sleep } from "./sleep";
import type { GoldState } from "./state";

export type GoldAction = "buy" | "sell" | "hold";

export interface GoldDecision {
  action: GoldAction;
  probabilities: Record<GoldAction, number>;
  latencyMs: number;
  inputTokens: number;
}

export interface GoldModel {
  readonly name: string;
  decide(state: GoldState): Promise<GoldDecision>;
}

/** Deterministic stand-in: recent momentum plus a little noise so it trades both ways. */
export class GoldMockModel implements GoldModel {
  readonly name = "mock";

  async decide(state: GoldState): Promise<GoldDecision> {
    const t0 = performance.now();
    const signal = state.returnsPips.last20 / 8 + this.noise(state.ts);
    const buy = 1 / (1 + Math.exp(-signal));
    const probabilities = { buy, sell: 1 - buy, hold: 0 };
    const action: GoldAction = buy >= 0.5 ? "buy" : "sell";
    await sleep(80);
    return {
      action,
      probabilities,
      latencyMs: performance.now() - t0,
      inputTokens: Math.round(JSON.stringify(state).length / 4),
    };
  }

  private noise(ts: number) {
    let h = (Math.floor(ts) * 2654435761) >>> 0;
    h ^= h >>> 15;
    h = (h * 2246822519) >>> 0;
    h ^= h >>> 13;
    return ((h % 1000) / 1000 - 0.5) * 3;
  }
}
