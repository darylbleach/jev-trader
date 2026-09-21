var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/gold/policy.ts
function nextPosition(current, signal, reverse) {
  if (current === "flat") return signal;
  if (current === signal) return current;
  return reverse ? signal : "flat";
}
function spreadPips(bid, ask, point) {
  if (!(point > 0) || !(bid > 0) || !(ask > 0)) return Number.POSITIVE_INFINITY;
  return (ask - bid) / point;
}
function midPrice(bid, ask) {
  return (bid + ask) / 2;
}
var init_policy = __esm({
  "src/gold/policy.ts"() {
    "use strict";
    __name(nextPosition, "nextPosition");
    __name(spreadPips, "spreadPips");
    __name(midPrice, "midPrice");
  }
});

// src/gold/state.ts
function parseTick(body) {
  if (!body || typeof body !== "object") return null;
  const o = body;
  const bid = num(o.bid);
  const ask = num(o.ask);
  if (bid !== null && ask !== null && bid > 0 && ask > 0 && ask >= bid) {
    return { bid, ask, volume: num(o.volume) ?? 0, ts: num(o.ts) ?? void 0 };
  }
  const price = num(o.mid) ?? num(o.price);
  if (price !== null && price > 0) {
    return { bid: price, ask: price, volume: num(o.volume) ?? 0, ts: num(o.ts) ?? void 0 };
  }
  return null;
}
function num(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function returnPips(mids, steps, point) {
  if (mids.length < steps + 1 || !(point > 0)) return 0;
  const newest = mids[mids.length - 1];
  const older = mids[mids.length - 1 - steps];
  if (newest === void 0 || older === void 0) return 0;
  return (newest - older) / point;
}
var MAX_MIDS, MidRing;
var init_state = __esm({
  "src/gold/state.ts"() {
    "use strict";
    init_policy();
    MAX_MIDS = 200;
    __name(parseTick, "parseTick");
    __name(num, "num");
    __name(returnPips, "returnPips");
    MidRing = class {
      static {
        __name(this, "MidRing");
      }
      mids = [];
      push(mid) {
        this.mids.push(mid);
        if (this.mids.length > MAX_MIDS) this.mids.shift();
      }
      get values() {
        return this.mids;
      }
      build(tick, opts) {
        const mid = midPrice(tick.bid, tick.ask);
        const spread = spreadPips(tick.bid, tick.ask, opts.point);
        const spreadOk = spread <= opts.maxSpreadPips;
        const sample = this.mids.filter((_, i) => i % 5 === this.mids.length % 5 || i >= this.mids.length - 1);
        const shown = (sample.length > 0 ? sample : this.mids).slice(-20);
        return {
          market: "XAUUSD",
          ts: opts.ts,
          horizonMs: opts.horizonMs,
          intervalMs: opts.intervalMs,
          bid: tick.bid,
          ask: tick.ask,
          mid,
          spreadPips: spread,
          volume: tick.volume ?? 0,
          returnsPips: {
            last1: returnPips(this.mids, 1, opts.point),
            last5: returnPips(this.mids, 5, opts.point),
            last20: returnPips(this.mids, 20, opts.point),
            last100: returnPips(this.mids, 100, opts.point)
          },
          recentMids: shown.map((p) => p.toFixed(2)).join(" "),
          allowed: { buy: spreadOk, sell: spreadOk }
        };
      }
    };
  }
});

// src/gold/sleep.ts
function sleep(ms) {
  const sched = globalThis.scheduler;
  if (typeof sched?.wait === "function") return sched.wait(ms);
  const bun = globalThis.Bun;
  if (typeof bun?.sleep === "function") return bun.sleep(ms);
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
var init_sleep = __esm({
  "src/gold/sleep.ts"() {
    "use strict";
    __name(sleep, "sleep");
  }
});

// src/gold/model-mock.ts
var model_mock_exports = {};
__export(model_mock_exports, {
  GoldMockModel: () => GoldMockModel
});
var GoldMockModel;
var init_model_mock = __esm({
  "src/gold/model-mock.ts"() {
    "use strict";
    init_sleep();
    GoldMockModel = class {
      static {
        __name(this, "GoldMockModel");
      }
      name = "mock";
      async decide(state) {
        const t0 = performance.now();
        const signal = state.returnsPips.last20 / 8 + this.noise(state.ts);
        const buy = 1 / (1 + Math.exp(-signal));
        const probabilities = { buy, sell: 1 - buy, hold: 0 };
        const action = buy >= 0.5 ? "buy" : "sell";
        await sleep(80);
        return {
          action,
          probabilities,
          latencyMs: performance.now() - t0,
          inputTokens: Math.round(JSON.stringify(state).length / 4)
        };
      }
      noise(ts) {
        let h = Math.floor(ts) * 2654435761 >>> 0;
        h ^= h >>> 15;
        h = h * 2246822519 >>> 0;
        h ^= h >>> 13;
        return (h % 1e3 / 1e3 - 0.5) * 3;
      }
    };
  }
});

// src/gold/config.ts
var config_exports = {};
__export(config_exports, {
  GOLD_DEFAULT_HORIZON_MS: () => GOLD_DEFAULT_HORIZON_MS,
  GOLD_DEFAULT_SL_POINTS: () => GOLD_DEFAULT_SL_POINTS,
  GOLD_DEFAULT_TP_POINTS: () => GOLD_DEFAULT_TP_POINTS,
  goldConfig: () => goldConfig,
  parsePositiveInt: () => parsePositiveInt
});
function parsePositiveInt(raw, fallback) {
  if (raw === void 0 || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}
var env, GOLD_DEFAULT_SL_POINTS, GOLD_DEFAULT_TP_POINTS, GOLD_DEFAULT_HORIZON_MS, goldConfig;
var init_config = __esm({
  "src/gold/config.ts"() {
    "use strict";
    env = /* @__PURE__ */ __name((key, fallback) => process.env[key] ?? fallback, "env");
    GOLD_DEFAULT_SL_POINTS = 600;
    GOLD_DEFAULT_TP_POINTS = 800;
    GOLD_DEFAULT_HORIZON_MS = 6e3;
    __name(parsePositiveInt, "parsePositiveInt");
    goldConfig = {
      port: Number(env("GOLD_PORT", "3001")),
      intervalMs: Number(env("GOLD_INTERVAL_MS", "1000")),
      horizonMs: Number(env("GOLD_HORIZON_MS", String(GOLD_DEFAULT_HORIZON_MS))),
      lot: Number(env("GOLD_LOT", "0.01")),
      maxLot: Number(env("GOLD_MAX_LOT", "1")),
      maxSpreadPips: Number(env("GOLD_MAX_SPREAD_PIPS", "30")),
      /** XAUUSD point used to convert a price delta into pips. 0.01 is one pip on a 2-decimal quote. */
      point: Number(env("GOLD_POINT", "0.01")),
      slPoints: parsePositiveInt(env("GOLD_SL_POINTS"), GOLD_DEFAULT_SL_POINTS),
      tpPoints: parsePositiveInt(env("GOLD_TP_POINTS"), GOLD_DEFAULT_TP_POINTS),
      reverse: env("GOLD_REVERSE", "true") !== "false",
      dryRun: env("GOLD_DRY_RUN", "true") !== "false",
      /**
       * Simulated JevLeader tickets. Defaults on whenever dry-run is on (the demo).
       * Set GOLD_DUMMY_MT5=false to hide them, or GOLD_DRY_RUN=false when a real EA posts /fill.
       */
      dummyMt5: (env("GOLD_DUMMY_MT5") ?? env("GOLD_DRY_RUN", "true")) !== "false",
      /** Standard XAUUSD contract: 100 oz per lot. 0.01 lot and a $1 move is $1 P and L. */
      contractSize: Number(env("GOLD_CONTRACT_SIZE", "100")),
      /** GOLD_MODEL wins so gold can use Jev while the Kuru demo stays on mock. */
      model: env("GOLD_MODEL") ?? env("MODEL", "mock"),
      jevModelId: env("JEV_MODEL_ID", "jev-latest"),
      jevUsdPerMTok: 0.042,
      feedUrl: env("XAUUSD_FEED_URL"),
      /**
       * When true and no XAUUSD_FEED_URL is set, poll a public XAUUSD spot so the
       * demo decides on live gold. Set false for production so only JevLeader posts /tick.
       */
      demo: env("GOLD_DEMO", "true") !== "false",
      /** Public XAUUSD spot used by the built-in live demo poller. */
      spotUrl: env("XAUUSD_SPOT_URL", "https://api.gold-api.com/price/XAU"),
      /** How often to refresh the live spot. Decisions still run every intervalMs. */
      spotRefreshMs: Number(env("XAUUSD_SPOT_REFRESH_MS", "5000")),
      historySize: 1e3
    };
  }
});

// src/gold/dummy-mt5.ts
function stopPrices(side, openPrice, slPoints, tpPoints, point) {
  const slDist = slPoints * point;
  const tpDist = tpPoints * point;
  if (side === "buy") return { sl: openPrice - slDist, tp: openPrice + tpDist };
  return { sl: openPrice + slDist, tp: openPrice - tpDist };
}
function ticketPnl(side, openPrice, closePrice, lots, contractSize) {
  const dir = side === "buy" ? 1 : -1;
  return (closePrice - openPrice) * dir * contractSize * lots;
}
function slTpHit(ticket, mid) {
  if (ticket.side === "buy") {
    if (mid <= ticket.sl) return "sl";
    if (mid >= ticket.tp) return "tp";
    return null;
  }
  if (mid >= ticket.sl) return "sl";
  if (mid <= ticket.tp) return "tp";
  return null;
}
var DummyMt5Account;
var init_dummy_mt5 = __esm({
  "src/gold/dummy-mt5.ts"() {
    "use strict";
    __name(stopPrices, "stopPrices");
    __name(ticketPnl, "ticketPnl");
    __name(slTpHit, "slTpHit");
    DummyMt5Account = class {
      constructor(opts) {
        this.opts = opts;
      }
      opts;
      static {
        __name(this, "DummyMt5Account");
      }
      nextTicket = 1;
      open = null;
      trades = [];
      realized = 0;
      wins = 0;
      losses = 0;
      last = null;
      get openTicket() {
        return this.open;
      }
      get closedTrades() {
        return this.trades;
      }
      get lastTicket() {
        return this.last;
      }
      get realizedPnl() {
        return this.realized;
      }
      get winCount() {
        return this.wins;
      }
      get lossCount() {
        return this.losses;
      }
      floatingPnl(mid) {
        if (!this.open) return 0;
        return ticketPnl(this.open.side, this.open.openPrice, mid, this.open.lots, this.opts.contractSize);
      }
      snapshot(mid) {
        const realizedPnl = this.realized;
        const floatingPnl = this.floatingPnl(mid);
        return {
          enabled: true,
          openTicket: this.open,
          trades: this.trades.slice(),
          lastTicket: this.last,
          realizedPnl,
          floatingPnl,
          realizedUsd: realizedPnl,
          unrealizedUsd: floatingPnl,
          pnlUsd: realizedPnl + floatingPnl,
          wins: this.wins,
          losses: this.losses
        };
      }
      /** Close at the SL or TP price if mid has touched either. */
      checkStops(mid, ts) {
        if (!this.open) return null;
        const hit = slTpHit(this.open, mid);
        if (!hit) return null;
        const closePrice = hit === "sl" ? this.open.sl : this.open.tp;
        return this.closeAt(closePrice, hit, ts);
      }
      /**
       * Match JevLeader: if the standing position differs from the open ticket,
       * close the old one at mid (signal) then open the other side.
       */
      sync(want, mid, ts) {
        const fills = [];
        const have = this.open?.side ?? "flat";
        if (have === want) return fills;
        if (this.open) {
          const closed = this.closeAt(mid, "signal", ts);
          if (closed) fills.push(closed);
        }
        if (want === "buy" || want === "sell") fills.push(this.openAt(want, mid, ts));
        return fills;
      }
      openAt(side, mid, ts) {
        const { sl, tp } = stopPrices(side, mid, this.opts.slPoints, this.opts.tpPoints, this.opts.point);
        const ticket = this.nextTicket++;
        const lots = this.opts.lot;
        this.open = { ticket, side, lots, openPrice: mid, sl, tp, openTs: ts };
        return {
          ticket,
          side,
          lots,
          price: mid,
          symbol: "XAUUSD",
          kind: "open",
          openPrice: mid,
          sl,
          tp,
          simulated: true,
          ts
        };
      }
      closeAt(price, reason, ts) {
        const t = this.open;
        if (!t) return null;
        const pnl = ticketPnl(t.side, t.openPrice, price, t.lots, this.opts.contractSize);
        this.realized += pnl;
        const trade = {
          ticket: t.ticket,
          side: t.side,
          lots: t.lots,
          openPrice: t.openPrice,
          sl: t.sl,
          tp: t.tp,
          closePrice: price,
          reason,
          pnl,
          openTs: t.openTs,
          closeTs: ts
        };
        this.trades.push(trade);
        if (this.trades.length > this.opts.historySize) this.trades.shift();
        this.last = trade;
        if (pnl > 0) this.wins += 1;
        else if (pnl < 0) this.losses += 1;
        this.open = null;
        return {
          ticket: t.ticket,
          side: t.side,
          lots: t.lots,
          price,
          symbol: "XAUUSD",
          kind: "close",
          openPrice: t.openPrice,
          closePrice: price,
          sl: t.sl,
          tp: t.tp,
          reason,
          pnl,
          simulated: true,
          ts
        };
      }
    };
  }
});

// src/gold/throttle.ts
var DecisionThrottle;
var init_throttle = __esm({
  "src/gold/throttle.ts"() {
    "use strict";
    DecisionThrottle = class {
      constructor(intervalMs) {
        this.intervalMs = intervalMs;
      }
      intervalMs;
      static {
        __name(this, "DecisionThrottle");
      }
      busy = false;
      lastStart = null;
      get inFlight() {
        return this.busy;
      }
      tryStart(now) {
        if (this.busy) return { kind: "late", reason: "busy" };
        if (this.lastStart !== null && now - this.lastStart < this.intervalMs) return { kind: "late", reason: "interval" };
        this.busy = true;
        this.lastStart = now;
        return { kind: "run" };
      }
      finish() {
        this.busy = false;
      }
    };
  }
});

// src/gold/trader.ts
var trader_exports = {};
__export(trader_exports, {
  GoldTrader: () => GoldTrader
});
function createDummyAccount() {
  if (!goldConfig.dummyMt5) return null;
  return new DummyMt5Account({
    lot: goldConfig.lot,
    slPoints: goldConfig.slPoints,
    tpPoints: goldConfig.tpPoints,
    point: goldConfig.point,
    contractSize: goldConfig.contractSize,
    historySize: goldConfig.historySize
  });
}
var GoldTrader;
var init_trader = __esm({
  "src/gold/trader.ts"() {
    "use strict";
    init_config();
    init_dummy_mt5();
    init_policy();
    init_state();
    init_throttle();
    __name(createDummyAccount, "createDummyAccount");
    GoldTrader = class {
      constructor(model, dummy) {
        this.model = model;
        this.dummy = dummy === void 0 ? createDummyAccount() : dummy;
      }
      model;
      static {
        __name(this, "GoldTrader");
      }
      history = [];
      ring = new MidRing();
      throttle = new DecisionThrottle(goldConfig.intervalMs);
      lastTick = null;
      lastSignal = null;
      position = "flat";
      fills = [];
      seq = 0;
      totals = {
        ticks: 0,
        decisions: 0,
        lateTicks: 0,
        fills: 0,
        jevUsd: 0,
        realizedUsd: 0,
        unrealizedUsd: 0,
        pnlUsd: 0,
        wins: 0,
        losses: 0
      };
      lastError = null;
      dummy;
      onEvent = /* @__PURE__ */ __name(() => {
      }, "onEvent");
      onSignal = /* @__PURE__ */ __name(() => {
      }, "onSignal");
      onFill = /* @__PURE__ */ __name(() => {
      }, "onFill");
      snapshot() {
        const mid = this.lastTick ? (this.lastTick.bid + this.lastTick.ask) / 2 : 0;
        const dummy = this.refreshPnL(mid);
        return {
          model: this.model.name,
          market: "XAUUSD",
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
            losses: dummy.losses
          },
          fills: this.fills.slice(-20)
        };
      }
      dummySnapshot(mid) {
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
            losses: 0
          };
        }
        return this.dummy.snapshot(mid);
      }
      refreshPnL(mid) {
        const dummy = this.dummySnapshot(mid);
        this.totals.realizedUsd = dummy.realizedUsd;
        this.totals.unrealizedUsd = dummy.unrealizedUsd;
        this.totals.pnlUsd = dummy.pnlUsd;
        this.totals.wins = dummy.wins;
        this.totals.losses = dummy.losses;
        return dummy;
      }
      decorate(event, mid) {
        const dummy = this.refreshPnL(mid);
        const pnl = {
          realizedUsd: dummy.realizedUsd,
          unrealizedUsd: dummy.unrealizedUsd,
          totalUsd: dummy.pnlUsd,
          wins: dummy.wins,
          losses: dummy.losses
        };
        return { ...event, pnl, lastTicket: dummy.lastTicket };
      }
      startedAt = Date.now();
      signal() {
        return this.lastSignal;
      }
      async onTick(tick, now = Date.now()) {
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
            lateReason: gate.reason
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
            maxSpreadPips: goldConfig.maxSpreadPips
          });
          let decision;
          try {
            decision = await this.model.decide(state);
            this.lastError = null;
          } catch (err) {
            this.lastError = err instanceof Error ? err.message : String(err);
            const event2 = this.decorate({
              ts: now,
              mid: state.mid,
              bid: state.bid,
              ask: state.ask,
              spreadPips: state.spreadPips,
              decision: this.lastSignal,
              fill: null,
              late: true,
              lateReason: "busy"
            }, state.mid);
            this.onEvent(this.pushHistory(event2));
            return;
          }
          this.totals.decisions++;
          this.totals.jevUsd += decision.inputTokens / 1e6 * goldConfig.jevUsdPerMTok;
          const action = decision.action;
          if (action === "buy" || action === "sell") {
            this.position = this.apply(this.position, action, goldConfig.reverse);
          }
          this.syncDummy(this.position, mid, now);
          const signal = {
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
            spreadOk: state.allowed.buy && state.allowed.sell
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
            late: false
          }, state.mid);
          this.onEvent(this.pushHistory(event));
          this.onSignal(signal);
        } finally {
          this.throttle.finish();
        }
      }
      reportFill(fill) {
        const recorded = { ...fill, ts: fill.ts ?? Date.now() };
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
          late: false
        }, mid);
        this.onEvent(this.pushHistory(event));
        this.onFill(recorded);
        return recorded;
      }
      applyDummyStops(mid, now) {
        if (!this.dummy) return;
        const fill = this.dummy.checkStops(mid, now);
        if (fill) this.reportFill(fill);
      }
      syncDummy(want, mid, now) {
        if (!this.dummy) return;
        for (const fill of this.dummy.sync(want, mid, now)) this.reportFill(fill);
      }
      apply(current, signal, reverse) {
        switch (signal) {
          case "buy":
            return nextPosition(current, "buy", reverse);
          case "sell":
            return nextPosition(current, "sell", reverse);
          default: {
            const _never = signal;
            return current;
          }
        }
      }
      pushHistory(event) {
        const decorated = this.decorate(event, event.mid);
        this.history.push(decorated);
        if (this.history.length > goldConfig.historySize) this.history.shift();
        return decorated;
      }
    };
  }
});

// src/gold/walk.ts
var walk_exports = {};
__export(walk_exports, {
  GOLD_WALK_FALLBACK_MID: () => GOLD_WALK_FALLBACK_MID,
  demoTickFromMid: () => demoTickFromMid,
  nextDemoMid: () => nextDemoMid,
  seedGoldMid: () => seedGoldMid,
  startDemoWalk: () => startDemoWalk
});
async function seedGoldMid() {
  try {
    const res = await fetch("https://api.gold-api.com/price/XAU", { signal: AbortSignal.timeout(4e3) });
    if (res.ok) {
      const body = await res.json();
      if (typeof body.price === "number" && body.price > 100 && body.price < 1e5) return body.price;
    }
  } catch {
  }
  return GOLD_WALK_FALLBACK_MID;
}
function nextDemoMid(mid) {
  return Math.max(100, mid + (Math.random() - 0.5) * 0.8);
}
function demoTickFromMid(mid) {
  const halfSpread = Math.min(20, goldConfig.maxSpreadPips * 0.5) * goldConfig.point / 2;
  return {
    bid: mid - halfSpread,
    ask: mid + halfSpread,
    volume: 1 + Math.floor(Math.random() * 8)
  };
}
function startDemoWalk(trader, intervalMs, seed) {
  let mid = seed;
  const step = /* @__PURE__ */ __name(() => {
    mid = nextDemoMid(mid);
    void trader.onTick(demoTickFromMid(mid));
  }, "step");
  const id = setInterval(step, intervalMs);
  step();
  return () => clearInterval(id);
}
var GOLD_WALK_FALLBACK_MID;
var init_walk = __esm({
  "src/gold/walk.ts"() {
    "use strict";
    init_config();
    GOLD_WALK_FALLBACK_MID = 2650;
    __name(seedGoldMid, "seedGoldMid");
    __name(nextDemoMid, "nextDemoMid");
    __name(demoTickFromMid, "demoTickFromMid");
    __name(startDemoWalk, "startDemoWalk");
  }
});

// src/gold/spot.ts
var spot_exports = {};
__export(spot_exports, {
  GOLD_SPOT_FALLBACK_URL: () => GOLD_SPOT_FALLBACK_URL,
  GOLD_SPOT_URL: () => GOLD_SPOT_URL,
  feedKindFromLive: () => feedKindFromLive,
  fetchLiveGoldMid: () => fetchLiveGoldMid,
  parseGoldSpotPrice: () => parseGoldSpotPrice,
  resolveGoldMid: () => resolveGoldMid,
  seedGoldMid: () => seedGoldMid2,
  startLiveGoldPoller: () => startLiveGoldPoller
});
function isGoldMid(n) {
  return typeof n === "number" && Number.isFinite(n) && n > 100 && n < 1e5;
}
function num2(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function parseGoldSpotPrice(body) {
  if (!body || typeof body !== "object") return null;
  const o = body;
  const direct = num2(o.price) ?? num2(o.mid);
  if (isGoldMid(direct)) return direct;
  const bid = num2(o.bid);
  const ask = num2(o.ask);
  if (isGoldMid(bid) && isGoldMid(ask)) return (bid + ask) / 2;
  const chart = o.chart;
  const metaPrice = chart?.result?.[0]?.meta?.regularMarketPrice;
  if (isGoldMid(metaPrice)) return metaPrice;
  const closes = chart?.result?.[0]?.indicators?.quote?.[0]?.close;
  if (Array.isArray(closes)) {
    for (let i = closes.length - 1; i >= 0; i--) {
      const close = closes[i];
      if (isGoldMid(close)) return close;
    }
  }
  return null;
}
async function fetchLiveGoldMid(opts) {
  const fetchFn = opts?.fetch ?? fetch;
  const urls = opts?.urls ?? [goldConfig.spotUrl || GOLD_SPOT_URL, GOLD_SPOT_FALLBACK_URL];
  const timeoutMs = opts?.timeoutMs ?? 4e3;
  for (const url of urls) {
    try {
      const res = await fetchFn(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          accept: "application/json",
          "user-agent": "jev-gold-demo"
        }
      });
      if (!res.ok) continue;
      const mid = parseGoldSpotPrice(await res.json());
      if (mid !== null) return mid;
    } catch {
    }
  }
  return null;
}
async function resolveGoldMid(state, opts) {
  const fetched = await fetchLiveGoldMid(opts);
  if (fetched !== null) return { mid: fetched, live: true };
  if (state.live && state.mid !== null) return { mid: state.mid, live: true };
  const fallback = state.mid ?? GOLD_WALK_FALLBACK_MID;
  return { mid: nextDemoMid(fallback), live: false };
}
function feedKindFromLive(live, fallback = "demo") {
  return live ? "live" : fallback;
}
async function seedGoldMid2(opts) {
  return await fetchLiveGoldMid(opts) ?? GOLD_WALK_FALLBACK_MID;
}
function startLiveGoldPoller(trader, intervalMs, opts) {
  const refreshMs = opts?.refreshMs && opts.refreshMs > 0 ? opts.refreshMs : goldConfig.spotRefreshMs;
  let stopped = false;
  let state = { mid: null, live: false };
  let lastFetch = 0;
  let lastKind = null;
  const step = /* @__PURE__ */ __name(async () => {
    if (stopped) return;
    const now = Date.now();
    const stale = now - lastFetch >= refreshMs || state.mid === null;
    if (stale) {
      lastFetch = now;
      state = await resolveGoldMid(state, { fetch: opts?.fetch, urls: opts?.urls });
    } else if (!state.live && state.mid !== null) {
      state = { mid: nextDemoMid(state.mid), live: false };
    }
    const kind = feedKindFromLive(state.live);
    if (kind !== lastKind) {
      lastKind = kind;
      opts?.onSource?.(kind);
    }
    if (state.mid !== null) await trader.onTick(demoTickFromMid(state.mid));
  }, "step");
  const id = setInterval(() => {
    void step();
  }, intervalMs);
  void step();
  return () => {
    stopped = true;
    clearInterval(id);
  };
}
var GOLD_SPOT_URL, GOLD_SPOT_FALLBACK_URL;
var init_spot = __esm({
  "src/gold/spot.ts"() {
    "use strict";
    init_config();
    init_walk();
    GOLD_SPOT_URL = "https://api.gold-api.com/price/XAU";
    GOLD_SPOT_FALLBACK_URL = "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1m&range=1d";
    __name(isGoldMid, "isGoldMid");
    __name(num2, "num");
    __name(parseGoldSpotPrice, "parseGoldSpotPrice");
    __name(fetchLiveGoldMid, "fetchLiveGoldMid");
    __name(resolveGoldMid, "resolveGoldMid");
    __name(feedKindFromLive, "feedKindFromLive");
    __name(seedGoldMid2, "seedGoldMid");
    __name(startLiveGoldPoller, "startLiveGoldPoller");
  }
});

// src/gold/cf/gold-room.ts
import { DurableObject } from "cloudflare:workers";

// src/gold/cf/env.ts
var GOLD_ENV_KEYS = [
  "GOLD_MODEL",
  "MODEL",
  "TYPESAFE_AI_API_KEY",
  "JEV_MODEL_ID",
  "GOLD_DEMO",
  "GOLD_DRY_RUN",
  "GOLD_DUMMY_MT5",
  "GOLD_INTERVAL_MS",
  "GOLD_HORIZON_MS",
  "GOLD_LOT",
  "GOLD_MAX_LOT",
  "GOLD_MAX_SPREAD_PIPS",
  "GOLD_POINT",
  "GOLD_SL_POINTS",
  "GOLD_TP_POINTS",
  "GOLD_REVERSE",
  "GOLD_CONTRACT_SIZE",
  "XAUUSD_FEED_URL",
  "XAUUSD_SPOT_URL",
  "XAUUSD_SPOT_REFRESH_MS"
];
function applyWorkerEnv(env2) {
  if (typeof process === "undefined" || !process.env) return;
  for (const key of GOLD_ENV_KEYS) {
    const value = env2[key];
    if (typeof value === "string") process.env[key] = value;
  }
}
__name(applyWorkerEnv, "applyWorkerEnv");

// src/gold/cf/http.ts
init_state();
var CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS"
};
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" }
  });
}
__name(json, "json");
function parseFill(body) {
  if (!body || typeof body !== "object") return null;
  const o = body;
  const ticket = o.ticket;
  const side = o.side === "buy" || o.side === "sell" ? o.side : null;
  const lots = typeof o.lots === "number" ? o.lots : Number(o.lots);
  const price = typeof o.price === "number" ? o.price : Number(o.price);
  if (ticket === void 0 || ticket === null || !side || !Number.isFinite(lots) || !Number.isFinite(price)) return null;
  const kind = o.kind === "open" || o.kind === "close" ? o.kind : void 0;
  const reason = o.reason === "signal" || o.reason === "sl" || o.reason === "tp" ? o.reason : void 0;
  const num3 = /* @__PURE__ */ __name((v) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      return Number.isFinite(n) ? n : void 0;
    }
    return void 0;
  }, "num");
  return {
    ticket: typeof ticket === "number" || typeof ticket === "string" ? ticket : String(ticket),
    side,
    lots,
    price,
    symbol: typeof o.symbol === "string" ? o.symbol : void 0,
    ts: num3(o.ts),
    kind,
    openPrice: num3(o.openPrice),
    closePrice: num3(o.closePrice),
    sl: num3(o.sl),
    tp: num3(o.tp),
    reason,
    pnl: num3(o.pnl),
    simulated: o.simulated === true ? true : o.simulated === false ? false : void 0
  };
}
__name(parseFill, "parseFill");
function createSseHub() {
  const clients = /* @__PURE__ */ new Set();
  const enc = new TextEncoder();
  const send = /* @__PURE__ */ __name((c, type, data) => {
    try {
      c.enqueue(enc.encode(`event: ${type}
data: ${JSON.stringify(data)}

`));
    } catch {
      clients.delete(c);
    }
  }, "send");
  return {
    get size() {
      return clients.size;
    },
    broadcast(type, data) {
      for (const c of clients) send(c, type, data);
    },
    subscribe(snapshot) {
      let controller;
      const stream = new ReadableStream({
        start(c) {
          controller = c;
          clients.add(c);
          send(c, "snapshot", snapshot());
        },
        cancel() {
          if (controller) clients.delete(controller);
        }
      });
      return new Response(stream, {
        headers: {
          ...CORS,
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive"
        }
      });
    }
  };
}
__name(createSseHub, "createSseHub");
async function handleGoldHttp(request, trader, meta, hub) {
  const { pathname } = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
  if ((pathname === "/status" || pathname === "/api") && request.method === "GET") {
    return json({ ...trader.snapshot(), ...meta });
  }
  if (pathname === "/history" && request.method === "GET") return json(trader.history);
  if (pathname === "/signal" && request.method === "GET") {
    const latest = trader.signal();
    return latest ? json(latest) : json({ error: "no signal yet" }, 404);
  }
  if (pathname === "/tick" && request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid json" }, 400);
    }
    const tick = parseTick(body);
    if (!tick) return json({ error: "need bid and ask, or mid/price" }, 400);
    await trader.onTick(tick);
    return json({ ok: true, latest: trader.signal() });
  }
  if (pathname === "/fill" && request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid json" }, 400);
    }
    const fill = parseFill(body);
    if (!fill) return json({ error: "need ticket, side, lots, price" }, 400);
    return json(trader.reportFill(fill));
  }
  if (pathname === "/events" && request.method === "GET") {
    return hub.subscribe(() => ({ ...trader.snapshot(), ...meta, history: trader.history }));
  }
  return json({ error: "not found" }, 404);
}
__name(handleGoldHttp, "handleGoldHttp");

// src/gold/cf/gold-room.ts
var IDLE_MS = 15 * 6e4;
var GoldRoom = class extends DurableObject {
  static {
    __name(this, "GoldRoom");
  }
  trader = null;
  meta = null;
  hub = createSseHub();
  mid = 0;
  live = false;
  lastFetch = 0;
  intervalMs = 1e3;
  refreshMs = 5e3;
  constructor(ctx, env2) {
    super(ctx, env2);
    applyWorkerEnv(this.env);
  }
  async ensureTicking() {
    await this.boot();
    await this.ctx.storage.put("lastSeen", Date.now());
    const alarm = await this.ctx.storage.getAlarm();
    if (alarm == null) {
      await this.ctx.storage.setAlarm(Date.now() + 50);
    }
  }
  async fetch(request) {
    const trader = await this.boot();
    await this.ensureTicking();
    return handleGoldHttp(request, trader, this.meta, this.hub);
  }
  async alarm() {
    try {
      const trader = await this.boot();
      await this.stepLiveTick(trader);
    } catch (err) {
      console.error("gold alarm", err instanceof Error ? err.message : String(err));
    }
    const lastSeen = await this.ctx.storage.get("lastSeen") ?? 0;
    const idle = this.hub.size === 0 && Date.now() - lastSeen > IDLE_MS;
    if (!idle) {
      await this.ctx.storage.setAlarm(Date.now() + this.intervalMs);
    }
  }
  async boot() {
    applyWorkerEnv(this.env);
    if (this.trader && this.meta) return this.trader;
    const { GoldMockModel: GoldMockModel2 } = await Promise.resolve().then(() => (init_model_mock(), model_mock_exports));
    const { GoldTrader: GoldTrader2 } = await Promise.resolve().then(() => (init_trader(), trader_exports));
    const { goldConfig: goldConfig2 } = await Promise.resolve().then(() => (init_config(), config_exports));
    const model = new GoldMockModel2();
    const trader = new GoldTrader2(model);
    this.intervalMs = goldConfig2.intervalMs > 0 ? goldConfig2.intervalMs : 1e3;
    this.refreshMs = goldConfig2.spotRefreshMs > 0 ? goldConfig2.spotRefreshMs : 5e3;
    this.meta = {
      model: model.name,
      market: "XAUUSD",
      dryRun: goldConfig2.dryRun,
      dummyMt5: goldConfig2.dummyMt5,
      startedAt: trader.startedAt,
      feed: "live"
    };
    trader.onEvent = (e) => this.hub.broadcast(e.fill ? "fill" : e.late ? "late" : "tick", e);
    trader.onSignal = (s) => this.hub.broadcast("signal", s);
    trader.onFill = (f) => this.hub.broadcast("fill", f);
    this.trader = trader;
    const stored = await this.ctx.storage.get("mid");
    const storedLive = await this.ctx.storage.get("live");
    if (typeof stored === "number" && stored > 100) {
      this.mid = stored;
      this.live = storedLive === true;
      if (this.meta) this.meta.feed = this.live ? "live" : "demo";
    }
    return trader;
  }
  async stepLiveTick(trader) {
    const { resolveGoldMid: resolveGoldMid2 } = await Promise.resolve().then(() => (init_spot(), spot_exports));
    const { demoTickFromMid: demoTickFromMid2 } = await Promise.resolve().then(() => (init_walk(), walk_exports));
    const now = Date.now();
    const stale = now - this.lastFetch >= this.refreshMs || this.mid <= 0;
    if (stale) {
      this.lastFetch = now;
      const next = await resolveGoldMid2({
        mid: this.mid > 0 ? this.mid : null,
        live: this.live
      });
      this.mid = next.mid;
      this.live = next.live;
      await this.ctx.storage.put("mid", this.mid);
      await this.ctx.storage.put("live", this.live);
    } else if (!this.live && this.mid > 0) {
      const { nextDemoMid: nextDemoMid2 } = await Promise.resolve().then(() => (init_walk(), walk_exports));
      this.mid = nextDemoMid2(this.mid);
      await this.ctx.storage.put("mid", this.mid);
    }
    if (this.meta) this.meta.feed = this.live ? "live" : "demo";
    if (this.mid > 0) await trader.onTick(demoTickFromMid2(this.mid));
  }
};

// src/gold/cf/page.ts
var GOLD_PAGES = { "/": { "body": '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />\n    <meta name="theme-color" content="#F0EEE9" />\n    <meta name="mobile-web-app-capable" content="yes" />\n    <title>Jev Gold</title>\n    <link rel="stylesheet" href="./demo.css" />\n  </head>\n  <body>\n    <div class="card">\n      <header class="header">\n        <div class="brand-row">\n          <span class="brand">Jev Gold</span>\n          <span class="pair">XAUUSD</span>\n          <span class="seq" id="seq">seq -</span>\n        </div>\n        <span class="offline" id="offline"></span>\n        <div class="pills">\n          <span class="pill" id="feed">live</span>\n          <span class="badge" id="model">mock</span>\n        </div>\n      </header>\n\n      <section class="pnl-band" id="pnlBand">\n        <div class="pnl-label">\n          <span class="section-label">DUMMY MT5 P AND L</span>\n          <span class="sim-tag">simulated</span>\n        </div>\n        <div class="pnl-grid">\n          <div class="pnl-card">\n            <div class="pnl-k">REALIZED</div>\n            <div class="pnl-v" id="pnlRealized">$0.00</div>\n          </div>\n          <div class="pnl-card">\n            <div class="pnl-k">OPEN</div>\n            <div class="pnl-v" id="pnlOpen">$0.00</div>\n          </div>\n          <div class="pnl-card">\n            <div class="pnl-k">TOTAL</div>\n            <div class="pnl-v" id="pnlTotal">$0.00</div>\n          </div>\n        </div>\n        <div class="last-ticket" id="lastTicket">no dummy result yet</div>\n      </section>\n\n      <div class="stats" id="stats"></div>\n\n      <div class="main">\n        <div class="left">\n          <div class="price-row">\n            <div>\n              <div class="price-label">MID</div>\n              <div class="price" id="mid">-</div>\n            </div>\n            <div class="pos" id="pos">flat</div>\n          </div>\n          <canvas id="chart" width="900" height="280"></canvas>\n        </div>\n        <div class="right">\n          <section class="panel">\n            <div class="section-label">STANDING ORDER</div>\n            <p class="order">scalp XAUUSD with small in and out buys and sells from the live gold spot. the model answers about once a second. no abstaining.</p>\n          </section>\n          <section class="panel">\n            <div class="section-label">WHICH SIDE THIS TICK?</div>\n            <div class="headline" id="headline">WAIT</div>\n            <div class="bar-row">\n              <span class="bar-label buy">buy</span>\n              <div class="track"><div class="fill buy" id="buyFill"></div></div>\n              <span class="bar-pct" id="buyPct">-</span>\n            </div>\n            <div class="bar-row">\n              <span class="bar-label sell">sell</span>\n              <div class="track"><div class="fill sell" id="sellFill"></div></div>\n              <span class="bar-pct" id="sellPct">-</span>\n            </div>\n            <div class="latency" id="latency"></div>\n          </section>\n          <section class="tape-wrap">\n            <div class="section-label">DECISIONS</div>\n            <div class="tape" id="tape"></div>\n          </section>\n        </div>\n      </div>\n\n      <section class="dummy" id="dummyPanel">\n        <div class="dummy-head">\n          <div>\n            <div class="section-label">DUMMY TRADE TAPE</div>\n            <p class="dummy-note" id="dummyNote">Simulated tickets. Not a live broker. Shows what JevLeader would open and close on XAUUSD, with profit or loss on every close.</p>\n          </div>\n          <div class="dummy-record" id="dummyRecord">W 0  L 0</div>\n        </div>\n        <div class="dummy-open" id="dummyOpen">waiting for first ticket</div>\n        <div class="tape dummy-tape" id="dummyTape"></div>\n      </section>\n\n      <p class="foot">Experimental gold scalp demo. Jev (or the stand-in) decides small in and out buys or sells from the live XAUUSD spot. The MT5 dummy tape is simulated so you can see opens and closes without a broker. Live broker fills only happen if you attach the MT5 EAs. Not financial advice.</p>\n    </div>\n    <script type="module" src="./demo.js"><\/script>\n  </body>\n</html>\n', "type": "text/html;charset=utf-8" }, "/demo.css": { "body": ':root {\n  --bg: #ffffff;\n  --panel: #f5f4f1;\n  --border: #ececea;\n  --border-2: #e5e4df;\n  --track: #f1f0ec;\n  --ink: #0a0a0a;\n  --ink-2: #3c3c38;\n  --muted: #77776f;\n  --muted-2: #98968e;\n  --buy: #0fa968;\n  --buy-ink: #0b7a48;\n  --buy-bar: #34c382;\n  --buy-bar-dim: #d9eee3;\n  --sell: #e4573d;\n  --sell-ink: #c2402f;\n  --sell-bar: #f07860;\n  --sell-bar-dim: #f9ded6;\n  --late-ink: #a16207;\n  --badge-jev-bg: #ebe7fc;\n  --badge-jev-fg: #4c3ebb;\n  --badge-standin-bg: #fbeed3;\n  --badge-standin-fg: #8a5b0e;\n  --page-bg: #f0eee9;\n  --font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;\n  --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;\n}\n\n*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n\nhtml,\nbody {\n  margin: 0;\n  padding: 0;\n  overflow-x: hidden;\n}\n\nbody {\n  background: var(--page-bg);\n  color: var(--ink);\n  font-family: var(--font-sans);\n  font-size: 14px;\n  line-height: 1.4;\n  -webkit-text-size-adjust: 100%;\n}\n\n.card {\n  background: var(--bg);\n  border: 1px solid var(--border);\n  border-radius: 18px;\n  max-width: min(1400px, calc(100% - 32px));\n  margin: 16px auto;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  padding-bottom: 16px;\n}\n\n.header {\n  display: flex;\n  align-items: center;\n  gap: 12px 16px;\n  padding: 16px 24px;\n}\n\n.brand-row {\n  display: flex;\n  align-items: baseline;\n  flex-wrap: wrap;\n  gap: 8px 12px;\n  min-width: 0;\n}\n\n.brand {\n  font-weight: 600;\n  font-size: 16px;\n}\n\n.pills {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 8px;\n  margin-left: auto;\n}\n\n.pair,\n.seq,\n.offline {\n  color: var(--muted);\n  font-variant-numeric: tabular-nums;\n}\n\n.spacer {\n  flex: 1;\n}\n\n.pill,\n.badge {\n  border-radius: 999px;\n  padding: 7px 12px;\n  font-size: 12px;\n  font-weight: 500;\n  border: 1px solid var(--border-2);\n}\n\n.badge.jev {\n  background: var(--badge-jev-bg);\n  color: var(--badge-jev-fg);\n  border-color: transparent;\n}\n\n.badge.standin {\n  background: var(--badge-standin-bg);\n  color: var(--badge-standin-fg);\n  border-color: transparent;\n}\n\n.pnl-band {\n  padding: 0 24px 16px;\n}\n\n.pnl-label {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  margin-bottom: 8px;\n}\n\n.sim-tag {\n  font-size: 11px;\n  letter-spacing: 0.08em;\n  color: var(--muted);\n  border: 1px solid var(--border-2);\n  border-radius: 999px;\n  padding: 3px 8px;\n}\n\n.pnl-grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 12px;\n}\n\n.pnl-card {\n  background: var(--panel);\n  border-radius: 14px;\n  padding: 14px 16px;\n}\n\n.pnl-k {\n  font-size: 11px;\n  letter-spacing: 0.08em;\n  color: var(--muted-2);\n}\n\n.pnl-v {\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n  font-size: 36px;\n  letter-spacing: -0.03em;\n  margin-top: 4px;\n}\n\n.pnl-v.up {\n  color: var(--buy-ink);\n}\n\n.pnl-v.down {\n  color: var(--sell-ink);\n}\n\n.last-ticket {\n  margin-top: 10px;\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n  font-size: 15px;\n  color: var(--ink-2);\n  overflow-wrap: anywhere;\n}\n\n.last-ticket.up {\n  color: var(--buy-ink);\n}\n\n.last-ticket.down {\n  color: var(--sell-ink);\n}\n\n.stats {\n  display: grid;\n  grid-template-columns: repeat(6, 1fr);\n  gap: 10px;\n  padding: 0 24px 16px;\n}\n\n.stat {\n  background: var(--panel);\n  border-radius: 12px;\n  padding: 10px 12px;\n}\n\n.stat .k {\n  font-size: 11px;\n  letter-spacing: 0.08em;\n  color: var(--muted-2);\n}\n\n.stat .v {\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n  font-size: 16px;\n  margin-top: 4px;\n}\n\n.main {\n  display: flex;\n  gap: 16px;\n  padding: 0 24px;\n  align-items: stretch;\n}\n\n.left {\n  flex: 1;\n  min-width: 0;\n}\n\n.price-row {\n  display: flex;\n  align-items: baseline;\n  justify-content: space-between;\n  margin-bottom: 8px;\n}\n\n.price-label {\n  font-size: 11px;\n  letter-spacing: 0.1em;\n  color: var(--muted-2);\n}\n\n.price {\n  font-family: var(--font-mono);\n  font-size: 36px;\n  font-variant-numeric: tabular-nums;\n  letter-spacing: -0.03em;\n}\n\n.pos {\n  font-family: var(--font-mono);\n  font-size: 13px;\n  padding: 6px 10px;\n  border-radius: 999px;\n  background: var(--panel);\n}\n\n.pos.buy {\n  color: var(--buy-ink);\n}\n\n.pos.sell {\n  color: var(--sell-ink);\n}\n\n#chart {\n  width: 100%;\n  height: 280px;\n  display: block;\n}\n\n.right {\n  width: 420px;\n  flex: none;\n  border: 1px solid var(--border);\n  border-radius: 20px;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n}\n\n.panel {\n  padding: 18px;\n  border-bottom: 1px solid var(--border);\n}\n\n.section-label {\n  font-size: 11px;\n  letter-spacing: 0.1em;\n  color: var(--muted-2);\n  font-weight: 500;\n}\n\n.order {\n  margin: 6px 0 0;\n  font-family: var(--font-mono);\n  font-size: 12.5px;\n  color: var(--ink-2);\n}\n\n.headline {\n  margin: 10px 0 14px;\n  font-size: 28px;\n  font-weight: 600;\n}\n\n.headline.buy {\n  color: var(--buy-ink);\n}\n\n.headline.sell {\n  color: var(--sell-ink);\n}\n\n.headline.late {\n  color: var(--late-ink);\n}\n\n.bar-row {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 4px 0;\n}\n\n.bar-label {\n  width: 44px;\n}\n\n.bar-label.buy {\n  color: var(--buy-ink);\n}\n\n.bar-label.sell {\n  color: var(--sell-ink);\n}\n\n.track {\n  flex: 1;\n  height: 16px;\n  border-radius: 99px;\n  background: var(--track);\n  overflow: hidden;\n}\n\n.fill {\n  height: 100%;\n  width: 0;\n  border-radius: 99px;\n}\n\n.fill.buy {\n  background: var(--buy-bar);\n}\n\n.fill.sell {\n  background: var(--sell-bar);\n}\n\n.bar-pct {\n  width: 46px;\n  text-align: right;\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n}\n\n.latency {\n  margin-top: 10px;\n  color: var(--muted);\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n  font-size: 12px;\n}\n\n.tape-wrap {\n  padding: 14px 18px 18px;\n  flex: 1;\n  min-height: 160px;\n}\n\n.tape {\n  margin-top: 8px;\n  font-family: var(--font-mono);\n  font-size: 12px;\n  font-variant-numeric: tabular-nums;\n}\n\n.tape .row {\n  display: grid;\n  grid-template-columns: 52px 48px 1fr 52px;\n  gap: 8px;\n  padding: 5px 0;\n  border-bottom: 1px solid var(--border);\n}\n\n.tape .buy {\n  color: var(--buy-ink);\n}\n\n.tape .sell {\n  color: var(--sell-ink);\n}\n\n.dummy {\n  margin: 16px 24px 0;\n  border: 1px solid var(--border);\n  border-radius: 16px;\n  padding: 16px 18px 12px;\n  background: var(--panel);\n}\n\n.dummy-head {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 16px;\n}\n\n.dummy-note {\n  margin: 6px 0 0;\n  color: var(--ink-2);\n  font-size: 12.5px;\n  max-width: 52rem;\n}\n\n.dummy-record {\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n  font-size: 16px;\n  color: var(--ink-2);\n  white-space: nowrap;\n  flex: none;\n}\n\n.dummy-open {\n  margin: 12px 0 8px;\n  font-family: var(--font-mono);\n  font-size: 13px;\n  font-variant-numeric: tabular-nums;\n  color: var(--ink-2);\n}\n\n.dummy-open .buy {\n  color: var(--buy-ink);\n}\n\n.dummy-open .sell {\n  color: var(--sell-ink);\n}\n\n.dummy-tape {\n  margin-top: 4px;\n}\n\n.dummy-tape .row {\n  grid-template-columns: 56px 72px 72px 1fr 72px;\n}\n\n.dummy-tape .sl,\n.dummy-tape .close {\n  color: var(--sell-ink);\n}\n\n.dummy-tape .tp {\n  color: var(--buy-ink);\n}\n\n.dummy-tape .signal {\n  color: var(--ink-2);\n}\n\n.dummy-tape .up {\n  color: var(--buy-ink);\n}\n\n.dummy-tape .down {\n  color: var(--sell-ink);\n}\n\n.foot {\n  margin: 16px 24px 0;\n  color: var(--muted);\n  font-size: 12px;\n}\n\n@media (max-width: 899px) {\n  .card {\n    max-width: calc(100% - 16px);\n    margin: 8px auto;\n    border-radius: 14px;\n  }\n\n  .header,\n  .pnl-band,\n  .stats,\n  .main,\n  .dummy,\n  .foot {\n    padding-left: 14px;\n    padding-right: 14px;\n  }\n\n  .header {\n    flex-wrap: wrap;\n    gap: 8px 10px;\n    padding-top: 12px;\n    padding-bottom: 12px;\n  }\n\n  .pills {\n    margin-left: 0;\n  }\n\n  .main {\n    flex-direction: column;\n  }\n\n  .right,\n  .stats {\n    width: 100%;\n  }\n\n  .stats {\n    grid-template-columns: repeat(3, 1fr);\n  }\n\n  .dummy-head {\n    flex-direction: column;\n    align-items: flex-start;\n  }\n\n  .dummy-record {\n    white-space: normal;\n  }\n\n  .dummy-open {\n    white-space: normal;\n    overflow-wrap: anywhere;\n  }\n\n  .pnl-grid {\n    grid-template-columns: 1fr;\n  }\n\n  .pnl-v {\n    font-size: 28px;\n  }\n\n  #chart {\n    height: 200px;\n  }\n\n  .dummy-tape .row {\n    grid-template-columns: 44px 1fr auto;\n    grid-template-areas:\n      "id side pnl"\n      "open close close";\n    row-gap: 2px;\n  }\n\n  .dummy-tape .t-id { grid-area: id; }\n  .dummy-tape .t-side { grid-area: side; }\n  .dummy-tape .t-open { grid-area: open; }\n  .dummy-tape .t-close { grid-area: close; }\n  .dummy-tape .t-pnl { grid-area: pnl; }\n\n  .dummy-tape .row.empty {\n    display: block;\n    grid-template-columns: none;\n    grid-template-areas: none;\n  }\n}\n\n@media (max-width: 520px) {\n  .card {\n    max-width: 100%;\n    margin: 0;\n    border-radius: 0;\n    border-left: 0;\n    border-right: 0;\n    padding-bottom: max(16px, env(safe-area-inset-bottom));\n  }\n\n  .header,\n  .pnl-band,\n  .stats,\n  .main,\n  .dummy,\n  .foot {\n    padding-left: max(12px, env(safe-area-inset-left));\n    padding-right: max(12px, env(safe-area-inset-right));\n  }\n\n  .dummy,\n  .foot {\n    margin-left: max(12px, env(safe-area-inset-left));\n    margin-right: max(12px, env(safe-area-inset-right));\n  }\n\n  .stats {\n    grid-template-columns: repeat(2, 1fr);\n    gap: 8px;\n  }\n\n  .stat {\n    padding: 8px 10px;\n  }\n\n  .price-row {\n    flex-wrap: wrap;\n    gap: 8px 12px;\n  }\n\n  .price {\n    font-size: 28px;\n  }\n\n  .headline {\n    font-size: 22px;\n  }\n\n  .pnl-card {\n    padding: 12px 14px;\n  }\n\n  .pnl-v {\n    font-size: 26px;\n  }\n\n  .last-ticket,\n  .dummy-open,\n  .order,\n  .dummy-note,\n  .foot {\n    overflow-wrap: anywhere;\n  }\n\n  .tape .row {\n    grid-template-columns: 36px 40px 1fr 40px;\n    font-size: 11px;\n  }\n\n  .pill,\n  .badge {\n    padding: 6px 10px;\n  }\n\n  #chart {\n    height: 168px;\n  }\n\n  .right {\n    border-radius: 14px;\n  }\n\n  .panel,\n  .tape-wrap {\n    padding-left: 14px;\n    padding-right: 14px;\n  }\n}\n', "type": "text/css;charset=utf-8" }, "/demo.js": { "body": 'var l=(e)=>document.getElementById(e),u=[],b=[],m=[],P=new Set,M=null,C=null,g=0,S=!0,a=null,p=null,r={realized:0,floating:0,wins:0,losses:0},f={ticks:0,decisions:0,lateTicks:0,fills:0,jevUsd:0};function E(e){return`${Math.round(e*100)}%`}function A(e){let s=l("model");if(s){s.textContent=e.model;let t=e.model.toLowerCase().startsWith("jev");s.className=`badge ${t?"jev":"standin"}`}let i=l("feed");if(i)i.textContent=e.feed??"live";if(typeof e.horizonMs==="number"&&e.horizonMs>0)C=e.horizonMs;if(e.totals)f=e.totals;if(S=e.dummyMt5!==!1,e.openTicket!==void 0)a=e.openTicket;if(e.dummyTrades){m.length=0,m.push(...e.dummyTrades),p=m.at(-1)??null,P.clear();for(let t of m)P.add(`${t.ticket}|close|${t.closePrice}|${t.reason}|${t.closeTs}`)}if(e.lastTicket!==void 0)p=e.lastTicket;if(e.dummyPnl||typeof e.realizedUsd==="number")r={realized:e.dummyPnl?.realized??e.dummyPnl?.realizedUsd??e.realizedUsd??e.totals?.realizedUsd??0,floating:e.dummyPnl?.floating??e.dummyPnl?.unrealizedUsd??e.unrealizedUsd??e.totals?.unrealizedUsd??0,wins:e.dummyPnl?.wins??e.wins??e.totals?.wins??m.filter((t)=>t.pnl>0).length,losses:e.dummyPnl?.losses??e.losses??e.totals?.losses??m.filter((t)=>t.pnl<0).length};if(e.history){for(let t of e.history)if(u.push(t.mid),g=t.mid,t.decision&&!t.late&&!t.fill)b.push(t.decision);if(u.length>240)u.splice(0,u.length-240);if(b.length>12)b.splice(0,b.length-12)}if(e.latest)g=e.latest.mid,z(e.latest);let n=l("offline");if(n)n.textContent=e.error?e.error:"";w(),x(),L()}function z(e){M=e;let s=l("mid");if(s)s.textContent=e.mid.toFixed(2);let i=l("seq");if(i)i.textContent=`seq ${e.seq}`;let n=l("pos");if(n)n.textContent=e.position,n.className=`pos ${e.position}`;let t=e.late||e.action==="hold"?null:e.action,o=l("headline");if(o)o.textContent=t?`${t.toUpperCase()} ${E(e.probabilities[t])}`:"LATE",o.className=`headline ${t??"late"}`;let d=l("buyFill"),c=l("sellFill"),y=l("buyPct"),T=l("sellPct");if(d)d.style.width=`${Math.max(0,Math.min(1,e.probabilities.buy))*100}%`;if(c)c.style.width=`${Math.max(0,Math.min(1,e.probabilities.sell))*100}%`;if(y)y.textContent=t?E(e.probabilities.buy):"-";if(T)T.textContent=t?E(e.probabilities.sell):"-";let k=l("latency");if(k)k.textContent=e.late?"late  held":`${e.latencyMs.toFixed(0)} ms${e.sim?"  sim":""}`}function w(){let e=l("stats");if(!e)return;let s=[["TICKS",String(f.ticks)],["DECISIONS",String(f.decisions)],["LATE",String(f.lateTicks)],["FILLS",String(f.fills)],["JEV USD",f.jevUsd.toFixed(4)],["HORIZON",C?`${C/1000}s`:"-"],["SPREAD",M?`${M.spreadPips.toFixed(1)} pips`:"-"],["WINS",String(r.wins)],["LOSSES",String(r.losses)]];e.innerHTML=s.map(([i,n])=>`<div class="stat"><div class="k">${i}</div><div class="v">${n}</div></div>`).join("")}function h(e){let s=Math.abs(e).toFixed(2);if(e>0)return`+$${s}`;if(e<0)return`-$${s}`;return"$0.00"}function v(e){return e>0?"up":e<0?"down":""}function G(e){switch(e){case"sl":return"SL";case"tp":return"TP";case"signal":return"CLOSE";default:return e}}function O(e){r.realized=e.realizedUsd,r.floating=e.unrealizedUsd,r.wins=e.wins,r.losses=e.losses}function R(){let e=l("pnlBand");if(e)e.style.display=S?"":"none";let s=r.realized,i=r.floating,n=s+i,t=l("pnlRealized");if(t)t.textContent=h(s),t.className=`pnl-v ${v(s)}`;let o=l("pnlOpen");if(o)o.textContent=h(i),o.className=`pnl-v ${v(i)}`;let d=l("pnlTotal");if(d)d.textContent=h(n),d.className=`pnl-v ${v(n)}`;let c=l("lastTicket");if(c)if(p)c.textContent=`last ticket #${p.ticket} ${p.side.toUpperCase()} ${G(p.reason)} ${h(p.pnl)}`,c.className=`last-ticket ${v(p.pnl)}`;else if(a)c.textContent=`open ticket #${a.ticket} ${a.side.toUpperCase()} ${h(r.floating)}`,c.className=`last-ticket ${v(r.floating)}`;else c.textContent="no dummy result yet",c.className="last-ticket"}function x(){let e=l("dummyPanel");if(e)e.style.display=S?"":"none";let s=l("dummyNote");if(s)s.textContent=S?"Simulated tickets. Not a live broker. Shows what JevLeader would open and close on XAUUSD, with profit or loss on every close.":"Dummy MT5 is off. Attach the real EAs to see broker fills.";let i=l("dummyRecord");if(i)i.textContent=`W ${r.wins}  L ${r.losses}`;let n=l("dummyOpen");if(n)if(!a)n.textContent=m.length?"no open ticket":"waiting for first ticket",n.className="dummy-open";else{let o=a;n.innerHTML=`<span class="${o.side}">${o.side.toUpperCase()} in</span> #${o.ticket}  ${o.lots} lot @ ${o.openPrice.toFixed(2)}  SL ${o.sl.toFixed(2)}  TP ${o.tp.toFixed(2)}  open ${h(r.floating)}`,n.className=`dummy-open ${o.side}`}let t=l("dummyTape");if(t){let o=[...m].reverse().slice(0,16).map((d)=>{let c=G(d.reason);return`<div class="row"><span class="t-id">#${d.ticket}</span><span class="t-side ${d.side}">${d.side.toUpperCase()} in</span><span class="t-open">${d.openPrice.toFixed(2)}</span><span class="t-close ${d.reason}">${c} ${d.closePrice.toFixed(2)}</span><span class="t-pnl ${v(d.pnl)}">${h(d.pnl)}</span></div>`});t.innerHTML=o.join("")||\'<div class="row empty"><span class="t-open">no dummy trades yet</span></div>\'}R()}function H(e){return`${e.ticket}|${e.kind??""}|${e.price}|${e.reason??""}|${e.ts??""}`}function U(e){let s=H(e);if(P.has(s))return;if(P.add(s),f.fills+=1,e.kind==="open")a={ticket:typeof e.ticket==="number"?e.ticket:Number(e.ticket),side:e.side,lots:e.lots,openPrice:e.openPrice??e.price,sl:e.sl??0,tp:e.tp??0,openTs:e.ts??Date.now()};else if(e.kind==="close"||e.reason){let i={ticket:typeof e.ticket==="number"?e.ticket:Number(e.ticket),side:e.side,lots:e.lots,openPrice:e.openPrice??a?.openPrice??e.price,sl:e.sl??a?.sl??0,tp:e.tp??a?.tp??0,closePrice:e.closePrice??e.price,reason:e.reason??"signal",pnl:e.pnl??0,openTs:a?.openTs??e.ts??Date.now(),closeTs:e.ts??Date.now()};if(m.push(i),m.length>40)m.shift();r.realized=m.reduce((n,t)=>n+t.pnl,0),r.wins=m.filter((n)=>n.pnl>0).length,r.losses=m.filter((n)=>n.pnl<0).length,r.floating=0,p=i,a=null}if(a&&g){let i=a.side==="buy"?1:-1;r.floating=(g-a.openPrice)*i*100*a.lots}x(),w()}function j(){let e=l("tape");if(!e)return;let s=[...b].reverse().slice(0,12);e.innerHTML=s.map((i)=>`<div class="row"><span>${i.seq}</span><span class="${i.action}">${i.action}</span><span>${i.mid.toFixed(2)}</span><span>${i.latencyMs.toFixed(0)}ms</span></div>`).join("")}function L(){let e=l("chart");if(!e||u.length<2)return;let s=window.devicePixelRatio||1,{clientWidth:i,clientHeight:n}=e;if(e.width!==Math.floor(i*s)||e.height!==Math.floor(n*s))e.width=Math.floor(i*s),e.height=Math.floor(n*s);let t=e.getContext("2d");if(!t)return;t.setTransform(s,0,0,s,0,0),t.clearRect(0,0,i,n);let o=Math.min(...u),d=Math.max(...u),c=Math.max(0.2,d-o),y=12;t.strokeStyle="#0a0a0a",t.lineWidth=1.5,t.beginPath(),u.forEach((T,k)=>{let F=y+k/(u.length-1)*(i-y*2),D=y+(1-(T-o)/c)*(n-y*2);if(k===0)t.moveTo(F,D);else t.lineTo(F,D)}),t.stroke()}function N(e){if(u.push(e.mid),g=e.mid,u.length>240)u.shift();if(!e.fill)f.ticks+=1;if(e.late)f.lateTicks+=1;if(e.decision&&!e.late&&!e.fill){if(f.decisions+=1,b.push(e.decision),b.length>24)b.shift();z(e.decision),j()}if(e.fill)U(e.fill);else if(e.pnl){if(O(e.pnl),e.lastTicket!==void 0)p=e.lastTicket;x()}else if(a){let i=a.side==="buy"?1:-1;r.floating=(e.mid-a.openPrice)*i*100*a.lots,x()}let s=l("mid");if(s&&!e.decision)s.textContent=e.mid.toFixed(2);w(),L()}function I(){let e=new EventSource("/events"),s=l("offline");e.addEventListener("snapshot",(i)=>{if(s)s.textContent="";A(JSON.parse(i.data)),j()}),e.addEventListener("tick",(i)=>N(JSON.parse(i.data))),e.addEventListener("late",(i)=>N(JSON.parse(i.data))),e.addEventListener("fill",(i)=>{let n=JSON.parse(i.data);if(n&&typeof n==="object"&&"fill"in n&&n.fill){if(g=typeof n.mid==="number"?n.mid:g,n.pnl)O(n.pnl);if(n.lastTicket!==void 0)p=n.lastTicket;U(n.fill);return}if(n&&typeof n==="object"&&"ticket"in n&&"side"in n)U(n)}),e.addEventListener("signal",(i)=>{let n=JSON.parse(i.data);z(n),w()}),e.onerror=()=>{if(s)s.textContent="reconnecting"}}I();window.addEventListener("resize",L);\n', "type": "text/javascript;charset=utf-8" } };

// src/gold/cf/worker.ts
var PAGE_ALIASES = {
  "/": "/",
  "/demo": "/",
  "/index.html": "/",
  "/demo.css": "/demo.css",
  "/demo.js": "/demo.js"
};
function pageResponse(pathname) {
  const key = PAGE_ALIASES[pathname];
  if (!key) return null;
  const page = GOLD_PAGES[key];
  if (!page) return null;
  return new Response(page.body, {
    headers: {
      "content-type": page.type,
      "cache-control": "no-store"
    }
  });
}
__name(pageResponse, "pageResponse");
var worker_default = {
  async fetch(request, env2, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const stub = env2.GOLD_ROOM.getByName("xauusd-live");
    const page = pageResponse(url.pathname);
    if (page) {
      ctx.waitUntil(stub.ensureTicking());
      return page;
    }
    return stub.fetch(request);
  }
};
export {
  GoldRoom,
  worker_default as default
};
//# sourceMappingURL=worker.js.map
