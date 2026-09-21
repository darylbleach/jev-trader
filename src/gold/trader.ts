import { goldConfig } from "./config";
import type { GoldModel } from "./model";
import { nextPosition, type PositionSide, type SignalSide } from "./policy";
import { MidRing, type GoldTick } from "./state";
import { DecisionThrottle } from "./throttle";
import type { GoldEvent, GoldFill, GoldSignal, GoldTotals } from "./types";

export class GoldTrader {
  readonly history: GoldEvent[] = [];
  private ring = new MidRing();
  private throttle = new DecisionThrottle(goldConfig.intervalMs);
  private lastTick: GoldTick | null = null;
  private lastSignal: GoldSignal | null = null;
  private position: PositionSide = "flat";
  private fills: GoldFill[] = [];
  private seq = 0;
  private totals: GoldTotals = { ticks: 0, decisions: 0, lateTicks: 0, fills: 0, jevUsd: 0 };
  private lastError: string | null = null;

  onEvent: (e: GoldEvent) => void = () => {};
  onSignal: (s: GoldSignal) => void = () => {};
  onFill: (f: GoldFill) => void = () => {};

  constructor(private model: GoldModel) {}

  snapshot() {
    return {
      model: this.model.name,
      market: "XAUUSD" as const,
      dryRun: goldConfig.dryRun,
      startedAt: this.startedAt,
      intervalMs: goldConfig.intervalMs,
      horizonMs: goldConfig.horizonMs,
      lot: goldConfig.lot,
      reverse: goldConfig.reverse,
      position: this.position,
      latest: this.lastSignal,
      totals: this.totals,
      error: this.lastError,
    };
  }

  readonly startedAt = Date.now();

  signal(): GoldSignal | null {
    return this.lastSignal;
  }

  async onTick(tick: GoldTick, now = Date.now()): Promise<void> {
    this.totals.ticks++;
    this.lastTick = tick;
    const mid = (tick.bid + tick.ask) / 2;
    this.ring.push(mid);

    const gate = this.throttle.tryStart(now);
    if (gate.kind === "late") {
      this.totals.lateTicks++;
      const event: GoldEvent = {
        ts: now,
        mid,
        bid: tick.bid,
        ask: tick.ask,
        spreadPips: this.lastSignal?.spreadPips ?? 0,
        decision: this.lastSignal,
        fill: null,
        late: true,
        lateReason: gate.reason,
      };
      this.pushHistory(event);
      this.onEvent(event);
      return;
    }

    try {
      const state = this.ring.build(tick, {
        ts: now,
        horizonMs: goldConfig.horizonMs,
        intervalMs: goldConfig.intervalMs,
        point: goldConfig.point,
        maxSpreadPips: goldConfig.maxSpreadPips,
      });
      let decision;
      try {
        decision = await this.model.decide(state);
        this.lastError = null;
      } catch (err) {
        this.lastError = err instanceof Error ? err.message : String(err);
        const event: GoldEvent = {
          ts: now,
          mid: state.mid,
          bid: state.bid,
          ask: state.ask,
          spreadPips: state.spreadPips,
          decision: this.lastSignal,
          fill: null,
          late: true,
          lateReason: "busy",
        };
        this.pushHistory(event);
        this.onEvent(event);
        return;
      }
      this.totals.decisions++;
      this.totals.jevUsd += (decision.inputTokens / 1e6) * goldConfig.jevUsdPerMTok;

      const action = decision.action;
      if (action === "buy" || action === "sell") {
        this.position = this.apply(this.position, action, goldConfig.reverse);
      }

      const signal: GoldSignal = {
        ts: now,
        seq: ++this.seq,
        mid: state.mid,
        bid: state.bid,
        ask: state.ask,
        spreadPips: state.spreadPips,
        action,
        probabilities: decision.probabilities,
        latencyMs: decision.latencyMs,
        late: false,
        sim: goldConfig.dryRun,
        lot: goldConfig.lot,
        position: this.position,
        reverse: goldConfig.reverse,
        spreadOk: state.allowed.buy && state.allowed.sell,
      };
      this.lastSignal = signal;
      const event: GoldEvent = {
        ts: now,
        mid: state.mid,
        bid: state.bid,
        ask: state.ask,
        spreadPips: state.spreadPips,
        decision: signal,
        fill: null,
        late: false,
      };
      this.pushHistory(event);
      this.onEvent(event);
      this.onSignal(signal);
    } finally {
      this.throttle.finish();
    }
  }

  reportFill(fill: GoldFill): GoldFill {
    const recorded: GoldFill = { ...fill, ts: fill.ts ?? Date.now() };
    this.fills.push(recorded);
    if (this.fills.length > goldConfig.historySize) this.fills.shift();
    this.totals.fills++;
    const tick = this.lastTick;
    const event: GoldEvent = {
      ts: recorded.ts ?? Date.now(),
      mid: tick ? (tick.bid + tick.ask) / 2 : recorded.price,
      bid: tick?.bid ?? recorded.price,
      ask: tick?.ask ?? recorded.price,
      spreadPips: this.lastSignal?.spreadPips ?? 0,
      decision: this.lastSignal,
      fill: recorded,
      late: false,
    };
    this.pushHistory(event);
    this.onEvent(event);
    this.onFill(recorded);
    return recorded;
  }

  private apply(current: PositionSide, signal: SignalSide, reverse: boolean): PositionSide {
    switch (signal) {
      case "buy":
        return nextPosition(current, "buy", reverse);
      case "sell":
        return nextPosition(current, "sell", reverse);
      default: {
        const _never: never = signal;
        return current;
      }
    }
  }

  private pushHistory(event: GoldEvent): void {
    this.history.push(event);
    if (this.history.length > goldConfig.historySize) this.history.shift();
  }
}
