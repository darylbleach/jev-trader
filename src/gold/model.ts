import { experimental_evaluate } from "ai";
import { typeSafeAi } from "@ai-sdk/typesafe-ai";
import { GOLD_DEFAULT_SL_POINTS, GOLD_DEFAULT_TP_POINTS, goldConfig } from "./config";
import { GoldMockModel, type GoldAction, type GoldDecision, type GoldModel } from "./model-mock";

const scalpUsd = (points: number) => (points * 0.01).toFixed(2);
const slUsd = scalpUsd(GOLD_DEFAULT_SL_POINTS);
const tpUsd = scalpUsd(GOLD_DEFAULT_TP_POINTS);

export type { GoldAction, GoldDecision, GoldModel };
export { GoldMockModel };

export const GOLD_QUESTIONS = {
  direction: {
    type: "choice",
    instructions: {
      question: "Will the next XAUUSD push reach the small take profit before the small stop?",
      goal: "Scalp XAUUSD gold vs USD on a forex broker. Take lots of small in and out buys and sells. Aim for a short move that beats the spread (`spreadPips`) plus typical commission. Do not hold for a large trend. Ticks arrive continuously. A decision is made about once per `intervalMs`. The open ticket stays on until its stop or take profit. Your latest buy or sell is the side of the next ticket.",
      timing: `The order executes as a market order on the next poll from the leader Expert Advisor, usually within a few hundred milliseconds. Buys fill at the ask and sells fill at the bid. Every fill has a stop about $${slUsd} away and a take profit about $${tpUsd} away. The take profit clears a typical half dollar gold spread with margin. The stop is wider so a small bounce after paying the spread does not end the scalp. Take that win or cut the loss. Do not sit and wait for a multi dollar move.`,
      inputs: "`returnsPips` and `recentMids` show the short path. `spreadPips` is the current bid-ask width in pips. `volume` is tick volume on the last print. If `allowed.buy` is false the trade will not buy, and vice versa.",
    },
    criteria: {
      buy: `Buy gold now for a small scalp: price is more likely to rise about $${tpUsd} (the take profit) before it falls about $${slUsd} (the stop). The move needs to beat the spread and commission. Do not wait for a large uptrend.`,
      sell: `Sell gold now for a small scalp: price is more likely to fall about $${tpUsd} (the take profit) before it rises about $${slUsd} (the stop). The move needs to beat the spread and commission. Do not wait for a large downtrend.`,
    },
  },
} as const;

export function goldDecisionFromEvaluate(
  choice: string,
  probabilities: Record<string, number> | undefined,
  latencyMs: number,
  inputTokens: number,
): GoldDecision {
  const p = probabilities ?? { buy: 0, sell: 0, [choice]: 1 };
  const buy = p.buy ?? 0;
  const sell = p.sell ?? 0;
  const action: GoldAction = choice === "sell" ? "sell" : choice === "hold" ? "hold" : "buy";
  return {
    action,
    probabilities: { buy, sell, hold: action === "hold" ? 1 : 0 },
    latencyMs,
    inputTokens,
  };
}

export class GoldJevModel implements GoldModel {
  readonly name = process.env.JEV_MODEL_ID || goldConfig.jevModelId;
  private model = typeSafeAi.evaluationModel(this.name);

  async decide(state: GoldState): Promise<GoldDecision> {
    const t0 = performance.now();
    const r = await experimental_evaluate({ model: this.model, state: state as any, questions: GOLD_QUESTIONS, maxRetries: 0 });
    const a = r.answers.direction;
    return goldDecisionFromEvaluate(
      a.choice,
      a.probabilities as Record<string, number> | undefined,
      performance.now() - t0,
      r.usage?.inputTokens ?? 0,
    );
  }
}

/** Read GOLD_MODEL at call time so Worker applyWorkerEnv wins over import-time config. */
export function goldModelKind(env: Record<string, string | undefined> = process.env): "mock" | "jev" {
  const raw = env.GOLD_MODEL ?? env.MODEL ?? goldConfig.model;
  return raw === "jev" ? "jev" : "mock";
}

export const createGoldModel = (): GoldModel => (goldModelKind() === "jev" ? new GoldJevModel() : new GoldMockModel());
