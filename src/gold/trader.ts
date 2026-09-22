import { goldConfig } from "./config";
import { DummyMt5Account, type BookQuote } from "./dummy-mt5";
import type { GoldModel } from "./model-mock";
import { realizedPeakFromTrades, shouldPauseDummyEntries, type DummyPauseReason } from "./pause";
import { holdScalp, type PositionSide } from "./policy";
import { type GoldProofState, PROOF_STATE_VERSION } from "./proof-state";
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
    minReversePoints: goldConfig.minReversePoints,
    fillMode: goldConfig.fillMode,
  });
}

function quoteFromTick(tick: GoldTick | null, fallbackPrice = 0): BookQuote {
  if (!tick) return { bid: fallbackPrice, ask: fallbackPrice };
  return { bid: tick.bid, ask: tick.ask };
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
  /** Derived each tick from peak drawdown and the hard floor. Demo only. */
  private entriesPaused = false;
  private pauseReason: DummyPauseReason | null = null;
  /** Highest realized P/L this session. Resume can rebase it unless the hard floor is hit. */
  private realizedPeak = 0;
  startedAt: number;

  onEvent: (e: GoldEvent) => void = () => {};
  onSignal: (s: GoldSignal) => void = () => {};
  onFill: (f: GoldFill) => void = () => {};
  /** Fired after closes/opens so Durable Object storage can flush proof history. */
  onProofChange: () => void = () => {};

  constructor(private model: GoldModel, dummy?: DummyMt5Account | null) {
    this.dummy = dummy === undefined ? createDummyAccount() : dummy;
    this.startedAt = Date.now();
  }

  /** Closed trades + session counters for Durable Object / export backup. */
  exportProof(now = Date.now()): GoldProofState {
    return {
      version: PROOF_STATE_VERSION,
      savedAt: now,
      startedAt: this.startedAt,
      seq: this.seq,
      position: this.position,
      totals: {
        ticks: this.totals.ticks,
        decisions: this.totals.decisions,
        lateTicks: this.totals.lateTicks,
        fills: this.totals.fills,
        jevUsd: this.totals.jevUsd,
      },
      dummy: this.dummy ? this.dummy.exportState() : null,
    };
  }

  /** Restore proof history after a deploy, hibernation, or local restart. */
  hydrateProof(state: GoldProofState): void {
    this.startedAt = state.startedAt;
    this.seq = state.seq;
    this.position = state.position;
    this.totals.ticks = state.totals.ticks;
    this.totals.decisions = state.totals.decisions;
    this.totals.lateTicks = state.totals.lateTicks;
    this.totals.fills = state.totals.fills;
    this.totals.jevUsd = state.totals.jevUsd;
    if (state.dummy && this.dummy) {
      this.dummy.hydrate(state.dummy);
      this.position = this.dummy.openTicket?.side ?? "flat";
    } else if (state.dummy && !this.dummy) {
      // Dummy was on when saved; recreate so restores still show the tape.
      this.dummy = createDummyAccount();
      if (this.dummy) {
        this.dummy.hydrate(state.dummy);
        this.position = this.dummy.openTicket?.side ?? "flat";
      }
    }
    const quote = quoteFromTick(this.lastTick);
    this.refreshPnL(quote);
    const trades = this.dummy?.closedTrades ?? [];
    this.realizedPeak = Math.max(realizedPeakFromTrades(trades), this.totals.realizedUsd);
    this.updateEntryPause(this.totals.realizedUsd);
  }

  snapshot() {
    const quote = quoteFromTick(this.lastTick);
    const dummy = this.refreshPnL(quote);
    return {
      model: this.model.name,
      market: "XAUUSD" as const,
      dryRun: goldConfig.dryRun,
      dummyMt5: this.dummy !== null,
      simulated: this.dummy !== null,
      fillMode: this.dummy?.mode ?? goldConfig.fillMode,
      startedAt: this.startedAt,
      intervalMs: goldConfig.intervalMs,
      horizonMs: goldConfig.horizonMs,
      lot: goldConfig.lot,
      slPoints: goldConfig.slPoints,
      tpPoints: goldConfig.tpPoints,
      pauseRealizedUsd: goldConfig.pauseRealizedUsd,
      pauseFloorUsd: goldConfig.pauseFloorUsd,
      entriesPaused: this.entriesPaused,
      pauseReason: this.pauseReason,
      realizedPeak: this.realizedPeak,
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

  private dummySnapshot(quote: BookQuote): {
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
    return this.dummy.snapshot(quote);
  }

  private refreshPnL(quote: BookQuote) {
    const dummy = this.dummySnapshot(quote);
    this.totals.realizedUsd = dummy.realizedUsd;
    this.totals.unrealizedUsd = dummy.unrealizedUsd;
    this.totals.pnlUsd = dummy.pnlUsd;
    this.totals.wins = dummy.wins;
    this.totals.losses = dummy.losses;
    return dummy;
  }

  private decorate(event: GoldEvent, quote: BookQuote): GoldEvent {
    const dummy = this.refreshPnL(quote);
    const pnl: DummyPnL = {
      realizedUsd: dummy.realizedUsd,
      unrealizedUsd: dummy.unrealizedUsd,
      totalUsd: dummy.pnlUsd,
      wins: dummy.wins,
      losses: dummy.losses,
    };
    return { ...event, pnl, lastTicket: dummy.lastTicket };
  }

  signal(): GoldSignal | null {
    return this.lastSignal;
  }

  /**
   * Rebase the peak-drawdown gate so a watched room can try again.
   * Does not close open tickets. The hard -$40 floor cannot be cleared.
   */
  resumeEntries(): { ok: true; entriesPaused: boolean; realizedUsd: number; pauseReason: DummyPauseReason | null } {
    const quote = quoteFromTick(this.lastTick);
    const dummy = this.refreshPnL(quote);
    const floorGate = shouldPauseDummyEntries({
      demo: goldConfig.demo,
      realizedUsd: dummy.realizedUsd,
      realizedPeak: dummy.realizedUsd,
      pauseDrawdownUsd: null,
      pauseFloorUsd: goldConfig.pauseFloorUsd,
    });
    if (floorGate.pause) {
      this.entriesPaused = true;
      this.pauseReason = floorGate.reason;
      this.onProofChange();
      return {
        ok: true,
        entriesPaused: true,
        realizedUsd: dummy.realizedUsd,
        pauseReason: this.pauseReason,
      };
    }
    this.realizedPeak = dummy.realizedUsd;
    this.entriesPaused = false;
    this.pauseReason = null;
    this.onProofChange();
    return { ok: true, entriesPaused: false, realizedUsd: dummy.realizedUsd, pauseReason: null };
  }

  private updateEntryPause(realizedUsd: number): void {
    if (realizedUsd > this.realizedPeak) this.realizedPeak = realizedUsd;
    const gate = shouldPauseDummyEntries({
      demo: goldConfig.demo,
      realizedUsd,
      realizedPeak: this.realizedPeak,
      pauseDrawdownUsd: goldConfig.pauseRealizedUsd,
      pauseFloorUsd: goldConfig.pauseFloorUsd,
    });
    this.entriesPaused = gate.pause;
    this.pauseReason = gate.reason;
  }

  async onTick(tick: GoldTick, now = Date.now()): Promise<void> {
    this.totals.ticks++;
    this.lastTick = tick;
    const quote: BookQuote = { bid: tick.bid, ask: tick.ask };
    const mid = (tick.bid + tick.ask) / 2;
    this.ring.push(mid);
    this.applyDummyStops(quote, now);
    if (this.dummy) this.position = this.dummy.openTicket?.side ?? "flat";

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
      }, quote);
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
        }, { bid: state.bid, ask: state.ask });
        this.onEvent(this.pushHistory(event));
        return;
      }
      this.totals.decisions++;
      this.totals.jevUsd += (decision.inputTokens / 1e6) * goldConfig.jevUsdPerMTok;

      const action = decision.action;
      let want: PositionSide = this.position;
      if (action === "buy" || action === "sell") {
        want = holdScalp(this.position, action);
      }
      const preQuote = quoteFromTick(this.lastTick, mid);
      this.updateEntryPause(this.refreshPnL(preQuote).realizedUsd);
      // Pause only blocks new entries from flat; open scalps still hold until SL/TP.
      if (this.entriesPaused && this.position === "flat") {
        want = "flat";
      }
      this.position = want;
      this.syncDummy(this.position, quote, now);
      if (this.dummy) {
        this.position = this.dummy.openTicket?.side ?? "flat";
      }
      this.updateEntryPause(this.refreshPnL(quote).realizedUsd);

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
      }, { bid: state.bid, ask: state.ask });
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
    const quote = quoteFromTick(tick, recorded.price);
    const mid = (quote.bid + quote.ask) / 2;
    const event = this.decorate({
      ts: recorded.ts ?? Date.now(),
      mid,
      bid: quote.bid,
      ask: quote.ask,
      spreadPips: this.lastSignal?.spreadPips ?? 0,
      decision: this.lastSignal,
      fill: recorded,
      late: false,
    }, quote);
    this.onEvent(this.pushHistory(event));
    this.onFill(recorded);
    this.updateEntryPause(this.totals.realizedUsd);
    this.onProofChange();
    if (!this.dummy && (recorded.reason === "sl" || recorded.reason === "tp")) {
      this.position = "flat";
      if (this.lastSignal) this.lastSignal = { ...this.lastSignal, position: "flat" };
    }
    return recorded;
  }

  private applyDummyStops(quote: BookQuote, now: number): void {
    if (!this.dummy) return;
    const fill = this.dummy.checkStops(quote, now);
    if (fill) this.reportFill(fill);
  }

  private syncDummy(want: PositionSide, quote: BookQuote, now: number): void {
    if (!this.dummy) return;
    for (const fill of this.dummy.sync(want, quote, now)) this.reportFill(fill);
  }

  private pushHistory(event: GoldEvent): GoldEvent {
    const decorated = this.decorate(event, { bid: event.bid, ask: event.ask });
    this.history.push(decorated);
    if (this.history.length > goldConfig.historySize) this.history.shift();
    return decorated;
  }
}
