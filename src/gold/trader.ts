import { goldConfig } from "./config";
import { DummyMt5Account } from "./dummy-mt5";
import type { GoldModel } from "./model";
import { nextPosition, type PositionSide, type SignalSide } from "./policy";
import { MidRing, type GoldTick } from "./state";
import { DecisionThrottle } from "./throttle";
import type { DummyPnL, DummyTicket, DummyTrade, GoldEvent, GoldFill, GoldSignal, GoldTotals } from "./types";

function createDummyAccount(): DummyMt5Account | null {
  if (!goldConfig.dummyMt5) return null;
  return new DummyMt5Account({
    lot: goldConfig.lot,
    slPoints: goldConfig.slPoints,
    tpPoints: goldConfig.tpPoints,
    point: goldConfig.point,
    contractSize: goldConfig.contractSize,
    historySize: goldConfig.historySize,
  });
}

export class GoldTrader {
  readonly history: GoldEvent[] = [];
  private ring = new MidRing();
  private throttle = new DecisionThrottle(goldConfig.intervalMs);
  private lastTick: GoldTick | null = null;
  private lastSignal: GoldSignal | null = null;
  private position: PositionSide = "flat";
  private fills: GoldFill[] = [];
  private seq = 0;
  private totals: GoldTotals = {
    ticks: 0,
    decisions: 0,
    lateTicks: 0,
    fills: 0,
    jevUsd: 0,
    realizedUsd: 0,
    unrealizedUsd: 0,
    pnlUsd: 0,
    wins: 0,
    losses: 0,
  };
  private lastError: string | null = null;
  private dummy: DummyMt5Account | null;

  onEvent: (e: GoldEvent) => void = () => {};
  onSignal: (s: GoldSignal) => void = () => {};
  onFill: (f: GoldFill) => void = () => {};

  constructor(private model: GoldModel, dummy?: DummyMt5Account | null) {
    this.dummy = dummy === undefined ? createDummyAccount() : dummy;
  }

  snapshot() {
    const mid = this.lastTick ? (this.lastTick.bid + this.lastTick.ask) / 2 : 0;
    const dummy = this.refreshPnL(mid);
    return {
      model: this.model.name,
      market: "XAUUSD" as const,
      dryRun: goldConfig.dryRun,
      dummyMt5: this.dummy !== null,
      simulated: this.dummy !== null,
      startedAt: this.startedAt,
      intervalMs: goldConfig.intervalMs,
      horizonMs: goldConfig.horizonMs,
      lot: goldConfig.lot,
      slPoints: goldConfig.slPoints,
      tpPoints: goldConfig.tpPoints,
      reverse: goldConfig.reverse,
      position: this.position,
      latest: this.lastSignal,
      totals: { ...this.totals },
      error: this.lastError,
      realizedUsd: dummy.realizedUsd,
      unrealizedUsd: dummy.unrealizedUsd,
      pnlUsd: dummy.pnlUsd,
      wins: dummy.wins,
      losses: dummy.losses,
      lastTicket: dummy.lastTicket,
      openTicket: dummy.openTicket,
      dummyTrades: dummy.trades,
      dummyPnl: {
        realized: dummy.realizedPnl,
        floating: dummy.floatingPnl,
        total: dummy.pnlUsd,
        realizedUsd: dummy.realizedUsd,
        unrealizedUsd: dummy.unrealizedUsd,
        totalUsd: dummy.pnlUsd,
        wins: dummy.wins,
        losses: dummy.losses,
      },
      fills: this.fills.slice(-20),
    };
  }

  private dummySnapshot(mid: number): {
    openTicket: DummyTicket | null;
    trades: DummyTrade[];
    lastTicket: DummyTrade | null;
    realizedPnl: number;
    floatingPnl: number;
    realizedUsd: number;
    unrealizedUsd: number;
    pnlUsd: number;
    wins: number;
    losses: number;
  } {
    if (!this.dummy) {
      return {
        openTicket: null,
        trades: [],
        lastTicket: null,
        realizedPnl: 0,
        floatingPnl: 0,
        realizedUsd: 0,
        unrealizedUsd: 0,
        pnlUsd: 0,
        wins: 0,
        losses: 0,
      };
    }
    return this.dummy.snapshot(mid);
  }

  private refreshPnL(mid: number) {
    const dummy = this.dummySnapshot(mid);
    this.totals.realizedUsd = dummy.realizedUsd;
    this.totals.unrealizedUsd = dummy.unrealizedUsd;
    this.totals.pnlUsd = dummy.pnlUsd;
    this.totals.wins = dummy.wins;
    this.totals.losses = dummy.losses;
    return dummy;
  }

  private decorate(event: GoldEvent, mid: number): GoldEvent {
    const dummy = this.refreshPnL(mid);
    const pnl: DummyPnL = {
      realizedUsd: dummy.realizedUsd,
      unrealizedUsd: dummy.unrealizedUsd,
      totalUsd: dummy.pnlUsd,
      wins: dummy.wins,
      losses: dummy.losses,
    };
    return { ...event, pnl, lastTicket: dummy.lastTicket };
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
    this.applyDummyStops(mid, now);

    const gate = this.throttle.tryStart(now);
    if (gate.kind === "late") {
      this.totals.lateTicks++;
      const event = this.decorate({
        ts: now,
        mid,
        bid: tick.bid,
        ask: tick.ask,
        spreadPips: this.lastSignal?.spreadPips ?? 0,
        decision: this.lastSignal,
        fill: null,
        late: true,
        lateReason: gate.reason,
      }, mid);
      this.onEvent(this.pushHistory(event));
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
        const event = this.decorate({
          ts: now,
          mid: state.mid,
          bid: state.bid,
          ask: state.ask,
          spreadPips: state.spreadPips,
          decision: this.lastSignal,
          fill: null,
          late: true,
          lateReason: "busy",
        }, state.mid);
        this.onEvent(this.pushHistory(event));
        return;
      }
      this.totals.decisions++;
      this.totals.jevUsd += (decision.inputTokens / 1e6) * goldConfig.jevUsdPerMTok;

      const action = decision.action;
      if (action === "buy" || action === "sell") {
        this.position = this.apply(this.position, action, goldConfig.reverse);
      }
      this.syncDummy(this.position, mid, now);

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
        slPoints: goldConfig.slPoints,
        tpPoints: goldConfig.tpPoints,
        position: this.position,
        reverse: goldConfig.reverse,
        spreadOk: state.allowed.buy && state.allowed.sell,
      };
      this.lastSignal = signal;
      const event = this.decorate({
        ts: now,
        mid: state.mid,
        bid: state.bid,
        ask: state.ask,
        spreadPips: state.spreadPips,
        decision: signal,
        fill: null,
        late: false,
      }, state.mid);
      this.onEvent(this.pushHistory(event));
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
    const mid = tick ? (tick.bid + tick.ask) / 2 : recorded.price;
    const event = this.decorate({
      ts: recorded.ts ?? Date.now(),
      mid,
      bid: tick?.bid ?? recorded.price,
      ask: tick?.ask ?? recorded.price,
      spreadPips: this.lastSignal?.spreadPips ?? 0,
      decision: this.lastSignal,
      fill: recorded,
      late: false,
    }, mid);
    this.onEvent(this.pushHistory(event));
    this.onFill(recorded);
    return recorded;
  }

  private applyDummyStops(mid: number, now: number): void {
    if (!this.dummy) return;
    const fill = this.dummy.checkStops(mid, now);
    if (fill) this.reportFill(fill);
  }

  private syncDummy(want: PositionSide, mid: number, now: number): void {
    if (!this.dummy) return;
    for (const fill of this.dummy.sync(want, mid, now)) this.reportFill(fill);
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

  private pushHistory(event: GoldEvent): GoldEvent {
    const decorated = this.decorate(event, event.mid);
    this.history.push(decorated);
    if (this.history.length > goldConfig.historySize) this.history.shift();
    return decorated;
  }
}
