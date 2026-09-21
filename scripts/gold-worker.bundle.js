var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name25 in all)
    __defProp(target, name25, { get: all[name25], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

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
      /**
       * Dummy reverse only after the live mid has moved at least this many points.
       * Stops scratch $0 closes when Jev flips on an unchanged spot.
       */
      minReversePoints: parsePositiveInt(env("GOLD_MIN_REVERSE_POINTS"), 1),
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
      /**
       * How often to refresh the live spot. Default matches GOLD_INTERVAL_MS so Jev
       * sees a quote as fresh as gold-api will serve (Cache-Control max-age is 1s).
       */
      spotRefreshMs: Number(env("XAUUSD_SPOT_REFRESH_MS", "1000")),
      historySize: 1e3
    };
  }
});

// src/gold/dummy-mt5.ts
function dummyReverseAllowed(openPrice, mid, minPoints, point) {
  if (!(point > 0) || !(minPoints > 0)) return true;
  return Math.abs(mid - openPrice) >= minPoints * point - 1e-9;
}
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
    __name(dummyReverseAllowed, "dummyReverseAllowed");
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
       * Hold a reverse while mid is still at the open (live spot often sits still).
       * Flatten still closes at mid so a real flatten is not blocked.
       */
      sync(want, mid, ts) {
        const fills = [];
        const have = this.open?.side ?? "flat";
        if (have === want) return fills;
        if (this.open && (want === "buy" || want === "sell")) {
          const minPoints = this.opts.minReversePoints ?? 1;
          if (!dummyReverseAllowed(this.open.openPrice, mid, minPoints, this.opts.point)) {
            return fills;
          }
        }
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
    historySize: goldConfig.historySize,
    minReversePoints: goldConfig.minReversePoints
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
          if (this.dummy) {
            this.position = this.dummy.openTicket?.side ?? "flat";
          }
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
            const _never2 = signal;
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

// node_modules/@ai-sdk/provider/dist/index.js
function getErrorMessage(error2) {
  if (error2 == null) {
    return "unknown error";
  }
  if (typeof error2 === "string") {
    return error2;
  }
  if (error2 instanceof Error) {
    return error2.toString();
  }
  return JSON.stringify(error2);
}
var marker, symbol, _a, _b, AISDKError, name, marker2, symbol2, _a2, _b2, APICallError, name2, marker3, symbol3, _a3, _b3, EmptyResponseBodyError, name3, marker4, symbol4, _a4, _b4, EvaluationUnsupportedQuestionTypeError, name4, marker5, symbol5, _a5, _b5, InvalidArgumentError, name5, marker6, symbol6, _a6, _b6, InvalidPromptError, name6, marker7, symbol7, _a7, _b7, InvalidResponseDataError, name7, marker8, symbol8, _a8, _b8, JSONParseError, name8, marker9, symbol9, _a9, _b9, LoadAPIKeyError, name9, marker10, symbol10, _a10, _b10, LoadSettingError, name10, marker11, symbol11, _a11, _b11, NoContentGeneratedError, name11, marker12, symbol12, _a12, _b12, NoSuchModelError, name12, marker13, symbol13, _a13, _b13, NoSuchProviderReferenceError, name13, marker14, symbol14, _a14, _b14, TooManyEmbeddingValuesForCallError, name14, marker15, symbol15, _a15, _b15, TypeValidationError, name15, marker16, symbol16, _a16, _b16, UnsupportedFunctionalityError;
var init_dist = __esm({
  "node_modules/@ai-sdk/provider/dist/index.js"() {
    marker = "vercel.ai.error";
    symbol = Symbol.for(marker);
    AISDKError = class _AISDKError extends (_b = Error, _a = symbol, _b) {
      static {
        __name(this, "_AISDKError");
      }
      /**
       * Creates an AI SDK Error.
       *
       * @param {Object} params - The parameters for creating the error.
       * @param {string} params.name - The name of the error.
       * @param {string} params.message - The error message.
       * @param {unknown} [params.cause] - The underlying cause of the error.
       */
      constructor({
        name: name163,
        message,
        cause
      }) {
        super(message);
        this[_a] = true;
        this.name = name163;
        this.cause = cause;
      }
      /**
       * Checks if the given error is an AI SDK Error.
       * @param {unknown} error - The error to check.
       * @returns {boolean} True if the error is an AI SDK Error, false otherwise.
       */
      static isInstance(error2) {
        return _AISDKError.hasMarker(error2, marker);
      }
      static hasMarker(error2, marker173) {
        const markerSymbol = Symbol.for(marker173);
        return error2 != null && typeof error2 === "object" && markerSymbol in error2 && typeof error2[markerSymbol] === "boolean" && error2[markerSymbol] === true;
      }
    };
    name = "AI_APICallError";
    marker2 = `vercel.ai.error.${name}`;
    symbol2 = Symbol.for(marker2);
    APICallError = class extends (_b2 = AISDKError, _a2 = symbol2, _b2) {
      static {
        __name(this, "APICallError");
      }
      constructor({
        message,
        url,
        requestBodyValues,
        statusCode,
        responseHeaders,
        responseBody,
        cause,
        isRetryable = statusCode != null && (statusCode === 408 || // request timeout
        statusCode === 409 || // conflict
        statusCode === 429 || // too many requests
        statusCode >= 500),
        // server error
        data
      }) {
        super({ name, message, cause });
        this[_a2] = true;
        this.url = url;
        this.requestBodyValues = requestBodyValues;
        this.statusCode = statusCode;
        this.responseHeaders = responseHeaders;
        this.responseBody = responseBody;
        this.isRetryable = isRetryable;
        this.data = data;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker2);
      }
    };
    name2 = "AI_EmptyResponseBodyError";
    marker3 = `vercel.ai.error.${name2}`;
    symbol3 = Symbol.for(marker3);
    EmptyResponseBodyError = class extends (_b3 = AISDKError, _a3 = symbol3, _b3) {
      static {
        __name(this, "EmptyResponseBodyError");
      }
      // used in isInstance
      constructor({ message = "Empty response body" } = {}) {
        super({ name: name2, message });
        this[_a3] = true;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker3);
      }
    };
    name3 = "AI_EvaluationUnsupportedQuestionTypeError";
    marker4 = `vercel.ai.error.${name3}`;
    symbol4 = Symbol.for(marker4);
    EvaluationUnsupportedQuestionTypeError = class extends (_b4 = AISDKError, _a4 = symbol4, _b4) {
      static {
        __name(this, "EvaluationUnsupportedQuestionTypeError");
      }
      constructor({
        questionId,
        questionType,
        provider,
        modelId,
        message = `Question "${questionId}" has type "${questionType}", which is not supported by provider "${provider}" and model "${modelId}".`
      }) {
        super({ name: name3, message });
        this[_a4] = true;
        this.questionId = questionId;
        this.questionType = questionType;
        this.provider = provider;
        this.modelId = modelId;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker4);
      }
    };
    __name(getErrorMessage, "getErrorMessage");
    name4 = "AI_InvalidArgumentError";
    marker5 = `vercel.ai.error.${name4}`;
    symbol5 = Symbol.for(marker5);
    InvalidArgumentError = class extends (_b5 = AISDKError, _a5 = symbol5, _b5) {
      static {
        __name(this, "InvalidArgumentError");
      }
      constructor({
        message,
        cause,
        argument
      }) {
        super({ name: name4, message, cause });
        this[_a5] = true;
        this.argument = argument;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker5);
      }
    };
    name5 = "AI_InvalidPromptError";
    marker6 = `vercel.ai.error.${name5}`;
    symbol6 = Symbol.for(marker6);
    InvalidPromptError = class extends (_b6 = AISDKError, _a6 = symbol6, _b6) {
      static {
        __name(this, "InvalidPromptError");
      }
      constructor({
        prompt,
        message,
        cause
      }) {
        super({ name: name5, message: `Invalid prompt: ${message}`, cause });
        this[_a6] = true;
        this.prompt = prompt;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker6);
      }
    };
    name6 = "AI_InvalidResponseDataError";
    marker7 = `vercel.ai.error.${name6}`;
    symbol7 = Symbol.for(marker7);
    InvalidResponseDataError = class extends (_b7 = AISDKError, _a7 = symbol7, _b7) {
      static {
        __name(this, "InvalidResponseDataError");
      }
      constructor({
        data,
        message = `Invalid response data: ${JSON.stringify(data)}.`
      }) {
        super({ name: name6, message });
        this[_a7] = true;
        this.data = data;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker7);
      }
    };
    name7 = "AI_JSONParseError";
    marker8 = `vercel.ai.error.${name7}`;
    symbol8 = Symbol.for(marker8);
    JSONParseError = class extends (_b8 = AISDKError, _a8 = symbol8, _b8) {
      static {
        __name(this, "JSONParseError");
      }
      constructor({ text: text2, cause }) {
        super({
          name: name7,
          message: `JSON parsing failed: Text: ${text2}.
Error message: ${getErrorMessage(cause)}`,
          cause
        });
        this[_a8] = true;
        this.text = text2;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker8);
      }
    };
    name8 = "AI_LoadAPIKeyError";
    marker9 = `vercel.ai.error.${name8}`;
    symbol9 = Symbol.for(marker9);
    LoadAPIKeyError = class extends (_b9 = AISDKError, _a9 = symbol9, _b9) {
      static {
        __name(this, "LoadAPIKeyError");
      }
      // used in isInstance
      constructor({ message }) {
        super({ name: name8, message });
        this[_a9] = true;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker9);
      }
    };
    name9 = "AI_LoadSettingError";
    marker10 = `vercel.ai.error.${name9}`;
    symbol10 = Symbol.for(marker10);
    LoadSettingError = class extends (_b10 = AISDKError, _a10 = symbol10, _b10) {
      static {
        __name(this, "LoadSettingError");
      }
      // used in isInstance
      constructor({ message }) {
        super({ name: name9, message });
        this[_a10] = true;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker10);
      }
    };
    name10 = "AI_NoContentGeneratedError";
    marker11 = `vercel.ai.error.${name10}`;
    symbol11 = Symbol.for(marker11);
    NoContentGeneratedError = class extends (_b11 = AISDKError, _a11 = symbol11, _b11) {
      static {
        __name(this, "NoContentGeneratedError");
      }
      // used in isInstance
      constructor({
        message = "No content generated."
      } = {}) {
        super({ name: name10, message });
        this[_a11] = true;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker11);
      }
    };
    name11 = "AI_NoSuchModelError";
    marker12 = `vercel.ai.error.${name11}`;
    symbol12 = Symbol.for(marker12);
    NoSuchModelError = class extends (_b12 = AISDKError, _a12 = symbol12, _b12) {
      static {
        __name(this, "NoSuchModelError");
      }
      constructor({
        errorName = name11,
        modelId,
        modelType,
        message = `No such ${modelType}: ${modelId}`
      }) {
        super({ name: errorName, message });
        this[_a12] = true;
        this.modelId = modelId;
        this.modelType = modelType;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker12);
      }
    };
    name12 = "AI_NoSuchProviderReferenceError";
    marker13 = `vercel.ai.error.${name12}`;
    symbol13 = Symbol.for(marker13);
    NoSuchProviderReferenceError = class extends (_b13 = AISDKError, _a13 = symbol13, _b13) {
      static {
        __name(this, "NoSuchProviderReferenceError");
      }
      constructor({
        provider,
        reference,
        message = `No provider reference found for provider '${provider}'. Available providers: ${Object.keys(reference).join(", ")}`
      }) {
        super({ name: name12, message });
        this[_a13] = true;
        this.provider = provider;
        this.reference = reference;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker13);
      }
    };
    name13 = "AI_TooManyEmbeddingValuesForCallError";
    marker14 = `vercel.ai.error.${name13}`;
    symbol14 = Symbol.for(marker14);
    TooManyEmbeddingValuesForCallError = class extends (_b14 = AISDKError, _a14 = symbol14, _b14) {
      static {
        __name(this, "TooManyEmbeddingValuesForCallError");
      }
      constructor(options) {
        super({
          name: name13,
          message: `Too many values for a single embedding call. The ${options.provider} model "${options.modelId}" can only embed up to ${options.maxEmbeddingsPerCall} values per call, but ${options.values.length} values were provided.`
        });
        this[_a14] = true;
        this.provider = options.provider;
        this.modelId = options.modelId;
        this.maxEmbeddingsPerCall = options.maxEmbeddingsPerCall;
        this.values = options.values;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker14);
      }
    };
    name14 = "AI_TypeValidationError";
    marker15 = `vercel.ai.error.${name14}`;
    symbol15 = Symbol.for(marker15);
    TypeValidationError = class _TypeValidationError extends (_b15 = AISDKError, _a15 = symbol15, _b15) {
      static {
        __name(this, "_TypeValidationError");
      }
      constructor({
        value,
        cause,
        context
      }) {
        let contextPrefix = "Type validation failed";
        if (context == null ? void 0 : context.field) {
          contextPrefix += ` for ${context.field}`;
        }
        if ((context == null ? void 0 : context.entityName) || (context == null ? void 0 : context.entityId)) {
          contextPrefix += " (";
          const parts = [];
          if (context.entityName) {
            parts.push(context.entityName);
          }
          if (context.entityId) {
            parts.push(`id: "${context.entityId}"`);
          }
          contextPrefix += parts.join(", ");
          contextPrefix += ")";
        }
        super({
          name: name14,
          message: `${contextPrefix}: Value: ${JSON.stringify(value)}.
Error message: ${getErrorMessage(cause)}`,
          cause
        });
        this[_a15] = true;
        this.value = value;
        this.context = context;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker15);
      }
      /**
       * Wraps an error into a TypeValidationError.
       * If the cause is already a TypeValidationError with the same value and context, it returns the cause.
       * Otherwise, it creates a new TypeValidationError.
       *
       * @param {Object} params - The parameters for wrapping the error.
       * @param {unknown} params.value - The value that failed validation.
       * @param {unknown} params.cause - The original error or cause of the validation failure.
       * @param {TypeValidationContext} params.context - Optional context about what is being validated.
       * @returns {TypeValidationError} A TypeValidationError instance.
       */
      static wrap({
        value,
        cause,
        context
      }) {
        var _a173, _b173, _c;
        if (_TypeValidationError.isInstance(cause) && cause.value === value && ((_a173 = cause.context) == null ? void 0 : _a173.field) === (context == null ? void 0 : context.field) && ((_b173 = cause.context) == null ? void 0 : _b173.entityName) === (context == null ? void 0 : context.entityName) && ((_c = cause.context) == null ? void 0 : _c.entityId) === (context == null ? void 0 : context.entityId)) {
          return cause;
        }
        return new _TypeValidationError({ value, cause, context });
      }
    };
    name15 = "AI_UnsupportedFunctionalityError";
    marker16 = `vercel.ai.error.${name15}`;
    symbol16 = Symbol.for(marker16);
    UnsupportedFunctionalityError = class extends (_b16 = AISDKError, _a16 = symbol16, _b16) {
      static {
        __name(this, "UnsupportedFunctionalityError");
      }
      constructor({
        functionality,
        message = `'${functionality}' functionality not supported.`
      }) {
        super({ name: name15, message });
        this[_a16] = true;
        this.functionality = functionality;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker16);
      }
    };
  }
});

// node_modules/zod/v4/core/util.js
var util_exports = {};
__export(util_exports, {
  BIGINT_FORMAT_RANGES: () => BIGINT_FORMAT_RANGES,
  CONSTANT_CATCH: () => CONSTANT_CATCH,
  Class: () => Class,
  NUMBER_FORMAT_RANGES: () => NUMBER_FORMAT_RANGES,
  aborted: () => aborted,
  allowsEval: () => allowsEval,
  assert: () => assert,
  assertEqual: () => assertEqual,
  assertIs: () => assertIs,
  assertNever: () => assertNever,
  assertNotEqual: () => assertNotEqual,
  assignProp: () => assignProp,
  attachSchema: () => attachSchema,
  base64ToUint8Array: () => base64ToUint8Array,
  base64urlToUint8Array: () => base64urlToUint8Array,
  cached: () => cached,
  captureStackTrace: () => captureStackTrace,
  cleanEnum: () => cleanEnum,
  cleanRegex: () => cleanRegex,
  clone: () => clone,
  cloneDef: () => cloneDef,
  codePointLength: () => codePointLength,
  constantCatch: () => constantCatch,
  createTransparentProxy: () => createTransparentProxy,
  defineLazy: () => defineLazy,
  defineLazyInternal: () => defineLazyInternal,
  derived: () => derived,
  esc: () => esc,
  escapeRegex: () => escapeRegex,
  explicitlyAborted: () => explicitlyAborted,
  extend: () => extend,
  finalizeIssue: () => finalizeIssue,
  floatSafeRemainder: () => floatSafeRemainder,
  getElementAtPath: () => getElementAtPath,
  getEnumValues: () => getEnumValues,
  getLengthableOrigin: () => getLengthableOrigin,
  getParsedType: () => getParsedType,
  getSizableOrigin: () => getSizableOrigin,
  hexToUint8Array: () => hexToUint8Array,
  hide: () => hide,
  installLazyProp: () => installLazyProp,
  isObject: () => isObject,
  isPlainObject: () => isPlainObject,
  issue: () => issue,
  joinValues: () => joinValues,
  jsonStringifyReplacer: () => jsonStringifyReplacer,
  members: () => members,
  merge: () => merge,
  mergeDefs: () => mergeDefs,
  normalizeParams: () => normalizeParams,
  nullish: () => nullish,
  numKeys: () => numKeys,
  objectClone: () => objectClone,
  omit: () => omit,
  optionalKeys: () => optionalKeys,
  own: () => own,
  parsedType: () => parsedType,
  partial: () => partial,
  pick: () => pick,
  prefixIssues: () => prefixIssues,
  primitiveTypes: () => primitiveTypes,
  promiseAllObject: () => promiseAllObject,
  propertyKeyTypes: () => propertyKeyTypes,
  randomString: () => randomString,
  rawShape: () => rawShape,
  required: () => required,
  safeExtend: () => safeExtend,
  shallowClone: () => shallowClone,
  slugify: () => slugify,
  stringifyPrimitive: () => stringifyPrimitive,
  toZod: () => toZod,
  uint8ArrayToBase64: () => uint8ArrayToBase64,
  uint8ArrayToBase64url: () => uint8ArrayToBase64url,
  uint8ArrayToHex: () => uint8ArrayToHex,
  unwrapMessage: () => unwrapMessage
});
function assertEqual(val) {
  return val;
}
function assertNotEqual(val) {
  return val;
}
function toZod() {
  return (schema) => schema;
}
function assertIs(_arg) {
}
function assertNever(_x) {
  throw new Error("Unexpected value in exhaustive check");
}
function assert(_) {
}
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values;
}
function joinValues(array3, separator = "|") {
  return array3.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter) {
  return new Cached(getter);
}
function nullish(input) {
  return input === null || input === void 0;
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const ratio = val / step;
  const roundedRatio = Math.round(ratio);
  const tolerance2 = 4 * Number.EPSILON * Math.max(Math.abs(ratio), 1);
  if (Math.abs(ratio - roundedRatio) < tolerance2)
    return 0;
  return ratio - roundedRatio;
}
function defineLazy(object3, key, getter) {
  let value = void 0;
  Object.defineProperty(object3, key, {
    get() {
      if (value === EVALUATING) {
        return void 0;
      }
      if (value === void 0) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object3, key, {
        value: v
        // configurable: true,
      });
    },
    configurable: true
  });
}
function objectClone(obj) {
  return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function rawShape(def) {
  const desc = Object.getOwnPropertyDescriptor(def, "shape");
  return desc?.get ? desc.get.raw : desc?.value;
}
function sourceShape(schema) {
  return rawShape(schema._zod.def) ?? schema._zod.def.shape;
}
function deferProp(target, key, getter) {
  Object.defineProperty(target, key, {
    get() {
      const value = getter();
      assignProp(this, key, value);
      return value;
    },
    enumerable: true,
    configurable: true
  });
}
function putProp(target, key, value) {
  if (key in target)
    assignProp(target, key, value);
  else
    target[key] = value;
}
function mirrorShape(target, source, keys, wrap) {
  const raw = sourceShape(source);
  for (const key of keys) {
    const desc = Object.getOwnPropertyDescriptor(raw, key);
    if (!desc.enumerable)
      continue;
    if (desc.get) {
      deferProp(target, key, () => {
        const value = source._zod.def.shape[key];
        return wrap ? wrap(value, key) : value;
      });
    } else
      putProp(target, key, wrap ? wrap(desc.value, key) : desc.value);
  }
}
function mirrorProps(target, source) {
  for (const key of Reflect.ownKeys(source)) {
    const desc = Object.getOwnPropertyDescriptor(source, key);
    if (!desc.enumerable)
      continue;
    if (desc.get)
      deferProp(target, key, () => source[key]);
    else
      putProp(target, key, desc.value);
  }
}
function mergeDefs(...defs) {
  const mergedDescriptors = {};
  for (const def of defs) {
    const descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
function cloneDef(schema) {
  return mergeDefs(schema._zod.def);
}
function getElementAtPath(obj, path) {
  if (!path)
    return obj;
  return path.reduce((acc, key) => acc?.[key], obj);
}
function promiseAllObject(promisesObj) {
  const keys = Object.keys(promisesObj);
  const promises = keys.map((key) => promisesObj[key]);
  return Promise.all(promises).then((results) => {
    const resolvedObj = {};
    for (let i = 0; i < keys.length; i++) {
      resolvedObj[keys[i]] = results[i];
    }
    return resolvedObj;
  });
}
function randomString(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let str = "";
  for (let i = 0; i < length; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}
function esc(str) {
  return JSON.stringify(str);
}
function slugify(input) {
  return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === void 0)
    return true;
  if (typeof ctor !== "function")
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  if (o instanceof Map)
    return new Map(o);
  if (o instanceof Set)
    return new Set(o);
  return o;
}
function numKeys(data) {
  let keyCount = 0;
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      keyCount++;
    }
  }
  return keyCount;
}
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: /* @__PURE__ */ __name(() => params, "error") };
  if (params?.message !== void 0) {
    if (params?.error !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: /* @__PURE__ */ __name(() => params.error, "error") };
  return params;
}
function createTransparentProxy(getter) {
  let target;
  return new Proxy({}, {
    get(_, prop, receiver) {
      target ?? (target = getter());
      return Reflect.get(target, prop, receiver);
    },
    set(_, prop, value, receiver) {
      target ?? (target = getter());
      return Reflect.set(target, prop, value, receiver);
    },
    has(_, prop) {
      target ?? (target = getter());
      return Reflect.has(target, prop);
    },
    deleteProperty(_, prop) {
      target ?? (target = getter());
      return Reflect.deleteProperty(target, prop);
    },
    ownKeys(_) {
      target ?? (target = getter());
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(_, prop) {
      target ?? (target = getter());
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    defineProperty(_, prop, descriptor) {
      target ?? (target = getter());
      return Reflect.defineProperty(target, prop, descriptor);
    }
  });
}
function stringifyPrimitive(value) {
  if (typeof value === "bigint")
    return value.toString() + "n";
  if (typeof value === "string")
    return `"${value}"`;
  return `${value}`;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin !== void 0 && shape[k]._zod.optout === "optional";
  });
}
function pick(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".pick() cannot be used on object schemas containing refinements");
  }
  const newShape = {};
  mirrorShape(newShape, schema, maskedKeys(schema, mask));
  return clone(schema, mergeDefs(currDef, { shape: newShape, checks: [] }));
}
function maskedKeys(schema, mask) {
  const raw = sourceShape(schema);
  const keys = [];
  for (const key of Reflect.ownKeys(mask)) {
    if (!Object.getOwnPropertyDescriptor(raw, key)?.enumerable) {
      throw new Error(`Unrecognized key: "${String(key)}"`);
    }
    if (mask[key])
      keys.push(key);
  }
  return keys;
}
function omit(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".omit() cannot be used on object schemas containing refinements");
  }
  const omitted = new Set(maskedKeys(schema, mask));
  const newShape = {};
  mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)).filter((key) => !omitted.has(key)));
  return clone(schema, mergeDefs(currDef, { shape: newShape, checks: [] }));
}
function extend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to extend: expected a plain object");
  }
  const checks = schema._zod.def.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    const existingShape = sourceShape(schema);
    for (const key of Reflect.ownKeys(shape)) {
      if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) {
        throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
      }
    }
  }
  return clone(schema, mergeDefs(schema._zod.def, { shape: extended(schema, shape) }));
}
function extended(schema, shape) {
  const newShape = {};
  mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)));
  mirrorProps(newShape, shape);
  return newShape;
}
function safeExtend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to safeExtend: expected a plain object");
  }
  return clone(schema, mergeDefs(schema._zod.def, { shape: extended(schema, shape) }));
}
function merge(a, b) {
  if (!b?._zod?.def) {
    throw new Error("Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.");
  }
  if (a._zod.def.checks?.length) {
    throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
  }
  const newShape = {};
  mirrorShape(newShape, a, Reflect.ownKeys(sourceShape(a)));
  mirrorShape(newShape, b, Reflect.ownKeys(sourceShape(b)));
  const def = mergeDefs(a._zod.def, {
    shape: newShape,
    get catchall() {
      return b._zod.def.catchall;
    },
    checks: b._zod.def.checks ?? []
  });
  return clone(a, def);
}
function partial(Class2, schema, mask, name25 = "partial") {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(`.${name25}() cannot be used on object schemas containing refinements`);
  }
  const selected = mask ? new Set(maskedKeys(schema, mask)) : void 0;
  const newShape = {};
  mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)), Class2 && ((value, key) => selected && !selected.has(key) ? value : new Class2({ type: "optional", innerType: value })));
  return clone(schema, mergeDefs(schema._zod.def, { shape: newShape, checks: [] }));
}
function required(Class2, schema, mask) {
  const selected = mask ? new Set(maskedKeys(schema, mask)) : void 0;
  const newShape = {};
  mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)), (value, key) => (
    // overwrite with non-optional
    selected && !selected.has(key) ? value : new Class2({ type: "nonoptional", innerType: value })
  ));
  return clone(schema, mergeDefs(schema._zod.def, { shape: newShape }));
}
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function explicitlyAborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue === false) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a25;
    (_a25 = iss).path ?? (_a25.path = []);
    iss.path.unshift(path);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function attachSchema(issues, start, inst) {
  var _a25;
  for (let i = start; i < issues.length; i++) {
    (_a25 = issues[i]).schema ?? (_a25.schema = inst);
  }
}
function finalizeIssue(iss, ctx, config2) {
  var _a25;
  const traits = iss.inst?._zod?.traits;
  if (traits?.has("$ZodType")) {
    if (traits.has("$ZodCheck"))
      (_a25 = iss).schema ?? (_a25.schema = iss.inst);
    else
      iss.schema = iss.inst;
  }
  const schemaError = iss.schema !== iss.inst ? iss.schema?._zod.def?.error : void 0;
  const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(schemaError?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
  const full = {};
  for (const k of Object.keys(iss)) {
    if (k === "inst" || k === "schema" || k === "continue" || k === "input" || k === "__proto__")
      continue;
    full[k] = iss[k];
  }
  full.path ?? (full.path = []);
  full.message = message;
  if (ctx?.reportInput) {
    full.input = iss.input;
  }
  return full;
}
function getSizableOrigin(input) {
  if (input instanceof Set)
    return "set";
  if (input instanceof Map)
    return "map";
  if (input instanceof File)
    return "file";
  return "unknown";
}
function codePointLength(str) {
  const units = str.length;
  if (!highSurrogate.test(str))
    return units;
  let count = units;
  for (let i = 0; i < units - 1; i++) {
    if ((str.charCodeAt(i) & 64512) === 55296 && (str.charCodeAt(i + 1) & 64512) === 56320) {
      count--;
      i++;
    }
  }
  return count;
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function parsedType(data) {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "nan" : "number";
    }
    case "object": {
      if (data === null) {
        return "null";
      }
      if (Array.isArray(data)) {
        return "array";
      }
      const obj = data;
      if (obj && Object.getPrototypeOf(obj) !== Object.prototype && "constructor" in obj && obj.constructor) {
        return obj.constructor.name;
      }
    }
  }
  return t;
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}
function cleanEnum(obj) {
  return Object.entries(obj).filter(([k, _]) => {
    return Number.isNaN(Number.parseInt(k, 10));
  }).map((el) => el[1]);
}
function base64ToUint8Array(base642) {
  const binaryString = atob(base642);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
function uint8ArrayToBase64(bytes) {
  let binaryString = "";
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}
function base64urlToUint8Array(base64url2) {
  const base642 = base64url2.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - base642.length % 4) % 4);
  return base64ToUint8Array(base642 + padding);
}
function uint8ArrayToBase64url(bytes) {
  return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function hexToUint8Array(hex) {
  const cleanHex = hex.replace(/^0x/, "");
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}
function uint8ArrayToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function members(proto, table) {
  for (const key in table) {
    const desc = Object.getOwnPropertyDescriptor(table, key);
    if (desc.get)
      Object.defineProperty(proto, key, { ...desc, enumerable: false });
    else
      defineBound(proto, key, desc.value);
  }
}
function own(inst, key, value, enumerable = true) {
  Object.defineProperty(inst, key, { configurable: true, writable: true, enumerable, value });
  return value;
}
function hide(inst, key, value) {
  return own(inst, key, value, false);
}
// @__NO_SIDE_EFFECTS__
function derived(computes, table) {
  for (const key in computes) {
    const compute = computes[key];
    Object.defineProperty(table, key, {
      configurable: true,
      enumerable: true,
      get() {
        return own(this, key, compute(this));
      },
      set(value) {
        own(this, key, value);
      }
    });
  }
  return table;
}
function defineBound(proto, key, fn) {
  Object.defineProperty(proto, key, {
    configurable: true,
    get() {
      return this == null ? fn : own(this, key, fn.bind(this));
    },
    set(value) {
      own(this, key, value);
    }
  });
}
function claim(inst, sentinel) {
  const proto = Object.getPrototypeOf(inst);
  return sentinel in proto ? void 0 : proto;
}
function defineLazyInternal(inst, key, compute) {
  const proto = Object.getPrototypeOf(inst._zod);
  if (key in proto && installing !== inst._zod) {
    installing = void 0;
    return;
  }
  installing = inst._zod;
  Object.defineProperty(proto, key, {
    configurable: true,
    get() {
      Object.defineProperty(this, key, breaker);
      const outer = broke;
      broke = false;
      try {
        const value = compute(this);
        if (broke)
          delete this[key];
        else
          Object.defineProperty(this, key, { configurable: true, writable: true, value });
        broke = broke || outer;
        return value;
      } catch (err) {
        delete this[key];
        broke = broke || outer;
        throw err;
      }
    },
    set(value) {
      Object.defineProperty(this, key, { configurable: true, writable: true, value });
    }
  });
}
function installLazyProp(inst, key, make, enumerable) {
  const proto = claim(inst, key);
  if (!proto)
    return;
  Object.defineProperty(proto, key, {
    configurable: true,
    get() {
      const desc = { configurable: true, writable: true, enumerable, value: void 0 };
      Object.defineProperty(this, key, desc);
      desc.value = make(this);
      Object.defineProperty(this, key, desc);
      return desc.value;
    },
    set(value) {
      Object.defineProperty(this, key, { configurable: true, writable: true, enumerable, value });
    }
  });
}
function constantCatch(value) {
  const fn = /* @__PURE__ */ __name(() => value, "fn");
  fn[CONSTANT_CATCH] = true;
  return fn;
}
var Cached, EVALUATING, captureStackTrace, allowsEval, getParsedType, propertyKeyTypes, primitiveTypes, NUMBER_FORMAT_RANGES, BIGINT_FORMAT_RANGES, highSurrogate, Class, installing, broke, breaker, CONSTANT_CATCH;
var init_util = __esm({
  "node_modules/zod/v4/core/util.js"() {
    init_core();
    __name(assertEqual, "assertEqual");
    __name(assertNotEqual, "assertNotEqual");
    __name(toZod, "toZod");
    __name(assertIs, "assertIs");
    __name(assertNever, "assertNever");
    __name(assert, "assert");
    __name(getEnumValues, "getEnumValues");
    __name(joinValues, "joinValues");
    __name(jsonStringifyReplacer, "jsonStringifyReplacer");
    Cached = class {
      static {
        __name(this, "Cached");
      }
      constructor(getter) {
        this._getter = getter;
        this._value = void 0;
      }
      get value() {
        const getter = this._getter;
        if (getter !== void 0) {
          this._value = getter();
          this._getter = void 0;
        }
        return this._value;
      }
    };
    __name(cached, "cached");
    __name(nullish, "nullish");
    __name(cleanRegex, "cleanRegex");
    __name(floatSafeRemainder, "floatSafeRemainder");
    EVALUATING = /* @__PURE__ */ Symbol("evaluating");
    __name(defineLazy, "defineLazy");
    __name(objectClone, "objectClone");
    __name(assignProp, "assignProp");
    __name(rawShape, "rawShape");
    __name(sourceShape, "sourceShape");
    __name(deferProp, "deferProp");
    __name(putProp, "putProp");
    __name(mirrorShape, "mirrorShape");
    __name(mirrorProps, "mirrorProps");
    __name(mergeDefs, "mergeDefs");
    __name(cloneDef, "cloneDef");
    __name(getElementAtPath, "getElementAtPath");
    __name(promiseAllObject, "promiseAllObject");
    __name(randomString, "randomString");
    __name(esc, "esc");
    __name(slugify, "slugify");
    captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
    };
    __name(isObject, "isObject");
    allowsEval = /* @__PURE__ */ cached(() => {
      if (globalConfig.jitless) {
        return false;
      }
      if (typeof navigator !== "undefined" && "Cloudflare-Workers"?.includes("Cloudflare")) {
        return false;
      }
      try {
        const F = Function;
        new F("");
        return true;
      } catch (_) {
        return false;
      }
    });
    __name(isPlainObject, "isPlainObject");
    __name(shallowClone, "shallowClone");
    __name(numKeys, "numKeys");
    getParsedType = /* @__PURE__ */ __name((data) => {
      const t = typeof data;
      switch (t) {
        case "undefined":
          return "undefined";
        case "string":
          return "string";
        case "number":
          return Number.isNaN(data) ? "nan" : "number";
        case "boolean":
          return "boolean";
        case "function":
          return "function";
        case "bigint":
          return "bigint";
        case "symbol":
          return "symbol";
        case "object":
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
            return "promise";
          }
          if (typeof Map !== "undefined" && data instanceof Map) {
            return "map";
          }
          if (typeof Set !== "undefined" && data instanceof Set) {
            return "set";
          }
          if (typeof Date !== "undefined" && data instanceof Date) {
            return "date";
          }
          if (typeof File !== "undefined" && data instanceof File) {
            return "file";
          }
          return "object";
        default:
          throw new Error(`Unknown data type: ${t}`);
      }
    }, "getParsedType");
    propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
    primitiveTypes = /* @__PURE__ */ new Set([
      "string",
      "number",
      "bigint",
      "boolean",
      "symbol",
      "undefined"
    ]);
    __name(escapeRegex, "escapeRegex");
    __name(clone, "clone");
    __name(normalizeParams, "normalizeParams");
    __name(createTransparentProxy, "createTransparentProxy");
    __name(stringifyPrimitive, "stringifyPrimitive");
    __name(optionalKeys, "optionalKeys");
    NUMBER_FORMAT_RANGES = /* @__PURE__ */ (() => ({
      safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
      int32: [-2147483648, 2147483647],
      uint32: [0, 4294967295],
      float32: [-34028234663852886e22, 34028234663852886e22],
      float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
    }))();
    BIGINT_FORMAT_RANGES = {
      int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
      uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
    };
    __name(pick, "pick");
    __name(maskedKeys, "maskedKeys");
    __name(omit, "omit");
    __name(extend, "extend");
    __name(extended, "extended");
    __name(safeExtend, "safeExtend");
    __name(merge, "merge");
    __name(partial, "partial");
    __name(required, "required");
    __name(aborted, "aborted");
    __name(explicitlyAborted, "explicitlyAborted");
    __name(prefixIssues, "prefixIssues");
    __name(unwrapMessage, "unwrapMessage");
    __name(attachSchema, "attachSchema");
    __name(finalizeIssue, "finalizeIssue");
    __name(getSizableOrigin, "getSizableOrigin");
    highSurrogate = /[\uD800-\uDBFF]/;
    __name(codePointLength, "codePointLength");
    __name(getLengthableOrigin, "getLengthableOrigin");
    __name(parsedType, "parsedType");
    __name(issue, "issue");
    __name(cleanEnum, "cleanEnum");
    __name(base64ToUint8Array, "base64ToUint8Array");
    __name(uint8ArrayToBase64, "uint8ArrayToBase64");
    __name(base64urlToUint8Array, "base64urlToUint8Array");
    __name(uint8ArrayToBase64url, "uint8ArrayToBase64url");
    __name(hexToUint8Array, "hexToUint8Array");
    __name(uint8ArrayToHex, "uint8ArrayToHex");
    Class = class {
      static {
        __name(this, "Class");
      }
      constructor(..._args) {
      }
    };
    __name(members, "members");
    __name(own, "own");
    __name(hide, "hide");
    __name(derived, "derived");
    __name(defineBound, "defineBound");
    __name(claim, "claim");
    broke = false;
    breaker = {
      configurable: true,
      get() {
        broke = true;
        return void 0;
      }
    };
    __name(defineLazyInternal, "defineLazyInternal");
    __name(installLazyProp, "installLazyProp");
    CONSTANT_CATCH = "~constantCatch";
    __name(constantCatch, "constantCatch");
  }
});

// node_modules/zod/v4/core/core.js
function newError(Definition) {
  const E = _E;
  if (E) {
    const saved = E.stackTraceLimit;
    if (typeof saved === "number") {
      try {
        E.stackTraceLimit = 0;
      } catch {
        _E = null;
        return new Definition();
      }
      try {
        return new Definition();
      } finally {
        E.stackTraceLimit = saved;
      }
    }
  }
  return new Definition();
}
// @__NO_SIDE_EFFECTS__
function $constructor(name25, initializer3, proto, params) {
  const zodProto = {};
  function Internals(def) {
    this.def = def;
    this.constr = _;
    this.traits = /* @__PURE__ */ new Set();
  }
  __name(Internals, "Internals");
  Internals.prototype = zodProto;
  const protoMembers = proto;
  const initialized = protoMembers && /* @__PURE__ */ new WeakSet();
  function init(inst, def) {
    if (!inst._zod) {
      _zodDesc.value = new Internals(def);
      try {
        Object.defineProperty(inst, "_zod", _zodDesc);
      } finally {
        _zodDesc.value = void 0;
      }
    } else if (inst._zod.traits.has(name25)) {
      return;
    }
    inst._zod.traits.add(name25);
    initializer3(inst, def);
    if (initialized) {
      const own2 = Object.getPrototypeOf(inst);
      const ctorProto = inst._zod.constr.prototype;
      let up = own2;
      while (up && up !== ctorProto)
        up = Object.getPrototypeOf(up);
      const target = up ?? own2;
      if (!initialized.has(target)) {
        initialized.add(target);
        members(target, protoMembers);
      }
    }
    const proto2 = _.prototype;
    for (const k in proto2) {
      if (!Object.prototype.hasOwnProperty.call(proto2, k))
        continue;
      if (!(k in inst)) {
        inst[k] = proto2[k].bind(inst);
      }
    }
  }
  __name(init, "init");
  const Parent = params?.Parent ?? Object;
  class Definition extends Parent {
    static {
      __name(this, "Definition");
    }
  }
  Object.defineProperty(Definition, "name", { value: name25 });
  function _(def) {
    const inst = params?.Parent ? newError(Definition) : this;
    init(inst, def);
    const deferred = inst._zod.deferred;
    if (deferred) {
      for (const fn of deferred) {
        fn();
      }
      inst._zod.deferred = void 0;
    }
    const pp = globalThis.__zod_globalConfig?.postProcessor;
    if (pp)
      pp(inst);
    return inst;
  }
  __name(_, "_");
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: /* @__PURE__ */ __name((inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name25);
    }, "value")
  });
  Object.defineProperty(_, "name", { value: name25 });
  return _;
}
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}
var _a17, _zodDesc, _E, $ZodAsyncError, $ZodEncodeError, globalConfig;
var init_core = __esm({
  "node_modules/zod/v4/core/core.js"() {
    init_util();
    _zodDesc = { value: void 0, enumerable: false };
    _E = "captureStackTrace" in Error ? Error : null;
    __name(newError, "newError");
    __name($constructor, "$constructor");
    $ZodAsyncError = class extends Error {
      static {
        __name(this, "$ZodAsyncError");
      }
      constructor() {
        super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
      }
    };
    $ZodEncodeError = class extends Error {
      static {
        __name(this, "$ZodEncodeError");
      }
      constructor(name25) {
        super(`Encountered unidirectional transform during encode: ${name25}`);
        this.name = "ZodEncodeError";
      }
    };
    (_a17 = globalThis).__zod_globalConfig ?? (_a17.__zod_globalConfig = {});
    globalConfig = globalThis.__zod_globalConfig;
    __name(config, "config");
  }
});

// node_modules/zod/v4/core/errors.js
function _getMessage() {
  const internals = this._zod;
  internals.message ?? (internals.message = JSON.stringify(internals.def, jsonStringifyReplacer, 2));
  return internals.message;
}
function _setMessage(value) {
  this._zod.message = value;
}
function node(obj, key, make) {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) {
    if (key === "__proto__") {
      Object.defineProperty(obj, key, { value: make(), writable: true, enumerable: true, configurable: true });
    } else {
      obj[key] = make();
    }
  }
  return obj[key];
}
function flattenError(error2, mapper = (issue2) => issue2.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error2.issues) {
    if (sub.path.length > 0) {
      node(fieldErrors, sub.path[0], () => []).push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error2, mapper = (issue2) => issue2.message) {
  const fieldErrors = { _errors: [] };
  const processError = /* @__PURE__ */ __name((error3, path = []) => {
    for (const issue2 of error3.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }, [...path, ...issue2.path]));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues }, [...path, ...issue2.path]);
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues }, [...path, ...issue2.path]);
      } else {
        const fullpath = [...path, ...issue2.path];
        if (fullpath.length === 0) {
          fieldErrors._errors.push(mapper(issue2));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < fullpath.length) {
            const el = fullpath[i];
            const terminal = i === fullpath.length - 1;
            if (el === "_errors") {
              if (terminal)
                curr._errors.push(mapper(issue2));
              i++;
              continue;
            }
            if (!Object.prototype.hasOwnProperty.call(curr, el)) {
              Object.defineProperty(curr, el, {
                value: { _errors: [] },
                enumerable: true,
                writable: true,
                configurable: true
              });
            }
            const node2 = curr[el];
            if (terminal) {
              node2._errors.push(mapper(issue2));
            }
            curr = node2;
            i++;
          }
        }
      }
    }
  }, "processError");
  processError(error2);
  return fieldErrors;
}
var _messageDesc, _issuesDesc, _installedToString, initializer, $ZodError, $ZodRealError;
var init_errors = __esm({
  "node_modules/zod/v4/core/errors.js"() {
    init_core();
    init_util();
    __name(_getMessage, "_getMessage");
    __name(_setMessage, "_setMessage");
    _messageDesc = {
      get: _getMessage,
      set: _setMessage,
      enumerable: true,
      configurable: true
    };
    _issuesDesc = { value: void 0, enumerable: false };
    _installedToString = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
    initializer = /* @__PURE__ */ __name((inst, def) => {
      inst.name = "$ZodError";
      _issuesDesc.value = def;
      Object.defineProperty(inst, "issues", _issuesDesc);
      _issuesDesc.value = void 0;
      Object.defineProperty(inst, "message", _messageDesc);
      const proto = Object.getPrototypeOf(inst);
      if (!_installedToString.has(proto)) {
        _installedToString.add(proto);
        Object.defineProperty(proto, "toString", {
          configurable: true,
          enumerable: false,
          get() {
            const value = /* @__PURE__ */ __name(() => this.message, "value");
            Object.defineProperty(this, "toString", { value, configurable: true, writable: true });
            return value;
          },
          set(value) {
            Object.defineProperty(this, "toString", { value, configurable: true, writable: true });
          }
        });
      }
    }, "initializer");
    $ZodError = $constructor("$ZodError", initializer);
    $ZodRealError = $constructor("$ZodError", initializer, void 0, {
      Parent: Error
    });
    __name(node, "node");
    __name(flattenError, "flattenError");
    __name(formatError, "formatError");
  }
});

// node_modules/zod/v4/core/parse.js
function finalizeParams(callee, params) {
  return { callee: params?.callee ?? callee, Err: params?.Err };
}
function failure(Err, issues, ctx) {
  let error2;
  return {
    success: false,
    get error() {
      if (!error2) {
        error2 = new Err(issues.map((iss) => finalizeIssue(iss, ctx, config())));
        issues = void 0;
        ctx = void 0;
      }
      return error2;
    },
    set error(e) {
      error2 = e;
      issues = void 0;
      ctx = void 0;
    }
  };
}
function validateFallback(schema, value, _ctx) {
  const ctx = _ctx ? { ..._ctx, async: false, abortEarly: true } : { async: false, abortEarly: true };
  const fallbackRun = schema._zod.bag.fallbackRun;
  let result;
  if (fallbackRun) {
    ctx[COMPILE_FALLBACK] = true;
    result = fallbackRun({ value, issues: [] }, ctx);
  } else {
    result = schema._zod.run({ value, issues: [] }, ctx);
  }
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  return result.issues.length === 0;
}
var _parse, _parseAsync, _safeParse, _safeParseAsync, COMPILE_INVALID, COMPILE_FALLBACK, validate, validateAsync, _encode, _decode, _encodeAsync, _decodeAsync, _safeEncode, _safeDecode, _safeEncodeAsync, _safeDecodeAsync;
var init_parse = __esm({
  "node_modules/zod/v4/core/parse.js"() {
    init_core();
    init_util();
    __name(finalizeParams, "finalizeParams");
    _parse = /* @__PURE__ */ __name((_Err) => {
      const fn = /* @__PURE__ */ __name((schema, value, _ctx, _params) => {
        const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
        const result = schema._zod.run({ value, issues: [] }, ctx);
        if (result instanceof Promise) {
          throw new $ZodAsyncError();
        }
        if (result.issues.length) {
          const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
          captureStackTrace(e, _params?.callee ?? fn);
          throw e;
        }
        return result.value;
      }, "fn");
      return fn;
    }, "_parse");
    _parseAsync = /* @__PURE__ */ __name((_Err) => {
      const fn = /* @__PURE__ */ __name(async (schema, value, _ctx, params) => {
        const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
        let result = schema._zod.run({ value, issues: [] }, ctx);
        if (result instanceof Promise)
          result = await result;
        if (result.issues.length) {
          const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
          captureStackTrace(e, params?.callee ?? fn);
          throw e;
        }
        return result.value;
      }, "fn");
      return fn;
    }, "_parseAsync");
    _safeParse = /* @__PURE__ */ __name((_Err) => (schema, value, _ctx) => {
      const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
      const result = schema._zod.run({ value, issues: [] }, ctx);
      if (result instanceof Promise) {
        throw new $ZodAsyncError();
      }
      return result.issues.length ? failure(_Err, result.issues, ctx) : { success: true, data: result.value };
    }, "_safeParse");
    __name(failure, "failure");
    _safeParseAsync = /* @__PURE__ */ __name((_Err) => async (schema, value, _ctx) => {
      const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
      let result = schema._zod.run({ value, issues: [] }, ctx);
      if (result instanceof Promise)
        result = await result;
      return result.issues.length ? failure(_Err, result.issues, ctx) : { success: true, data: result.value };
    }, "_safeParseAsync");
    COMPILE_INVALID = /* @__PURE__ */ Symbol.for("zod.compile.invalid");
    COMPILE_FALLBACK = /* @__PURE__ */ Symbol.for("zod.compile.fallback");
    validate = /* @__PURE__ */ __name(((schema, value, _ctx) => {
      const validator = schema._zod.bag.validator;
      if (validator !== void 0) {
        if (validator(value) !== COMPILE_INVALID)
          return true;
        if (validator.definite === true && _ctx === void 0)
          return false;
      }
      return validateFallback(schema, value, _ctx);
    }), "validate");
    __name(validateFallback, "validateFallback");
    validateAsync = /* @__PURE__ */ __name(async (schema, value, _ctx) => {
      const ctx = _ctx ? { ..._ctx, async: true, abortEarly: true } : { async: true, abortEarly: true };
      let result = schema._zod.run({ value, issues: [] }, ctx);
      if (result instanceof Promise)
        result = await result;
      return result.issues.length === 0;
    }, "validateAsync");
    _encode = /* @__PURE__ */ __name((_Err) => {
      const parse2 = _parse(_Err);
      const fn = /* @__PURE__ */ __name((schema, value, _ctx, _params) => {
        const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
        return parse2(schema, value, ctx, finalizeParams(fn, _params));
      }, "fn");
      return fn;
    }, "_encode");
    _decode = /* @__PURE__ */ __name((_Err) => {
      const parse2 = _parse(_Err);
      const fn = /* @__PURE__ */ __name((schema, value, _ctx, _params) => {
        return parse2(schema, value, _ctx, finalizeParams(fn, _params));
      }, "fn");
      return fn;
    }, "_decode");
    _encodeAsync = /* @__PURE__ */ __name((_Err) => {
      const parseAsync2 = _parseAsync(_Err);
      const fn = /* @__PURE__ */ __name(async (schema, value, _ctx, _params) => {
        const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
        return await parseAsync2(schema, value, ctx, finalizeParams(fn, _params));
      }, "fn");
      return fn;
    }, "_encodeAsync");
    _decodeAsync = /* @__PURE__ */ __name((_Err) => {
      const parseAsync2 = _parseAsync(_Err);
      const fn = /* @__PURE__ */ __name(async (schema, value, _ctx, _params) => {
        return await parseAsync2(schema, value, _ctx, finalizeParams(fn, _params));
      }, "fn");
      return fn;
    }, "_decodeAsync");
    _safeEncode = /* @__PURE__ */ __name((_Err) => (schema, value, _ctx) => {
      const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
      return _safeParse(_Err)(schema, value, ctx);
    }, "_safeEncode");
    _safeDecode = /* @__PURE__ */ __name((_Err) => (schema, value, _ctx) => {
      return _safeParse(_Err)(schema, value, _ctx);
    }, "_safeDecode");
    _safeEncodeAsync = /* @__PURE__ */ __name((_Err) => async (schema, value, _ctx) => {
      const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
      return _safeParseAsync(_Err)(schema, value, ctx);
    }, "_safeEncodeAsync");
    _safeDecodeAsync = /* @__PURE__ */ __name((_Err) => async (schema, value, _ctx) => {
      return _safeParseAsync(_Err)(schema, value, _ctx);
    }, "_safeDecodeAsync");
  }
});

// node_modules/zod/v4/core/regexes.js
function nanoidOfLength(length) {
  return new RegExp(`^[a-zA-Z0-9_-]{${length}}$`);
}
function emoji() {
  return new RegExp(_emoji, "u");
}
function anchor(source) {
  return new RegExp(`^${source}$`);
}
function timeSource(args) {
  const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : args.seconds ? `${hhmm}:[0-5]\\d(?:\\.\\d+)?` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return regex;
}
function time(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
function datetime(args) {
  const opts = ["Z"];
  if (args.offset)
    opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
  const qualified = `${timeSource({ precision: args.precision, seconds: true })}(?:${opts.join("|")})`;
  const timeRegex = args.local ? `${qualified}|${timeSource({ precision: args.precision })}` : qualified;
  return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
var cuid, cuid2, ulid, xid, ksuid, nanoid, duration, guid, uuid, email, _emoji, ipv4, ipv6, cidrv4, cidrv6, base64, base64url, httpProtocol, e164, dateSource, date, anyString, integer, number, boolean, _null, lowercase, uppercase;
var init_regexes = __esm({
  "node_modules/zod/v4/core/regexes.js"() {
    cuid = /^[cC][0-9a-z]{6,}$/;
    cuid2 = /^[0-9a-z]+$/;
    ulid = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/;
    xid = /^[0-9a-vA-V]{20}$/;
    ksuid = /^[A-Za-z0-9]{27}$/;
    nanoid = /^[a-zA-Z0-9_-]{21}$/;
    __name(nanoidOfLength, "nanoidOfLength");
    duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
    guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
    uuid = /* @__PURE__ */ __name((version2) => {
      if (!version2)
        return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
      return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version2}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
    }, "uuid");
    email = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
    _emoji = `^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$`;
    __name(emoji, "emoji");
    ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
    ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
    cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
    cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
    base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
    base64url = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/;
    httpProtocol = /^https?$/;
    e164 = /^\+[1-9]\d{6,14}$/;
    dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
    __name(anchor, "anchor");
    date = /* @__PURE__ */ anchor(dateSource);
    __name(timeSource, "timeSource");
    __name(time, "time");
    __name(datetime, "datetime");
    anyString = /^[\s\S]{0,}$/;
    integer = /^-?\d+$/;
    number = /^-?\d+(?:\.\d+)?$/;
    boolean = /^(?:true|false)$/i;
    _null = /^null$/i;
    lowercase = /^[^A-Z]*$/;
    uppercase = /^[^a-z]*$/;
  }
});

// node_modules/zod/v4/core/checks.js
function handleCheckPropertyResult(result, payload, property) {
  if (result.issues.length) {
    payload.issues.push(...prefixIssues(property, result.issues));
  }
}
var $ZodCheck, _whenHasLength, numericOriginMap, $ZodCheckLessThan, $ZodCheckGreaterThan, $ZodCheckMultipleOf, $ZodCheckNumberFormat, $ZodCheckMaxLength, $ZodCheckMinLength, $ZodCheckLengthEquals, $ZodCheckStringFormat, $ZodCheckRegex, $ZodCheckLowerCase, $ZodCheckUpperCase, $ZodCheckIncludes, $ZodCheckStartsWith, $ZodCheckEndsWith, $ZodCheckProperties, $ZodCheckOverwrite;
var init_checks = __esm({
  "node_modules/zod/v4/core/checks.js"() {
    init_core();
    init_regexes();
    init_util();
    $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
      var _a25;
      inst._zod ?? (inst._zod = {});
      inst._zod.def = def;
      (_a25 = inst._zod).onattach ?? (_a25.onattach = []);
    });
    _whenHasLength = /* @__PURE__ */ __name((payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== void 0;
    }, "_whenHasLength");
    numericOriginMap = {
      number: "number",
      bigint: "bigint",
      object: "date"
    };
    $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
      $ZodCheck.init(inst, def);
      const origin = numericOriginMap[typeof def.value];
      inst._zod.check = (payload) => {
        if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
          return;
        }
        payload.issues.push({
          origin: numericOriginMap[typeof payload.value] ?? origin,
          code: "too_big",
          maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
          input: payload.value,
          inclusive: def.inclusive,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
      $ZodCheck.init(inst, def);
      const origin = numericOriginMap[typeof def.value];
      inst._zod.check = (payload) => {
        if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
          return;
        }
        payload.issues.push({
          origin: numericOriginMap[typeof payload.value] ?? origin,
          code: "too_small",
          minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
          input: payload.value,
          inclusive: def.inclusive,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
      $ZodCheck.init(inst, def);
      inst._zod.check = (payload) => {
        if (typeof payload.value !== typeof def.value)
          throw new Error("Cannot mix number and bigint in multiple_of check.");
        const isMultiple = typeof payload.value === "bigint" ? (
          // `value % 0n` throws, and nothing is a multiple of zero — the number branch already fails this way via NaN
          def.value !== BigInt(0) && payload.value % def.value === BigInt(0)
        ) : floatSafeRemainder(payload.value, def.value) === 0;
        if (isMultiple)
          return;
        payload.issues.push({
          origin: typeof payload.value,
          code: "not_multiple_of",
          divisor: def.value,
          input: payload.value,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
      $ZodCheck.init(inst, def);
      def.format = def.format || "float64";
      const isInt = def.format?.includes("int");
      const origin = isInt ? "int" : "number";
      const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
      inst._zod.check = (payload) => {
        const input = payload.value;
        if (isInt) {
          if (!Number.isInteger(input)) {
            payload.issues.push({
              expected: origin,
              format: def.format,
              code: "invalid_type",
              continue: false,
              input,
              inst
            });
            return;
          }
          if (!Number.isSafeInteger(input)) {
            if (input > 0) {
              payload.issues.push({
                input,
                code: "too_big",
                maximum: Number.MAX_SAFE_INTEGER,
                note: "Integers must be within the safe integer range.",
                inst,
                origin,
                inclusive: true,
                continue: !def.abort
              });
            } else {
              payload.issues.push({
                input,
                code: "too_small",
                minimum: Number.MIN_SAFE_INTEGER,
                note: "Integers must be within the safe integer range.",
                inst,
                origin,
                inclusive: true,
                continue: !def.abort
              });
            }
            return;
          }
        }
        if (input < minimum) {
          payload.issues.push({
            origin: "number",
            input,
            code: "too_small",
            minimum,
            inclusive: true,
            inst,
            continue: !def.abort
          });
        }
        if (input > maximum) {
          payload.issues.push({
            origin: "number",
            input,
            code: "too_big",
            maximum,
            inclusive: true,
            inst,
            continue: !def.abort
          });
        }
      };
    });
    $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
      var _a25;
      $ZodCheck.init(inst, def);
      (_a25 = inst._zod.def).when ?? (_a25.when = _whenHasLength);
      inst._zod.check = (payload) => {
        const input = payload.value;
        const units = input.length;
        const length = typeof input === "string" && units > def.maximum ? codePointLength(input) : units;
        if (length <= def.maximum)
          return;
        const origin = getLengthableOrigin(input);
        payload.issues.push({
          origin,
          code: "too_big",
          maximum: def.maximum,
          inclusive: true,
          input,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
      var _a25;
      $ZodCheck.init(inst, def);
      (_a25 = inst._zod.def).when ?? (_a25.when = _whenHasLength);
      inst._zod.check = (payload) => {
        const input = payload.value;
        const units = input.length;
        const length = typeof input === "string" && units >= def.minimum && units < def.minimum * 2 ? codePointLength(input) : units;
        if (length >= def.minimum)
          return;
        const origin = getLengthableOrigin(input);
        payload.issues.push({
          origin,
          code: "too_small",
          minimum: def.minimum,
          inclusive: true,
          input,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
      var _a25;
      $ZodCheck.init(inst, def);
      (_a25 = inst._zod.def).when ?? (_a25.when = _whenHasLength);
      inst._zod.check = (payload) => {
        const input = payload.value;
        const units = input.length;
        const length = typeof input === "string" && units >= def.length && units <= def.length * 2 ? codePointLength(input) : units;
        if (length === def.length)
          return;
        const origin = getLengthableOrigin(input);
        const tooBig = length > def.length;
        payload.issues.push({
          origin,
          ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
          inclusive: true,
          exact: true,
          input: payload.value,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
      var _a25, _b25;
      $ZodCheck.init(inst, def);
      if (def.pattern)
        (_a25 = inst._zod).check ?? (_a25.check = (payload) => {
          def.pattern.lastIndex = 0;
          if (def.pattern.test(payload.value))
            return;
          payload.issues.push({
            origin: "string",
            code: "invalid_format",
            format: def.format,
            input: payload.value,
            ...def.pattern ? { pattern: def.pattern.toString() } : {},
            inst,
            continue: !def.abort
          });
        });
      else
        (_b25 = inst._zod).check ?? (_b25.check = () => {
        });
    });
    $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
      $ZodCheckStringFormat.init(inst, def);
      inst._zod.check = (payload) => {
        def.pattern.lastIndex = 0;
        if (def.pattern.test(payload.value))
          return;
        payload.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "regex",
          input: payload.value,
          pattern: def.pattern.toString(),
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
      def.pattern ?? (def.pattern = lowercase);
      $ZodCheckStringFormat.init(inst, def);
    });
    $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
      def.pattern ?? (def.pattern = uppercase);
      $ZodCheckStringFormat.init(inst, def);
    });
    $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
      $ZodCheck.init(inst, def);
      const escapedRegex = escapeRegex(def.includes);
      const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position},}${escapedRegex}` : escapedRegex);
      def.pattern = pattern;
      inst._zod.check = (payload) => {
        if (payload.value.includes(def.includes, def.position))
          return;
        payload.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "includes",
          includes: def.includes,
          input: payload.value,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
      $ZodCheck.init(inst, def);
      const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
      def.pattern ?? (def.pattern = pattern);
      inst._zod.check = (payload) => {
        if (payload.value.startsWith(def.prefix))
          return;
        payload.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "starts_with",
          prefix: def.prefix,
          input: payload.value,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
      $ZodCheck.init(inst, def);
      const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
      def.pattern ?? (def.pattern = pattern);
      inst._zod.check = (payload) => {
        if (payload.value.endsWith(def.suffix))
          return;
        payload.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "ends_with",
          suffix: def.suffix,
          input: payload.value,
          inst,
          continue: !def.abort
        });
      };
    });
    __name(handleCheckPropertyResult, "handleCheckPropertyResult");
    $ZodCheckProperties = /* @__PURE__ */ $constructor("$ZodCheckProperties", (inst, def) => {
      $ZodCheck.init(inst, def);
      hide(inst, Symbol.iterator, function* () {
        yield inst;
      });
      let entries;
      inst._zod.check = (payload) => {
        if (payload.value == null) {
          payload.issues.push({ expected: "object", code: "invalid_type", input: payload.value, inst });
          return void 0;
        }
        entries ?? (entries = Reflect.ownKeys(def.shape).map((key) => [key, def.shape[key]]));
        const input = payload.value;
        let proms;
        for (const [key, schema] of entries) {
          const result = schema._zod.run({ value: input[key], issues: [] }, {});
          if (result instanceof Promise) {
            proms ?? (proms = []);
            proms.push(result.then((result2) => handleCheckPropertyResult(result2, payload, key)));
          } else {
            handleCheckPropertyResult(result, payload, key);
          }
        }
        if (proms)
          return Promise.all(proms).then(() => void 0);
        return void 0;
      };
    });
    $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
      $ZodCheck.init(inst, def);
      inst._zod.check = (payload) => {
        payload.value = def.tx(payload.value);
      };
    });
  }
});

// node_modules/zod/v4/core/doc.js
var Doc;
var init_doc = __esm({
  "node_modules/zod/v4/core/doc.js"() {
    Doc = class {
      static {
        __name(this, "Doc");
      }
      constructor(args = [], closed = {}) {
        this.content = [];
        this.indent = 0;
        this.args = args;
        this.closed = closed;
      }
      // the compiler catches a child's throw and keeps writing into this doc, so the indent has to unwind with it
      indented(fn) {
        this.indent += 1;
        try {
          fn(this);
        } finally {
          this.indent -= 1;
        }
      }
      write(arg) {
        if (typeof arg === "function") {
          arg(this, { execution: "sync" });
          arg(this, { execution: "async" });
          return;
        }
        const content = arg;
        const lines = content.split("\n").filter((x) => x);
        const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
        const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
        for (const line of dedented) {
          this.content.push(line);
        }
      }
      compile() {
        const F = Function;
        const content = this?.content ?? [``];
        const factory = new F(...Object.keys(this.closed), `return function (${this.args.join(", ")}) {
${content.join("\n")}
};`);
        return factory(...Object.values(this.closed));
      }
    };
  }
});

// node_modules/zod/v4/core/versions.js
var version;
var init_versions = __esm({
  "node_modules/zod/v4/core/versions.js"() {
    version = {
      major: 4,
      minor: 6,
      patch: 5
    };
  }
});

// node_modules/zod/v4/core/schemas.js
async function validateAsync2(inst, value) {
  const ctx = { async: true };
  return toStandardResult(await inst._zod.run({ value, issues: [] }, ctx), ctx);
}
function standardProps(inst) {
  return {
    validate: /* @__PURE__ */ __name((value) => {
      const ctx = { async: false };
      try {
        const r = inst._zod.run({ value, issues: [] }, ctx);
        if (!(r instanceof Promise))
          return toStandardResult(r, ctx);
      } catch (_) {
      }
      return validateAsync2(inst, value);
    }, "validate"),
    vendor: "zod",
    version: 1
  };
}
function canParseURL(input) {
  try {
    if (typeof URL !== "undefined" && typeof URL.canParse === "function")
      return URL.canParse(input);
    new URL(input);
    return true;
  } catch {
    return false;
  }
}
function validateURL(trimmed, def) {
  if (!("normalize" in def) && !("hostname" in def) && !("protocol" in def)) {
    return canParseURL(trimmed) || URL_UNPARSEABLE;
  }
  return parseURLObject(trimmed, def);
}
function parseURLObject(trimmed, def) {
  if (!def.normalize && def.protocol?.source === httpProtocol.source && !/^https?:\/\//i.test(trimmed)) {
    return URL_BAD_FORMAT;
  }
  try {
    if (typeof URL !== "undefined") {
      const URLStatic = URL;
      if (typeof URLStatic.parse === "function")
        return URLStatic.parse(trimmed) ?? URL_UNPARSEABLE;
    }
    return new URL(trimmed);
  } catch {
    return URL_UNPARSEABLE;
  }
}
function stripTabAndNewline(value) {
  return value.replace(asciiTabOrNewline, "");
}
function urlHostnameOk(url, hostname) {
  hostname.lastIndex = 0;
  return hostname.test(url.hostname);
}
function urlProtocolOk(url, protocol) {
  protocol.lastIndex = 0;
  return protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol);
}
function isValidIPv6(value) {
  if (!ipv6Alphabet.test(value))
    return false;
  return canParseURL(`http://[${value}]`);
}
function isValidCIDRv6(value) {
  const parts = value.split("/");
  if (parts.length !== 2)
    return false;
  const [address, prefix] = parts;
  if (!prefix)
    return false;
  const prefixNum = Number(prefix);
  if (`${prefixNum}` !== prefix)
    return false;
  if (prefixNum < 0 || prefixNum > 128)
    return false;
  return isValidIPv6(address);
}
function isValidBase64(data) {
  if (data === "")
    return true;
  if (/\s/.test(data))
    return false;
  if (data.length % 4 !== 0)
    return false;
  try {
    atob(data);
    return true;
  } catch {
    return false;
  }
}
function isValidBase64URL(data) {
  if (!base64urlCharset.test(data))
    return false;
  const base642 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
  const padded = base642.padEnd(Math.ceil(base642.length / 4) * 4, "=");
  return isValidBase64(padded);
}
function isValidJWT(token, algorithm = null) {
  try {
    const tokensParts = token.split(".");
    if (tokensParts.length !== 3)
      return false;
    const [header] = tokensParts;
    if (!header)
      return false;
    const parsedHeader = JSON.parse(atob(header));
    if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
      return false;
    if (!parsedHeader.alg)
      return false;
    if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
      return false;
    return true;
  } catch {
    return false;
  }
}
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
function handlePropertyResult(result, final, key, input, optin, optout) {
  const isPresent = key in input;
  const isOptionalOut = optout === "optional";
  if (!isPresent && isOptionalOut && optin === "optional") {
    return;
  }
  if (result.issues.length) {
    if (optin !== void 0 && isOptionalOut && !isPresent) {
      return;
    }
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (!isPresent && optin === void 0) {
    if (!result.issues.length) {
      final.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: void 0,
        path: [key]
      });
    }
    return;
  }
  if (result.value === void 0) {
    if (isPresent || optin === "defaulted" && !isOptionalOut) {
      final.value[key] = void 0;
    }
  } else {
    final.value[key] = result.value;
  }
}
function normalizeDef(def) {
  const keys = Object.keys(def.shape);
  const ownSymbols = Object.getOwnPropertySymbols(def.shape);
  const symbolKeys = ownSymbols.length ? ownSymbols : NO_SYMBOL_KEYS;
  const allKeys = symbolKeys.length ? [...keys, ...symbolKeys] : keys;
  for (const k of allKeys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${String(k)}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    allKeys,
    symbolKeys,
    // string-only: handleCatchall matches it against `for...in`, which never yields a symbol
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst, abortEarly) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  const optin = _catchall.optin;
  const optout = _catchall.optout;
  let seen = 0;
  for (const key in input) {
    if (abortEarly && payload.issues.length !== seen) {
      if (aborted(payload, seen))
        break;
      seen = payload.issues.length;
    }
    if (keySet.has(key))
      continue;
    if (key === "__proto__") {
      if (t === "never")
        unrecognized.push(key);
      continue;
    }
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, optin, optout)));
    } else {
      handlePropertyResult(r, payload, key, input, optin, optout);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst,
      // Describes the shape of the input, not the validity of the parsed value, so it never aborts. The parse still fails; the schema's own checks just get to run first, and an enclosing intersection can reconcile the key against a sibling operand.
      continue: true
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
function discriminatorMap(def) {
  const map = /* @__PURE__ */ new Map();
  for (const option of def.options) {
    const values = option._zod.propValues?.[def.discriminator];
    if (!values || values.size === 0)
      throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
    for (const value of values) {
      if (map.has(value)) {
        if (value !== void 0)
          throw new Error(`Duplicate discriminator value "${String(value)}"`);
        map.set(value, null);
      } else {
        map.set(value, option);
      }
    }
  }
  return map;
}
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    if (Object.prototype.hasOwnProperty.call(newObj, "__proto__"))
      delete newObj.__proto__;
    for (const key of sharedKeys) {
      if (key === "__proto__")
        continue;
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  const unrecKeys = /* @__PURE__ */ new Map();
  let unrecIssue;
  const keyIssues = /* @__PURE__ */ new Map();
  const collect = /* @__PURE__ */ __name((iss, side) => {
    let keys;
    if (iss.code === "unrecognized_keys" && !iss.path?.length) {
      unrecIssue ?? (unrecIssue = iss);
      keys = iss.keys;
    } else if (iss.code === "invalid_key" && iss.origin === "record" && iss.path?.length === 1) {
      const k = String(iss.path[0]);
      if (!keyIssues.has(k))
        keyIssues.set(k, iss);
      keys = [k];
    } else {
      return false;
    }
    for (const k of keys) {
      if (!unrecKeys.has(k))
        unrecKeys.set(k, {});
      unrecKeys.get(k)[side] = true;
    }
    return true;
  }, "collect");
  for (const iss of left.issues) {
    if (!collect(iss, "l"))
      result.issues.push(iss);
  }
  for (const iss of right.issues) {
    if (!collect(iss, "r"))
      result.issues.push(iss);
  }
  const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
  if (bothKeys.length) {
    const aggregated = unrecIssue ? bothKeys.filter((k) => unrecIssue.keys.includes(k)) : [];
    if (aggregated.length)
      result.issues.push({ ...unrecIssue, keys: aggregated });
    for (const k of bothKeys) {
      if (!aggregated.includes(k) && keyIssues.has(k))
        result.issues.push(keyIssues.get(k));
    }
  }
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    if (aborted(result))
      return result;
    throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
function handleOptionalResult(payload, result) {
  payload.value = result.issues.length ? void 0 : result.value;
  return payload;
}
function handleDefaultResult(payload, def) {
  if (payload.value === void 0) {
    payload.value = def.defaultValue;
  }
  return payload;
}
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === void 0) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
function handleCatchResult(payload, result, def, ctx) {
  if (!result.issues.length) {
    payload.value = result.value;
    if (result.memo)
      payload.memo = true;
    return payload;
  }
  payload.value = def.catchValue({
    ...result,
    value: payload.value,
    error: {
      issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
    },
    input: payload.value
  });
  return payload;
}
function handlePipeResult(left, next, ctx) {
  if (left.issues.some((iss) => iss.code !== "unrecognized_keys")) {
    left.aborted = true;
    return left;
  }
  return next._zod.run({ value: left.value, issues: left.issues }, ctx);
}
function handleReadonlyResult(payload) {
  if (!payload.memo)
    payload.value = Object.freeze(payload.value);
  return payload;
}
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      // incorporates params.error into issue reporting
      path: [...inst._zod.def.path ?? []],
      // incorporates params.error into issue reporting
      continue: !inst._zod.def.abort
      // params: inst._zod.def.params,
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}
var $ZodType, toStandardResult, $ZodString, $ZodStringFormat, $ZodGUID, $ZodUUID, $ZodEmail, URL_BAD_FORMAT, URL_UNPARSEABLE, asciiTabOrNewline, $ZodURL, $ZodEmoji, $ZodNanoID, $ZodCUID, $ZodCUID2, $ZodULID, $ZodXID, $ZodKSUID, $ZodISODateTime, $ZodISODate, $ZodISOTime, $ZodISODuration, $ZodIPv4, ipv6Alphabet, $ZodIPv6, $ZodCIDRv4, $ZodCIDRv6, base64Charset, $ZodBase64, base64urlCharset, $ZodBase64URL, $ZodE164, $ZodJWT, $ZodNumber, $ZodNumberFormat, $ZodBoolean, $ZodNull, $ZodAny, $ZodUnknown, $ZodNever, $ZodArray, NO_SYMBOL_KEYS, $ZodObject, $ZodObjectJIT, $ZodUnion, $ZodDiscriminatedUnion, $ZodIntersection, $ZodRecord, $ZodEnum, $ZodLiteral, $ZodTransform, $ZodOptional, $ZodExactOptional, $ZodNullable, $ZodDefault, $ZodPrefault, $ZodNonOptional, $ZodCatch, $ZodPipe, $ZodReadonly, $ZodLazy, $ZodCustom;
var init_schemas = __esm({
  "node_modules/zod/v4/core/schemas.js"() {
    init_checks();
    init_core();
    init_doc();
    init_regexes();
    init_util();
    init_versions();
    init_util();
    $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
      var _a25;
      inst ?? (inst = {});
      inst._zod.def = def;
      inst._zod.bag = inst._zod.bag || {};
      inst._zod.version = version;
      const defChecks = inst._zod.def.checks;
      const checks = inst._zod.traits.has("$ZodCheck") ? [inst, ...defChecks ?? []] : defChecks?.length ? [...defChecks] : [];
      for (const ch of checks) {
        for (const fn of ch._zod.onattach) {
          fn(inst);
        }
      }
      if (checks.length === 0) {
        (_a25 = inst._zod).deferred ?? (_a25.deferred = []);
        inst._zod.deferred?.push(() => {
          inst._zod.run = inst._zod.parse;
        });
      } else {
        const runChecks = /* @__PURE__ */ __name((payload, checks2, ctx) => {
          if (payload.memo)
            return payload;
          let isAborted = aborted(payload);
          let asyncResult;
          for (const ch of checks2) {
            if (ch._zod.def.when) {
              if (explicitlyAborted(payload))
                continue;
              const shouldRun = ch._zod.def.when(payload);
              if (!shouldRun)
                continue;
            } else if (isAborted) {
              continue;
            }
            const currLen = payload.issues.length;
            const _ = ch._zod.check(payload);
            if (_ instanceof Promise && ctx?.async === false) {
              throw new $ZodAsyncError();
            }
            if (asyncResult || _ instanceof Promise) {
              asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
                await _;
                const nextLen = payload.issues.length;
                if (nextLen === currLen)
                  return;
                attachSchema(payload.issues, currLen, inst);
                if (!isAborted)
                  isAborted = aborted(payload, currLen);
              });
            } else {
              const nextLen = payload.issues.length;
              if (nextLen === currLen)
                continue;
              attachSchema(payload.issues, currLen, inst);
              if (!isAborted)
                isAborted = aborted(payload, currLen);
            }
          }
          if (asyncResult) {
            return asyncResult.then(() => {
              return payload;
            });
          }
          return payload;
        }, "runChecks");
        const handleCanaryResult = /* @__PURE__ */ __name((canary, payload, ctx) => {
          if (aborted(canary)) {
            canary.aborted = true;
            return canary;
          }
          const checkResult = runChecks(payload, checks, ctx);
          if (checkResult instanceof Promise) {
            if (ctx.async === false)
              throw new $ZodAsyncError();
            return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
          }
          return inst._zod.parse(checkResult, ctx);
        }, "handleCanaryResult");
        inst._zod.run = (payload, ctx) => {
          if (ctx.skipChecks) {
            return inst._zod.parse(payload, ctx);
          }
          if (ctx.direction === "backward") {
            const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
            if (canary instanceof Promise) {
              return canary.then((canary2) => {
                return handleCanaryResult(canary2, payload, ctx);
              });
            }
            return handleCanaryResult(canary, payload, ctx);
          }
          const result = inst._zod.parse(payload, ctx);
          if (result instanceof Promise) {
            if (ctx.async === false)
              throw new $ZodAsyncError();
            return result.then((result2) => runChecks(result2, checks, ctx));
          }
          return runChecks(result, checks, ctx);
        };
      }
    }, {
      // Wrappers extend this by installing a richer factory over it; reading it eagerly would defeat the laziness.
      get "~standard"() {
        return hide(this, "~standard", standardProps(this));
      },
      set "~standard"(value) {
        own(this, "~standard", value);
      }
    });
    toStandardResult = /* @__PURE__ */ __name((r, ctx) => r.issues.length ? { issues: r.issues.map((iss) => finalizeIssue(iss, ctx, config())) } : { value: r.value }, "toStandardResult");
    __name(validateAsync2, "validateAsync");
    __name(standardProps, "standardProps");
    $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.pattern = def.pattern ?? anyString;
      inst._zod.parse = (payload, _) => {
        if (def.coerce)
          try {
            payload.value = String(payload.value);
          } catch (_2) {
          }
        if (typeof payload.value === "string")
          return payload;
        payload.issues.push({
          expected: "string",
          code: "invalid_type",
          input: payload.value,
          inst
        });
        return payload;
      };
    });
    $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
      $ZodCheckStringFormat.init(inst, def);
      $ZodString.init(inst, def);
    });
    $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
      def.pattern ?? (def.pattern = guid);
      $ZodStringFormat.init(inst, def);
    });
    $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
      if (def.version) {
        const versionMap = {
          v1: 1,
          v2: 2,
          v3: 3,
          v4: 4,
          v5: 5,
          v6: 6,
          v7: 7,
          v8: 8
        };
        const v = versionMap[def.version];
        if (v === void 0)
          throw new Error(`Invalid UUID version: "${def.version}"`);
        def.pattern ?? (def.pattern = uuid(v));
      } else
        def.pattern ?? (def.pattern = uuid());
      $ZodStringFormat.init(inst, def);
    });
    $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
      def.pattern ?? (def.pattern = email);
      $ZodStringFormat.init(inst, def);
    });
    URL_BAD_FORMAT = 1;
    URL_UNPARSEABLE = 2;
    __name(canParseURL, "canParseURL");
    __name(validateURL, "validateURL");
    __name(parseURLObject, "parseURLObject");
    asciiTabOrNewline = /[\t\n\r]/g;
    __name(stripTabAndNewline, "stripTabAndNewline");
    __name(urlHostnameOk, "urlHostnameOk");
    __name(urlProtocolOk, "urlProtocolOk");
    $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
      $ZodStringFormat.init(inst, def);
      inst._zod.check = (payload) => {
        try {
          const trimmed = payload.value.trim();
          const url = validateURL(trimmed, def);
          if (url === URL_BAD_FORMAT) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid URL format",
              input: payload.value,
              inst,
              continue: !def.abort
            });
            return;
          }
          if (url === URL_UNPARSEABLE) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              input: payload.value,
              inst,
              continue: !def.abort
            });
            return;
          }
          if (url === true) {
            payload.value = stripTabAndNewline(trimmed);
            return;
          }
          if (def.hostname && !urlHostnameOk(url, def.hostname)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid hostname",
              pattern: def.hostname.source,
              input: payload.value,
              inst,
              continue: !def.abort
            });
          }
          if (def.protocol && !urlProtocolOk(url, def.protocol)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid protocol",
              pattern: def.protocol.source,
              input: payload.value,
              inst,
              continue: !def.abort
            });
          }
          payload.value = def.normalize ? url.href : stripTabAndNewline(trimmed);
          return;
        } catch (_) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      };
    });
    $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
      def.pattern ?? (def.pattern = emoji());
      $ZodStringFormat.init(inst, def);
    });
    $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
      if (def.length !== void 0 && (!Number.isInteger(def.length) || def.length < 1))
        throw new Error(`Invalid nanoid length: ${def.length}`);
      def.pattern ?? (def.pattern = def.length === void 0 ? nanoid : nanoidOfLength(def.length));
      $ZodStringFormat.init(inst, def);
    });
    $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
      def.pattern ?? (def.pattern = cuid);
      $ZodStringFormat.init(inst, def);
    });
    $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
      def.pattern ?? (def.pattern = cuid2);
      $ZodStringFormat.init(inst, def);
    });
    $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
      def.pattern ?? (def.pattern = ulid);
      $ZodStringFormat.init(inst, def);
    });
    $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
      def.pattern ?? (def.pattern = xid);
      $ZodStringFormat.init(inst, def);
    });
    $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
      def.pattern ?? (def.pattern = ksuid);
      $ZodStringFormat.init(inst, def);
    });
    $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
      def.pattern ?? (def.pattern = datetime(def));
      $ZodStringFormat.init(inst, def);
    });
    $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
      def.pattern ?? (def.pattern = date);
      $ZodStringFormat.init(inst, def);
    });
    $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
      def.pattern ?? (def.pattern = time(def));
      $ZodStringFormat.init(inst, def);
    });
    $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
      def.pattern ?? (def.pattern = duration);
      $ZodStringFormat.init(inst, def);
    });
    $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
      def.pattern ?? (def.pattern = ipv4);
      $ZodStringFormat.init(inst, def);
    });
    ipv6Alphabet = /^[0-9a-fA-F:.]+$/;
    __name(isValidIPv6, "isValidIPv6");
    $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
      def.pattern ?? (def.pattern = ipv6);
      $ZodStringFormat.init(inst, def);
      inst._zod.check = (payload) => {
        if (!isValidIPv6(payload.value)) {
          payload.issues.push({
            code: "invalid_format",
            format: "ipv6",
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      };
    });
    $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
      def.pattern ?? (def.pattern = cidrv4);
      $ZodStringFormat.init(inst, def);
    });
    __name(isValidCIDRv6, "isValidCIDRv6");
    $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
      def.pattern ?? (def.pattern = cidrv6);
      $ZodStringFormat.init(inst, def);
      inst._zod.check = (payload) => {
        if (!isValidCIDRv6(payload.value)) {
          payload.issues.push({
            code: "invalid_format",
            format: "cidrv6",
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      };
    });
    __name(isValidBase64, "isValidBase64");
    base64Charset = /^[0-9a-zA-Z+/]*={0,2}$/;
    $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
      def.pattern ?? (def.pattern = base64Charset);
      $ZodStringFormat.init(inst, def);
      inst._zod.check = (payload) => {
        if (isValidBase64(payload.value))
          return;
        payload.issues.push({
          code: "invalid_format",
          format: "base64",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      };
    });
    base64urlCharset = /^[A-Za-z0-9_-]*$/;
    __name(isValidBase64URL, "isValidBase64URL");
    $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
      def.pattern ?? (def.pattern = base64urlCharset);
      $ZodStringFormat.init(inst, def);
      inst._zod.check = (payload) => {
        if (isValidBase64URL(payload.value))
          return;
        payload.issues.push({
          code: "invalid_format",
          format: "base64url",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
      def.pattern ?? (def.pattern = e164);
      $ZodStringFormat.init(inst, def);
    });
    __name(isValidJWT, "isValidJWT");
    $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
      $ZodStringFormat.init(inst, def);
      inst._zod.check = (payload) => {
        if (isValidJWT(payload.value, def.alg))
          return;
        payload.issues.push({
          code: "invalid_format",
          format: "jwt",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.pattern = number;
      inst._zod.parse = (payload, _ctx) => {
        if (def.coerce)
          try {
            payload.value = Number(payload.value);
          } catch (_) {
          }
        const input = payload.value;
        if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
          return payload;
        }
        const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? String(input) : void 0 : void 0;
        payload.issues.push({
          expected: "number",
          code: "invalid_type",
          input,
          inst,
          ...received ? { received } : {}
        });
        return payload;
      };
    });
    $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
      $ZodCheckNumberFormat.init(inst, def);
      $ZodNumber.init(inst, def);
    });
    $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.pattern = boolean;
      inst._zod.parse = (payload, _ctx) => {
        if (def.coerce)
          try {
            payload.value = Boolean(payload.value);
          } catch (_) {
          }
        const input = payload.value;
        if (typeof input === "boolean")
          return payload;
        payload.issues.push({
          expected: "boolean",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      };
    });
    $ZodNull = /* @__PURE__ */ $constructor("$ZodNull", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.pattern = _null;
      inst._zod.values = /* @__PURE__ */ new Set([null]);
      inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (input === null)
          return payload;
        payload.issues.push({
          expected: "null",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      };
    });
    $ZodAny = /* @__PURE__ */ $constructor("$ZodAny", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload) => payload;
    });
    $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload) => payload;
    });
    $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload, _ctx) => {
        payload.issues.push({
          expected: "never",
          code: "invalid_type",
          input: payload.value,
          inst
        });
        return payload;
      };
    });
    __name(handleArrayResult, "handleArrayResult");
    $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
      $ZodType.init(inst, def);
      const memo2 = globalConfig.memoizer;
      memo2?.attach(inst);
      inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!Array.isArray(input)) {
          payload.issues.push({
            expected: "array",
            code: "invalid_type",
            input,
            inst
          });
          return payload;
        }
        payload.value = memo2 ? memo2.alloc(inst, payload, Array(input.length), ctx) : Array(input.length);
        const proms = [];
        const abortEarly = ctx?.abortEarly;
        for (let i = 0; i < input.length; i++) {
          const item = input[i];
          const result = def.element._zod.run({
            value: item,
            issues: []
          }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
          } else {
            handleArrayResult(result, payload, i);
            if (abortEarly && result.issues.length !== 0 && aborted(result))
              break;
          }
        }
        if (proms.length) {
          return Promise.all(proms).then(() => payload);
        }
        return payload;
      };
    });
    __name(handlePropertyResult, "handlePropertyResult");
    NO_SYMBOL_KEYS = [];
    __name(normalizeDef, "normalizeDef");
    __name(handleCatchall, "handleCatchall");
    $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
      $ZodType.init(inst, def);
      const desc = Object.getOwnPropertyDescriptor(def, "shape");
      const sh = desc?.get ? desc.get.raw : def.shape ?? {};
      if (sh) {
        const get = /* @__PURE__ */ __name(() => {
          const newSh = { ...sh };
          Object.defineProperty(def, "shape", { value: newSh });
          get.raw = newSh;
          return newSh;
        }, "get");
        get.raw = sh;
        Object.defineProperty(def, "shape", { get });
      }
      const _normalized = cached(() => normalizeDef(def));
      defineLazyInternal(inst, "propValues", (zod) => {
        const shape = zod.def.shape;
        const propValues = {};
        for (const key in shape) {
          const field = shape[key]._zod;
          if (field.values) {
            if (!Object.prototype.hasOwnProperty.call(propValues, key)) {
              assignProp(propValues, key, /* @__PURE__ */ new Set());
            }
            for (const v of field.values)
              propValues[key].add(v);
            if (field.optin !== void 0)
              propValues[key].add(void 0);
          }
        }
        return propValues;
      });
      const isObject2 = isObject;
      const catchall = def.catchall;
      let value;
      const memo2 = globalConfig.memoizer;
      memo2?.attach(inst);
      inst._zod.parse = (payload, ctx) => {
        value ?? (value = _normalized.value);
        const input = payload.value;
        if (!isObject2(input)) {
          payload.issues.push({
            expected: "object",
            code: "invalid_type",
            input,
            inst
          });
          return payload;
        }
        payload.value = memo2 ? memo2.alloc(inst, payload, {}, ctx) : {};
        const proms = [];
        const shape = value.shape;
        const abortEarly = ctx?.abortEarly;
        let seen = payload.issues.length;
        for (const key of value.allKeys) {
          if (abortEarly && payload.issues.length !== seen) {
            if (aborted(payload, seen))
              break;
            seen = payload.issues.length;
          }
          if (key === "__proto__")
            continue;
          const el = shape[key];
          const optin = el._zod.optin;
          const optout = el._zod.optout;
          const r = el._zod.run({ value: input[key], issues: [] }, ctx);
          if (r instanceof Promise) {
            proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, optin, optout)));
          } else {
            handlePropertyResult(r, payload, key, input, optin, optout);
          }
        }
        if (!catchall) {
          return proms.length ? Promise.all(proms).then(() => payload) : payload;
        }
        return handleCatchall(proms, input, payload, ctx, _normalized.value, inst, abortEarly === true);
      };
    });
    $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
      $ZodObject.init(inst, def);
      const superParse = inst._zod.parse;
      const _normalized = cached(() => normalizeDef(def));
      const memo2 = globalConfig.memoizer;
      const generateFastpass = /* @__PURE__ */ __name((shape) => {
        const normalized = _normalized.value;
        const syms = normalized.symbolKeys;
        const doc = new Doc(["payload", "ctx"], { shape, inst, memo: memo2, syms });
        const parseStr = /* @__PURE__ */ __name((k) => `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`, "parseStr");
        const prefixStr = /* @__PURE__ */ __name((id, k) => `
          let ${id}_ab = false;
          for (let i = 0; i < ${id}.issues.length; i++) {
            const iss = ${id}.issues[i];
            iss.path = iss.path ? [${k}, ...iss.path] : [${k}];
            payload.issues.push(iss);
            if (iss.continue !== true) ${id}_ab = true;
          }
          if (${id}_ab && ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }`, "prefixStr");
        doc.write(`const input = payload.value;`);
        const ids = /* @__PURE__ */ Object.create(null);
        let counter = 0;
        for (const key of normalized.allKeys) {
          ids[key] = `key_${counter++}`;
        }
        doc.write(memo2 ? `const newResult = memo.alloc(inst, payload, {}, ctx);` : `const newResult = {};`);
        for (const key of normalized.allKeys) {
          if (key === "__proto__")
            continue;
          const id = ids[key];
          const k = typeof key === "symbol" ? `syms[${syms.indexOf(key)}]` : esc(key);
          const isPresent = `${k} in input`;
          const schema = shape[key];
          const optin = schema?._zod?.optin;
          const isOptionalIn = optin !== void 0;
          const isOptionalOut = schema?._zod?.optout === "optional";
          doc.write(`const ${id} = ${parseStr(k)};`);
          if (isOptionalIn && isOptionalOut) {
            const assign = optin === "optional" ? `${id}_present` : `${id}.value !== undefined || ${id}_present`;
            doc.write(`
        const ${id}_present = ${isPresent};
        if (!${id}.issues.length || ${id}_present) {
          if (${id}.issues.length) {${prefixStr(id, k)}
          }

          if (${assign}) {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
          } else if (!isOptionalIn) {
            doc.write(`
        const ${id}_present = ${isPresent};
        if (${id}.issues.length) {${prefixStr(id, k)}
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
          if (ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }
        }

        if (${id}_present) {
          newResult[${k}] = ${id}.value;
        }

      `);
          } else {
            doc.write(`
        if (${id}.issues.length) {${prefixStr(id, k)}
        }
      `);
            if (optin === "defaulted") {
              doc.write(`newResult[${k}] = ${id}.value;`);
            } else {
              doc.write(`
        if (${id}.value !== undefined || ${isPresent}) {
          newResult[${k}] = ${id}.value;
        }
      `);
            }
          }
        }
        doc.write(`payload.value = newResult;`);
        doc.write(`return payload;`);
        return doc.compile();
      }, "generateFastpass");
      let fastpass;
      const isObject2 = isObject;
      const jit = !globalConfig.jitless;
      const allowsEval2 = allowsEval;
      const fastEnabled = jit && allowsEval2.value;
      const catchall = def.catchall;
      let value;
      inst._zod.parse = (payload, ctx) => {
        value ?? (value = _normalized.value);
        const input = payload.value;
        if (!isObject2(input)) {
          payload.issues.push({
            expected: "object",
            code: "invalid_type",
            input,
            inst
          });
          return payload;
        }
        if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
          if (!fastpass)
            fastpass = generateFastpass(def.shape);
          payload = fastpass(payload, ctx);
          if (!catchall)
            return payload;
          return handleCatchall([], input, payload, ctx, value, inst, ctx?.abortEarly === true);
        }
        return superParse(payload, ctx);
      };
    });
    __name(handleUnionResults, "handleUnionResults");
    $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
      $ZodType.init(inst, def);
      defineLazyInternal(inst, "optin", (zod) => zod.def.options.some((o) => o._zod.optin === "defaulted") ? "defaulted" : zod.def.options.some((o) => o._zod.optin !== void 0) ? "optional" : void 0);
      defineLazyInternal(inst, "optout", (zod) => zod.def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
      defineLazyInternal(inst, "values", (zod) => {
        if (zod.def.options.every((o) => o._zod.values)) {
          return new Set(zod.def.options.flatMap((option) => Array.from(option._zod.values)));
        }
        return void 0;
      });
      defineLazyInternal(inst, "pattern", (zod) => {
        if (zod.def.options.every((o) => o._zod.pattern)) {
          const patterns = zod.def.options.map((o) => o._zod.pattern);
          return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
        }
        return void 0;
      });
      const first = def.options.length === 1 ? def.options[0]._zod.run : null;
      inst._zod.parse = (payload, ctx) => {
        if (first) {
          return first(payload, ctx);
        }
        let async = false;
        const results = [];
        for (const option of def.options) {
          const result = option._zod.run({
            value: payload.value,
            issues: []
          }, ctx);
          if (result instanceof Promise) {
            results.push(result);
            async = true;
          } else {
            if (result.issues.length === 0)
              return result;
            results.push(result);
          }
        }
        if (!async)
          return handleUnionResults(results, payload, inst, ctx);
        return Promise.all(results).then((results2) => {
          return handleUnionResults(results2, payload, inst, ctx);
        });
      };
    });
    __name(discriminatorMap, "discriminatorMap");
    $ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
      def.inclusive = false;
      $ZodUnion.init(inst, def);
      const _super = inst._zod.parse;
      defineLazyInternal(inst, "propValues", (zod) => {
        const propValues = {};
        let undefinedCount = 0;
        for (const option of zod.def.options) {
          const pv = option._zod.propValues;
          if (!pv || Object.keys(pv).length === 0)
            throw new Error(`Invalid discriminated union option at index "${zod.def.options.indexOf(option)}"`);
          if (pv[zod.def.discriminator]?.has(void 0))
            undefinedCount++;
          for (const [k, v] of Object.entries(pv)) {
            if (!Object.prototype.hasOwnProperty.call(propValues, k)) {
              assignProp(propValues, k, /* @__PURE__ */ new Set());
            }
            for (const val of v) {
              propValues[k].add(val);
            }
          }
        }
        if (!zod.def.unionFallback && undefinedCount > 1)
          propValues[zod.def.discriminator]?.delete(void 0);
        return propValues;
      });
      def.options.forEach((option, i) => {
        const propShape = rawShape(option._zod.def);
        if (propShape && !Object.prototype.hasOwnProperty.call(propShape, def.discriminator)) {
          throw new Error(`Invalid discriminated union option at index "${i}"`);
        }
      });
      const disc = cached(() => discriminatorMap(def));
      inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!isObject(input)) {
          payload.issues.push({
            code: "invalid_type",
            expected: "object",
            input,
            inst
          });
          return payload;
        }
        const value = input?.[def.discriminator];
        const opt = disc.value.get(value);
        if (opt && (value !== void 0 || ctx.direction !== "backward")) {
          return opt._zod.run(payload, ctx);
        }
        if (def.unionFallback || ctx.direction === "backward") {
          return _super(payload, ctx);
        }
        payload.issues.push({
          code: "invalid_union",
          errors: [],
          note: "No matching discriminator",
          discriminator: def.discriminator,
          options: Array.from(disc.value.keys()).filter((value2) => disc.value.get(value2) !== null),
          input,
          path: [def.discriminator],
          inst
        });
        return payload;
      };
    });
    $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        const left = def.left._zod.run({ value: input, issues: [] }, ctx);
        const right = def.right._zod.run({ value: input, issues: [] }, ctx);
        const async = left instanceof Promise || right instanceof Promise;
        if (async) {
          return Promise.all([left, right]).then(([left2, right2]) => {
            return handleIntersectionResults(payload, left2, right2);
          });
        }
        return handleIntersectionResults(payload, left, right);
      };
    });
    __name(mergeValues, "mergeValues");
    __name(handleIntersectionResults, "handleIntersectionResults");
    $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
      $ZodType.init(inst, def);
      const memo2 = globalConfig.memoizer;
      memo2?.attach(inst);
      inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!isPlainObject(input)) {
          payload.issues.push({
            expected: "record",
            code: "invalid_type",
            input,
            inst
          });
          return payload;
        }
        const proms = [];
        const values = def.keyType._zod.values;
        if (values && !def.partial) {
          payload.value = memo2 ? memo2.alloc(inst, payload, {}, ctx) : {};
          const recordKeys = /* @__PURE__ */ new Set();
          for (const key of values) {
            if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
              recordKeys.add(typeof key === "number" ? key.toString() : key);
              if (key === "__proto__")
                continue;
              const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
              if (keyResult instanceof Promise) {
                throw new Error("Async schemas not supported in object keys currently");
              }
              if (keyResult.issues.length) {
                payload.issues.push({
                  code: "invalid_key",
                  origin: "record",
                  issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
                  input: key,
                  path: [key],
                  inst
                });
                continue;
              }
              const outKey = keyResult.value;
              if (outKey === "__proto__")
                continue;
              const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
              if (result instanceof Promise) {
                proms.push(result.then((result2) => {
                  if (result2.issues.length) {
                    payload.issues.push(...prefixIssues(key, result2.issues));
                  }
                  payload.value[outKey] = result2.value;
                }));
              } else {
                if (result.issues.length) {
                  payload.issues.push(...prefixIssues(key, result.issues));
                }
                payload.value[outKey] = result.value;
              }
            }
          }
          let unrecognized;
          for (const key in input) {
            if (!recordKeys.has(key)) {
              if (def.mode === "loose") {
                if (key === "__proto__")
                  continue;
                payload.value[key] = input[key];
              } else {
                unrecognized = unrecognized ?? [];
                unrecognized.push(key);
              }
            }
          }
          if (unrecognized && unrecognized.length > 0) {
            payload.issues.push({
              code: "unrecognized_keys",
              input,
              inst,
              keys: unrecognized,
              continue: true
            });
          }
        } else {
          payload.value = memo2 ? memo2.alloc(inst, payload, {}, ctx) : {};
          let unrecognized;
          for (const key of Reflect.ownKeys(input)) {
            if (key === "__proto__")
              continue;
            if (!Object.prototype.propertyIsEnumerable.call(input, key))
              continue;
            let keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
            if (keyResult instanceof Promise) {
              throw new Error("Async schemas not supported in object keys currently");
            }
            const checkNumericKey = typeof key === "string" && number.test(key) && keyResult.issues.length;
            if (checkNumericKey) {
              const retryResult = def.keyType._zod.run({ value: Number(key), issues: [] }, ctx);
              if (retryResult instanceof Promise) {
                throw new Error("Async schemas not supported in object keys currently");
              }
              if (retryResult.issues.length === 0) {
                keyResult = retryResult;
              }
            }
            if (keyResult.issues.length) {
              if (def.mode === "loose") {
                payload.value[key] = input[key];
              } else if (values) {
                unrecognized = unrecognized ?? [];
                unrecognized.push(key);
              } else {
                payload.issues.push({
                  code: "invalid_key",
                  origin: "record",
                  issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
                  input: key,
                  path: [key],
                  inst
                });
              }
              continue;
            }
            const outKey = keyResult.value;
            if (outKey === "__proto__")
              continue;
            const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
            if (result instanceof Promise) {
              proms.push(result.then((result2) => {
                if (result2.issues.length) {
                  payload.issues.push(...prefixIssues(key, result2.issues));
                }
                payload.value[outKey] = result2.value;
              }));
            } else {
              if (result.issues.length) {
                payload.issues.push(...prefixIssues(key, result.issues));
              }
              payload.value[outKey] = result.value;
            }
          }
          if (unrecognized && unrecognized.length > 0) {
            payload.issues.push({
              code: "unrecognized_keys",
              input,
              inst,
              keys: unrecognized,
              continue: true
            });
          }
        }
        if (proms.length) {
          return Promise.all(proms).then(() => payload);
        }
        return payload;
      };
    });
    $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
      $ZodType.init(inst, def);
      const values = getEnumValues(def.entries);
      const valuesSet = new Set(values);
      inst._zod.values = valuesSet;
      defineLazyInternal(inst, "pattern", (zod) => {
        const patternValues = getEnumValues(zod.def.entries).filter((k) => propertyKeyTypes.has(typeof k));
        return new RegExp(patternValues.length ? `^(${patternValues.map((o) => escapeRegex(o.toString())).join("|")})$` : "^[^\\s\\S]$");
      });
      inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (valuesSet.has(input)) {
          return payload;
        }
        payload.issues.push({
          code: "invalid_value",
          values,
          input,
          inst
        });
        return payload;
      };
    });
    $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
      $ZodType.init(inst, def);
      const values = new Set(def.values);
      inst._zod.values = values;
      defineLazyInternal(inst, "pattern", (zod) => {
        const vals = zod.def.values;
        return new RegExp(vals.length ? `^(${vals.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$` : "^[^\\s\\S]$");
      });
      inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (values.has(input)) {
          return payload;
        }
        payload.issues.push({
          code: "invalid_value",
          values: def.values,
          input,
          inst
        });
        return payload;
      };
    });
    $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.optin = "optional";
      globalConfig.memoizer?.guard(inst);
      inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
          throw new $ZodEncodeError(inst.constructor.name);
        }
        const _out = def.transform(payload.value, payload);
        if (ctx.async) {
          const output = _out instanceof Promise ? _out : Promise.resolve(_out);
          return output.then((output2) => {
            payload.value = output2;
            return payload;
          });
        }
        if (_out instanceof Promise) {
          throw new $ZodAsyncError();
        }
        payload.value = _out;
        return payload;
      };
    });
    __name(handleOptionalResult, "handleOptionalResult");
    $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
      $ZodType.init(inst, def);
      defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
      inst._zod.optout = "optional";
      defineLazyInternal(inst, "values", (zod) => {
        const values = zod.def.innerType._zod.values;
        return values ? /* @__PURE__ */ new Set([...values, void 0]) : void 0;
      });
      defineLazyInternal(inst, "pattern", (zod) => {
        const pattern = zod.def.innerType._zod.pattern;
        return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
      });
      inst._zod.parse = (payload, ctx) => {
        if (payload.value === void 0) {
          if (def.innerType._zod.optin !== "defaulted")
            return payload;
          const result = def.innerType._zod.run({ value: payload.value, issues: [] }, ctx);
          if (result instanceof Promise)
            return result.then((result2) => handleOptionalResult(payload, result2));
          return handleOptionalResult(payload, result);
        }
        return def.innerType._zod.run(payload, ctx);
      };
    });
    $ZodExactOptional = /* @__PURE__ */ $constructor("$ZodExactOptional", (inst, def) => {
      $ZodOptional.init(inst, def);
      defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
      defineLazyInternal(inst, "pattern", (zod) => zod.def.innerType._zod.pattern);
      inst._zod.parse = (payload, ctx) => {
        return def.innerType._zod.run(payload, ctx);
      };
    });
    $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
      $ZodType.init(inst, def);
      defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin);
      defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
      defineLazyInternal(inst, "pattern", (zod) => {
        const pattern = zod.def.innerType._zod.pattern;
        return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
      });
      defineLazyInternal(inst, "values", (zod) => {
        return zod.def.innerType._zod.values ? /* @__PURE__ */ new Set([...zod.def.innerType._zod.values, null]) : void 0;
      });
      inst._zod.parse = (payload, ctx) => {
        if (payload.value === null)
          return payload;
        return def.innerType._zod.run(payload, ctx);
      };
    });
    $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.optin = "defaulted";
      defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
      inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
          return def.innerType._zod.run(payload, ctx);
        }
        if (payload.value === void 0) {
          payload.value = def.defaultValue;
          return payload;
        }
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
          return result.then((result2) => handleDefaultResult(result2, def));
        }
        return handleDefaultResult(result, def);
      };
    });
    __name(handleDefaultResult, "handleDefaultResult");
    $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.optin = "defaulted";
      defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
      inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
          return def.innerType._zod.run(payload, ctx);
        }
        if (payload.value === void 0) {
          payload.value = def.defaultValue;
        }
        return def.innerType._zod.run(payload, ctx);
      };
    });
    $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
      $ZodType.init(inst, def);
      defineLazyInternal(inst, "values", (zod) => {
        const v = zod.def.innerType._zod.values;
        return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
      });
      inst._zod.parse = (payload, ctx) => {
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
          return result.then((result2) => handleNonOptionalResult(result2, inst));
        }
        return handleNonOptionalResult(result, inst);
      };
    });
    __name(handleNonOptionalResult, "handleNonOptionalResult");
    __name(handleCatchResult, "handleCatchResult");
    $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
      $ZodType.init(inst, def);
      defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
      defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
      defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
      inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
          return def.innerType._zod.run(payload, ctx);
        }
        const result = def.innerType._zod.run({ value: payload.value, issues: [] }, ctx);
        if (result instanceof Promise) {
          return result.then((result2) => handleCatchResult(payload, result2, def, ctx));
        }
        return handleCatchResult(payload, result, def, ctx);
      };
    });
    $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
      $ZodType.init(inst, def);
      defineLazyInternal(inst, "values", (zod) => zod.def.in._zod.values);
      defineLazyInternal(inst, "optin", (zod) => zod.def.in._zod.optin);
      defineLazyInternal(inst, "optout", (zod) => zod.def.out._zod.optout);
      defineLazyInternal(inst, "propValues", (zod) => zod.def.in._zod.propValues);
      inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
          const right = def.out._zod.run(payload, ctx);
          if (right instanceof Promise) {
            return right.then((right2) => handlePipeResult(right2, def.in, ctx));
          }
          return handlePipeResult(right, def.in, ctx);
        }
        const left = def.in._zod.run(payload, ctx);
        if (left instanceof Promise) {
          return left.then((left2) => handlePipeResult(left2, def.out, ctx));
        }
        return handlePipeResult(left, def.out, ctx);
      };
    });
    __name(handlePipeResult, "handlePipeResult");
    $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
      $ZodType.init(inst, def);
      defineLazyInternal(inst, "propValues", (zod) => zod.def.innerType._zod.propValues);
      defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
      defineLazyInternal(inst, "optin", (zod) => zod.def.innerType?._zod?.optin);
      defineLazyInternal(inst, "optout", (zod) => zod.def.innerType?._zod?.optout);
      inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
          return def.innerType._zod.run(payload, ctx);
        }
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
          return result.then(handleReadonlyResult);
        }
        return handleReadonlyResult(result);
      };
    });
    __name(handleReadonlyResult, "handleReadonlyResult");
    $ZodLazy = /* @__PURE__ */ $constructor("$ZodLazy", (inst, def) => {
      $ZodType.init(inst, def);
      defineLazy(inst._zod, "innerType", () => {
        const d = def;
        if (!d._cachedInner)
          d._cachedInner = def.getter();
        return d._cachedInner;
      });
      defineLazyInternal(inst, "pattern", (zod) => zod.innerType?._zod?.pattern);
      defineLazyInternal(inst, "propValues", (zod) => zod.innerType?._zod?.propValues);
      defineLazyInternal(inst, "optin", (zod) => zod.innerType?._zod?.optin ?? void 0);
      defineLazyInternal(inst, "optout", (zod) => zod.innerType?._zod?.optout ?? void 0);
      inst._zod.parse = (payload, ctx) => {
        const inner = inst._zod.innerType;
        return inner._zod.run(payload, ctx);
      };
    });
    $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
      $ZodCheck.init(inst, def);
      $ZodType.init(inst, def);
      inst._zod.parse = (payload, _) => {
        return payload;
      };
      inst._zod.check = (payload) => {
        const input = payload.value;
        const r = def.fn(input);
        if (r instanceof Promise) {
          return r.then((r2) => handleRefineResult(r2, payload, input, inst));
        }
        handleRefineResult(r, payload, input, inst);
        return;
      };
    });
    __name(handleRefineResult, "handleRefineResult");
  }
});

// node_modules/zod/v4/core/memoizer.js
function isRef(value) {
  return value !== null && typeof value === "object";
}
function cloneIssues(issues) {
  return issues.map((iss) => iss.path ? { ...iss, path: iss.path.slice() } : { ...iss });
}
function isRecursive(inst, stack, resolve2) {
  const cached2 = recursive.get(inst);
  if (cached2 !== void 0)
    return cached2 ? PROVEN : NONE;
  if (stack.has(inst))
    return PROVEN;
  stack.add(inst);
  let result = NONE;
  const check = /* @__PURE__ */ __name((child) => {
    if (result !== PROVEN && child?._zod) {
      const answer = isRecursive(child, stack, resolve2);
      if (answer > result)
        result = answer;
    }
  }, "check");
  const shape = /* @__PURE__ */ __name((sh, spread) => {
    let answer = NONE;
    for (const key of Reflect.ownKeys(sh)) {
      const desc = Object.getOwnPropertyDescriptor(sh, key);
      if (spread && !desc.enumerable)
        continue;
      const child = desc.get ? ASSUMED : desc.value?._zod ? isRecursive(desc.value, stack, resolve2) : NONE;
      if (child > answer)
        answer = child;
    }
    return answer;
  }, "shape");
  const merge2 = /* @__PURE__ */ __name((answer) => {
    if (answer > result)
      result = answer;
  }, "merge");
  const def = inst._zod.def;
  const kind = def.type;
  switch (kind) {
    case "object": {
      const raw = rawShape(def);
      merge2(raw ? shape(raw, true) : ASSUMED);
      check(def.catchall);
      break;
    }
    case "array":
      check(def.element);
      break;
    case "tuple":
      for (const el of def.items)
        check(el);
      check(def.rest);
      break;
    case "record":
    case "map":
      check(def.keyType);
      check(def.valueType);
      break;
    case "set":
      check(def.valueType);
      break;
    case "union":
      for (const el of def.options)
        check(el);
      break;
    case "intersection":
      check(def.left);
      check(def.right);
      break;
    case "optional":
    case "nullable":
    case "default":
    case "prefault":
    case "catch":
    case "readonly":
    case "nonoptional":
    case "promise":
    case "success":
      check(def.innerType);
      break;
    case "pipe":
      check(def.in);
      check(def.out);
      break;
    case "function":
      check(def.input);
      check(def.output);
      break;
    // `$ZodLazy` caches its inner on the def, so a resolved edge is followed exactly
    case "lazy": {
      const inner = def._cachedInner ?? (resolve2 ? inst._zod.innerType : void 0);
      merge2(inner ? isRecursive(inner, stack, false) : ASSUMED);
      break;
    }
    // a leaf by choice: `parts` are regex fragments, not data positions
    case "template_literal":
    // leaves
    case "string":
    case "number":
    case "int":
    case "boolean":
    case "bigint":
    case "symbol":
    case "undefined":
    case "null":
    case "void":
    case "never":
    case "any":
    case "unknown":
    case "date":
    case "nan":
    case "enum":
    case "literal":
    case "file":
    case "transform":
    case "custom":
      break;
    default: {
      kind;
      for (const key in def) {
        const desc = Object.getOwnPropertyDescriptor(def, key);
        if (!desc || desc.get)
          continue;
        const value = desc.value;
        if (!value || typeof value !== "object")
          continue;
        if (value._zod)
          check(value);
        else if (Array.isArray(value))
          for (const el of value)
            check(el);
      }
    }
  }
  stack.delete(inst);
  return settle(inst, result);
}
function settle(inst, answer) {
  if (answer !== ASSUMED)
    recursive.set(inst, answer === PROVEN);
  return answer;
}
function bucketFor(state, inst) {
  let bucket = state.buckets.get(inst);
  if (!bucket) {
    bucket = /* @__PURE__ */ new WeakMap();
    state.buckets.set(inst, bucket);
  }
  return bucket;
}
function memoizer() {
  return memo;
}
function isBackEdge(ctx, value) {
  const backEdges = ctx[STATE]?.backEdges;
  return backEdges !== void 0 && isRef(value) && backEdges.has(value);
}
var $ZodCyclicError, STATE, NO_ISSUES, recursive, NONE, ASSUMED, PROVEN, handoff, open, memo;
var init_memoizer = __esm({
  "node_modules/zod/v4/core/memoizer.js"() {
    init_util();
    $ZodCyclicError = class extends Error {
      static {
        __name(this, "$ZodCyclicError");
      }
      constructor() {
        super(`Cannot parse a reference cycle that closes through a transform`);
        this.name = "ZodCyclicError";
      }
    };
    STATE = "~memo";
    NO_ISSUES = [];
    __name(isRef, "isRef");
    __name(cloneIssues, "cloneIssues");
    recursive = /* @__PURE__ */ new WeakMap();
    NONE = 0;
    ASSUMED = 1;
    PROVEN = 2;
    __name(isRecursive, "isRecursive");
    __name(settle, "settle");
    __name(bucketFor, "bucketFor");
    open = [];
    memo = {
      alloc(_inst, payload, empty) {
        const bucket = handoff;
        if (!bucket)
          return empty;
        handoff = void 0;
        const entry = { value: empty, issues: null };
        bucket.set(payload.value, entry);
        open.push(entry);
        return empty;
      },
      guard(inst) {
        var _a25;
        (_a25 = inst._zod).deferred ?? (_a25.deferred = []);
        inst._zod.deferred.push(() => {
          const base = inst._zod.parse;
          const wrapped = /* @__PURE__ */ __name((payload, ctx) => {
            if (ctx.direction !== "backward" && isBackEdge(ctx, payload.value))
              throw new $ZodCyclicError();
            return base(payload, ctx);
          }, "wrapped");
          inst._zod.parse = wrapped;
          if (inst._zod.run === base)
            inst._zod.run = wrapped;
        });
      },
      attach(inst) {
        var _a25;
        let isRecursiveInst;
        let rechecked = false;
        let lastCtx;
        let lastBucket;
        (_a25 = inst._zod).deferred ?? (_a25.deferred = []);
        inst._zod.deferred.push(() => {
          const base = inst._zod.parse;
          const wrapped = /* @__PURE__ */ __name((payload, ctx) => {
            if (isRecursiveInst === void 0) {
              const walked = isRecursive(inst, /* @__PURE__ */ new Set(), false);
              if (walked === NONE) {
                inst._zod.parse = base;
                if (inst._zod.run === wrapped)
                  inst._zod.run = base;
                return base(payload, ctx);
              }
              if (walked === PROVEN || rechecked)
                isRecursiveInst = true;
              else
                rechecked = true;
            }
            const input = payload.value;
            if (!isRef(input))
              return base(payload, ctx);
            let state = ctx[STATE];
            if (!state) {
              state = { buckets: /* @__PURE__ */ new WeakMap(), backEdges: void 0 };
              ctx[STATE] = state;
            }
            let bucket;
            if (lastCtx === ctx) {
              bucket = lastBucket;
            } else {
              bucket = bucketFor(state, inst);
              lastCtx = ctx;
              lastBucket = bucket;
            }
            const hit = bucket.get(input);
            if (hit) {
              payload.value = hit.value;
              if (hit.issues) {
                if (hit.issues.length)
                  payload.issues.push(...cloneIssues(hit.issues));
              } else {
                payload.memo = true;
                state.backEdges ?? (state.backEdges = /* @__PURE__ */ new WeakSet());
                state.backEdges.add(hit.value);
              }
              return payload;
            }
            handoff = bucket;
            const depth = open.length;
            const result = base(payload, ctx);
            handoff = void 0;
            const entry = open.length > depth ? open.pop() : void 0;
            if (result instanceof Promise) {
              return result.then((r) => {
                if (entry)
                  entry.issues = r.issues.length ? cloneIssues(r.issues) : NO_ISSUES;
                return r;
              });
            }
            if (entry)
              entry.issues = result.issues.length ? cloneIssues(result.issues) : NO_ISSUES;
            return result;
          }, "wrapped");
          inst._zod.parse = wrapped;
          if (inst._zod.run === base)
            inst._zod.run = wrapped;
        });
      }
    };
    __name(memoizer, "memoizer");
    __name(isBackEdge, "isBackEdge");
  }
});

// node_modules/zod/v4/locales/en.js
function en_default() {
  return {
    localeError: error()
  };
}
var error;
var init_en = __esm({
  "node_modules/zod/v4/locales/en.js"() {
    init_util();
    error = /* @__PURE__ */ __name(() => {
      const Sizable = {
        string: { unit: "characters", verb: "to have" },
        file: { unit: "bytes", verb: "to have" },
        array: { unit: "items", verb: "to have" },
        set: { unit: "items", verb: "to have" },
        map: { unit: "entries", verb: "to have" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      __name(getSizing, "getSizing");
      const FormatDictionary = {
        regex: "input",
        email: "email address",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO datetime",
        date: "ISO date",
        time: "ISO time",
        duration: "ISO duration",
        ipv4: "IPv4 address",
        ipv6: "IPv6 address",
        mac: "MAC address",
        cidrv4: "IPv4 range",
        cidrv6: "IPv6 range",
        base64: "base64-encoded string",
        base64url: "base64url-encoded string",
        json_string: "JSON string",
        e164: "E.164 number",
        currency_code: "currency code",
        credit_card: "credit card number",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "input"
      };
      const TypeDictionary = {
        // Compatibility: "nan" -> "NaN" for display
        nan: "NaN"
        // All other type names omitted - they fall back to raw values via ?? operator
      };
      function getTypeName(type, input) {
        if (type === "number" && typeof input === "number" && !Number.isFinite(input)) {
          return String(input);
        }
        return TypeDictionary[type] ?? type;
      }
      __name(getTypeName, "getTypeName");
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type": {
            const expected = getTypeName(issue2.expected);
            const receivedType = parsedType(issue2.input);
            const received = getTypeName(receivedType, issue2.input);
            return `Invalid input: expected ${expected}, received ${received}`;
          }
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
            return `Invalid option: expected one of ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.exact ? "exactly " : issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `Too big: expected ${issue2.origin ?? "value"} to have ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
            return `Too big: expected ${issue2.origin ?? "value"} to be ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.exact ? "exactly " : issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Too small: expected ${issue2.origin} to have ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `Too small: expected ${issue2.origin} to be ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `Invalid string: must start with "${_issue.prefix}"`;
            }
            if (_issue.format === "ends_with")
              return `Invalid string: must end with "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `Invalid string: must include "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `Invalid string: must match pattern ${_issue.pattern}`;
            return `Invalid ${FormatDictionary[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `Invalid number: must be a multiple of ${issue2.divisor}`;
          case "unrecognized_keys":
            return `Unrecognized key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Invalid key in ${issue2.origin}`;
          case "invalid_union":
            if (issue2.options && Array.isArray(issue2.options) && issue2.options.length > 0) {
              const opts = issue2.options.map((o) => `'${o}'`).join(" | ");
              return `Invalid discriminator value. Expected ${opts}`;
            }
            if (issue2.inclusive === false) {
              return "Invalid input: more than one option matched";
            }
            return "Invalid input";
          case "invalid_element":
            return `Invalid value in ${issue2.origin}`;
          default:
            return `Invalid input`;
        }
      };
    }, "error");
    __name(en_default, "default");
  }
});

// node_modules/zod/v4/locales/index.js
var init_locales = __esm({
  "node_modules/zod/v4/locales/index.js"() {
  }
});

// node_modules/zod/v4/core/registries.js
function registry() {
  return new $ZodRegistry();
}
var _a18, $ZodRegistry, globalRegistry;
var init_registries = __esm({
  "node_modules/zod/v4/core/registries.js"() {
    $ZodRegistry = class {
      static {
        __name(this, "$ZodRegistry");
      }
      constructor() {
        this._map = /* @__PURE__ */ new WeakMap();
        this._idmap = /* @__PURE__ */ new Map();
      }
      add(schema, ..._meta) {
        const meta2 = _meta[0];
        this._map.set(schema, meta2);
        if (meta2 && typeof meta2 === "object" && "id" in meta2) {
          this._idmap.set(meta2.id, schema);
        }
        return this;
      }
      clear() {
        this._map = /* @__PURE__ */ new WeakMap();
        this._idmap = /* @__PURE__ */ new Map();
        return this;
      }
      remove(schema) {
        const meta2 = this._map.get(schema);
        if (meta2 && typeof meta2 === "object" && "id" in meta2) {
          this._idmap.delete(meta2.id);
        }
        this._map.delete(schema);
        return this;
      }
      get(schema) {
        const p = schema._zod.parent;
        if (p) {
          const pm = { ...this.get(p) ?? {} };
          delete pm.id;
          const f = { ...pm, ...this._map.get(schema) };
          return Object.keys(f).length ? f : void 0;
        }
        return this._map.get(schema);
      }
      has(schema) {
        return this._map.has(schema);
      }
    };
    __name(registry, "registry");
    (_a18 = globalThis).__zod_globalRegistry ?? (_a18.__zod_globalRegistry = registry());
    globalRegistry = globalThis.__zod_globalRegistry;
  }
});

// node_modules/zod/v4/core/compile.js
var init_compile = __esm({
  "node_modules/zod/v4/core/compile.js"() {
  }
});

// node_modules/zod/v4/core/api.js
function snapshotChecks(def) {
  if (def.checks)
    def.checks = [...def.checks];
  return def;
}
// @__NO_SIDE_EFFECTS__
function _string(Class2, params) {
  return new Class2(snapshotChecks({ type: "string", ...normalizeParams(params) }));
}
// @__NO_SIDE_EFFECTS__
function _email(Class2, params) {
  return new Class2({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _guid(Class2, params) {
  return new Class2({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv7(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _url(Class2, params) {
  return new Class2({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _emoji2(Class2, params) {
  return new Class2({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _nanoid(Class2, params) {
  return new Class2({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cuid2(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ulid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _xid(Class2, params) {
  return new Class2({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ksuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ipv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ipv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cidrv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cidrv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _base64(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _base64url(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _e164(Class2, params) {
  return new Class2({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _jwt(Class2, params) {
  return new Class2({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDateTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDate(Class2, params) {
  return new Class2({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDuration(Class2, params) {
  return new Class2({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _number(Class2, params) {
  return new Class2(snapshotChecks({ type: "number", checks: [], ...normalizeParams(params) }));
}
// @__NO_SIDE_EFFECTS__
function _int(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _boolean(Class2, params) {
  return new Class2({
    type: "boolean",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _null2(Class2, params) {
  return new Class2({
    type: "null",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _any(Class2) {
  return new Class2({
    type: "any"
  });
}
// @__NO_SIDE_EFFECTS__
function _unknown(Class2) {
  return new Class2({
    type: "unknown"
  });
}
// @__NO_SIDE_EFFECTS__
function _never(Class2, params) {
  return new Class2({
    type: "never",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
// @__NO_SIDE_EFFECTS__
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
// @__NO_SIDE_EFFECTS__
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
// @__NO_SIDE_EFFECTS__
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length
  });
}
// @__NO_SIDE_EFFECTS__
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}
// @__NO_SIDE_EFFECTS__
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _includes(includes, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes
  });
}
// @__NO_SIDE_EFFECTS__
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix
  });
}
// @__NO_SIDE_EFFECTS__
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix
  });
}
// @__NO_SIDE_EFFECTS__
function _properties(shape, params) {
  return new $ZodCheckProperties({
    check: "properties",
    shape,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
// @__NO_SIDE_EFFECTS__
function _normalize(form) {
  return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
}
// @__NO_SIDE_EFFECTS__
function _trim() {
  return /* @__PURE__ */ _overwrite((input) => input.trim());
}
// @__NO_SIDE_EFFECTS__
function _toLowerCase() {
  return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function _toUpperCase() {
  return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function _slugify() {
  return /* @__PURE__ */ _overwrite((input) => slugify(input));
}
// @__NO_SIDE_EFFECTS__
function _array(Class2, element, params) {
  return new Class2({
    type: "array",
    element,
    // get element() {
    //   return element;
    // },
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _custom(Class2, fn, _params) {
  const norm = normalizeParams(_params);
  norm.abort ?? (norm.abort = true);
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...norm
  });
  return schema;
}
// @__NO_SIDE_EFFECTS__
function _refine(Class2, fn, _params) {
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}
// @__NO_SIDE_EFFECTS__
function _superRefine(fn, params) {
  const ch = /* @__PURE__ */ _check((payload) => {
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(issue(issue2, payload.value, ch._zod.def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        if (!("input" in _issue))
          _issue.input = payload.value;
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  }, params);
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _check(fn, params) {
  const ch = new $ZodCheck({
    check: "custom",
    ...normalizeParams(params)
  });
  ch._zod.check = fn;
  return ch;
}
var init_api = __esm({
  "node_modules/zod/v4/core/api.js"() {
    init_checks();
    init_util();
    __name(snapshotChecks, "snapshotChecks");
    __name(_string, "_string");
    __name(_email, "_email");
    __name(_guid, "_guid");
    __name(_uuid, "_uuid");
    __name(_uuidv4, "_uuidv4");
    __name(_uuidv6, "_uuidv6");
    __name(_uuidv7, "_uuidv7");
    __name(_url, "_url");
    __name(_emoji2, "_emoji");
    __name(_nanoid, "_nanoid");
    __name(_cuid, "_cuid");
    __name(_cuid2, "_cuid2");
    __name(_ulid, "_ulid");
    __name(_xid, "_xid");
    __name(_ksuid, "_ksuid");
    __name(_ipv4, "_ipv4");
    __name(_ipv6, "_ipv6");
    __name(_cidrv4, "_cidrv4");
    __name(_cidrv6, "_cidrv6");
    __name(_base64, "_base64");
    __name(_base64url, "_base64url");
    __name(_e164, "_e164");
    __name(_jwt, "_jwt");
    __name(_isoDateTime, "_isoDateTime");
    __name(_isoDate, "_isoDate");
    __name(_isoTime, "_isoTime");
    __name(_isoDuration, "_isoDuration");
    __name(_number, "_number");
    __name(_int, "_int");
    __name(_boolean, "_boolean");
    __name(_null2, "_null");
    __name(_any, "_any");
    __name(_unknown, "_unknown");
    __name(_never, "_never");
    __name(_lt, "_lt");
    __name(_lte, "_lte");
    __name(_gt, "_gt");
    __name(_gte, "_gte");
    __name(_multipleOf, "_multipleOf");
    __name(_maxLength, "_maxLength");
    __name(_minLength, "_minLength");
    __name(_length, "_length");
    __name(_regex, "_regex");
    __name(_lowercase, "_lowercase");
    __name(_uppercase, "_uppercase");
    __name(_includes, "_includes");
    __name(_startsWith, "_startsWith");
    __name(_endsWith, "_endsWith");
    __name(_properties, "_properties");
    __name(_overwrite, "_overwrite");
    __name(_normalize, "_normalize");
    __name(_trim, "_trim");
    __name(_toLowerCase, "_toLowerCase");
    __name(_toUpperCase, "_toUpperCase");
    __name(_slugify, "_slugify");
    __name(_array, "_array");
    __name(_custom, "_custom");
    __name(_refine, "_refine");
    __name(_superRefine, "_superRefine");
    __name(_check, "_check");
  }
});

// node_modules/zod/v4/core/to-json-schema.js
function assignProps(target, ...sources) {
  for (const source of sources) {
    for (const key of Reflect.ownKeys(source)) {
      if (Object.prototype.propertyIsEnumerable.call(source, key)) {
        assignProp(target, key, source[key]);
      }
    }
  }
  return target;
}
function initializeContext(params) {
  let target = params?.target ?? "draft-2020-12";
  if (target === "draft-4")
    target = "draft-04";
  if (target === "draft-7")
    target = "draft-07";
  return {
    processors: params.processors ?? {},
    metadataRegistry: params?.metadata ?? globalRegistry,
    target,
    unrepresentable: params?.unrepresentable ?? "throw",
    override: params?.override ?? (() => {
    }),
    io: params?.io ?? "output",
    counter: 0,
    seen: /* @__PURE__ */ new Map(),
    sharedDefsExtractedFor: void 0,
    sharedEmitDoneFor: void 0,
    cycles: params?.cycles ?? "ref",
    reused: params?.reused ?? "inline",
    intersections: [],
    deferred: [],
    external: params?.external ?? void 0
  };
}
function handleUnrepresentable(schema, ctx, json3, params, message) {
  const result = typeof ctx.unrepresentable === "function" ? ctx.unrepresentable({ zodSchema: schema, path: params.path, message }) : ctx.unrepresentable;
  if (result === "any")
    return false;
  if (result === void 0 || result === "throw")
    throw new Error(message);
  Object.assign(json3, result);
  return true;
}
function processSchema(schema, ctx, _params = { path: [], schemaPath: [] }) {
  var _a25;
  const def = schema._zod.def;
  const seen = ctx.seen.get(schema);
  if (seen) {
    seen.count++;
    const isCycle = _params.schemaPath.includes(schema);
    if (isCycle) {
      seen.cycle = _params.path;
    }
    return seen.schema;
  }
  const result = { schema: {}, count: 1, cycle: void 0, path: _params.path };
  ctx.seen.set(schema, result);
  ctx.sharedDefsExtractedFor = void 0;
  ctx.sharedEmitDoneFor = void 0;
  const overrideSchema = schema._zod.toJSONSchema?.();
  if (overrideSchema) {
    result.schema = overrideSchema;
  } else {
    const params = {
      ..._params,
      schemaPath: [..._params.schemaPath, schema],
      path: _params.path
    };
    if (schema._zod.processJSONSchema) {
      schema._zod.processJSONSchema(ctx, result.schema, params);
    } else {
      const _json = result.schema;
      const processor = ctx.processors[def.type];
      if (!processor) {
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
      }
      processor(schema, ctx, _json, params);
    }
    const parent = schema._zod.parent;
    if (parent) {
      if (!result.ref)
        result.ref = parent;
      processSchema(parent, ctx, params);
      ctx.seen.get(parent).isParent = true;
    }
  }
  const meta2 = ctx.metadataRegistry.get(schema);
  if (meta2)
    assignProps(result.schema, meta2);
  if (ctx.io === "input" && isTransforming(schema)) {
    delete result.schema.examples;
    delete result.schema.default;
  }
  if (ctx.io === "input" && "_prefault" in result.schema)
    (_a25 = result.schema).default ?? (_a25.default = result.schema._prefault);
  delete result.schema._prefault;
  const _result = ctx.seen.get(schema);
  return _result.schema;
}
function encodeJSONPointerSegment(segment) {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}
function extractDefs(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  if (ctx.external && ctx.sharedDefsExtractedFor === ctx.external)
    return;
  const idToSchema = /* @__PURE__ */ new Map();
  for (const entry of ctx.seen.entries()) {
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      const existing = idToSchema.get(id);
      if (existing && existing !== entry[0]) {
        throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      }
      idToSchema.set(id, entry[0]);
    }
  }
  const makeURI = /* @__PURE__ */ __name((entry) => {
    const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
    if (ctx.external) {
      const externalId = ctx.external.registry.get(entry[0])?.id;
      const uriGenerator = ctx.external.uri ?? ((id2) => id2);
      if (externalId) {
        return { ref: uriGenerator(externalId) };
      }
      const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
      entry[1].defId = id;
      return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${encodeJSONPointerSegment(id)}` };
    }
    const uriPrefix = `#`;
    const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
    if (entry[1] === root && !entry[1].schema.id) {
      return { ref: uriPrefix };
    }
    const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
    return { defId, ref: defUriPrefix + encodeJSONPointerSegment(defId) };
  }, "makeURI");
  const extractToDef = /* @__PURE__ */ __name((entry) => {
    if (entry[1].schema.$ref) {
      return;
    }
    const seen = entry[1];
    const { ref, defId } = makeURI(entry);
    seen.def = { ...seen.schema };
    if (defId)
      seen.defId = defId;
    const schema2 = seen.schema;
    for (const key in schema2) {
      delete schema2[key];
    }
    schema2.$ref = ref;
  }, "extractToDef");
  if (ctx.cycles === "throw") {
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.cycle) {
        throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
      }
    }
  }
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (schema === entry[0]) {
      extractToDef(entry);
      continue;
    }
    if (ctx.external) {
      const ext = ctx.external.registry.get(entry[0])?.id;
      if (schema !== entry[0] && ext) {
        extractToDef(entry);
        continue;
      }
    }
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      extractToDef(entry);
      continue;
    }
    if (seen.cycle) {
      extractToDef(entry);
      continue;
    }
    if (seen.count > 1) {
      if (ctx.reused === "ref") {
        extractToDef(entry);
      }
    }
  }
  if (ctx.external)
    ctx.sharedDefsExtractedFor = ctx.external;
}
function compactTypeUnion(schema) {
  const options = schema.anyOf;
  if (!Array.isArray(options) || options.length === 0 || schema.type !== void 0)
    return;
  const types = [];
  for (const option of options) {
    if (!option || typeof option !== "object")
      return;
    compactTypeUnion(option);
    const keys = Object.keys(option);
    if (keys.length !== 1 || keys[0] !== "type")
      return;
    const type = option.type;
    for (const member of Array.isArray(type) ? type : [type]) {
      if (typeof member !== "string")
        return;
      if (!types.includes(member))
        types.push(member);
    }
  }
  delete schema.anyOf;
  schema.type = types.length === 1 ? types[0] : types;
}
function undeclaredConstraint(member) {
  const extra = member.additionalProperties;
  if (extra === void 0 || extra === false || typeof extra !== "object" || extra === null)
    return null;
  return Object.keys(extra).length ? extra : null;
}
function foldObjects(members2) {
  const objects = [];
  for (const member of members2) {
    if (typeof member !== "object" || member.type !== "object")
      return null;
    for (const key in member) {
      if (!FOLDABLE_KEYS.has(key))
        return null;
    }
    objects.push(member);
  }
  const properties = {};
  const required2 = /* @__PURE__ */ new Set();
  for (const object3 of objects) {
    for (const key in object3.properties) {
      if (Object.prototype.hasOwnProperty.call(properties, key))
        continue;
      const parts = [];
      for (const other of objects) {
        const part = other.properties?.[key] ?? undeclaredConstraint(other);
        if (part === null || part === void 0)
          continue;
        if (!parts.some((seen) => JSON.stringify(seen) === JSON.stringify(part)))
          parts.push(part);
      }
      const merged = parts.length === 1 ? parts[0] : foldObjects(parts) ?? { allOf: parts };
      assignProp(properties, key, merged);
    }
    for (const key of object3.required ?? [])
      required2.add(key);
  }
  const folded = { type: "object", properties };
  if (required2.size)
    folded.required = [...required2];
  if (objects.every((object3) => object3.additionalProperties === false)) {
    folded.additionalProperties = false;
  } else {
    const constraints = [];
    for (const object3 of objects) {
      const constraint = undeclaredConstraint(object3);
      if (constraint && !constraints.some((seen) => JSON.stringify(seen) === JSON.stringify(constraint)))
        constraints.push(constraint);
    }
    if (constraints.length === 1)
      folded.additionalProperties = constraints[0];
    else if (constraints.length > 1)
      folded.additionalProperties = { allOf: constraints };
  }
  return folded;
}
function foldIntersection(json3) {
  const allOf = json3.allOf;
  if (!Array.isArray(allOf) || allOf.length < 2)
    return;
  for (const key of FOLDABLE_KEYS)
    if (key in json3)
      return;
  const unions = allOf.filter((m) => UNION_KEYS.some((k) => Array.isArray(m[k])));
  let folded = null;
  if (!unions.length) {
    folded = foldObjects(allOf);
  } else {
    const union2 = unions[0];
    const keyword = UNION_KEYS.find((k) => Array.isArray(union2[k]));
    if (Object.keys(union2).length !== 1)
      return;
    const rest = allOf.filter((m) => m !== union2);
    const branches = union2[keyword].map((branch) => foldObjects([...rest, branch]));
    if (branches.some((b) => !b))
      return;
    folded = { [keyword]: branches };
  }
  if (!folded)
    return;
  delete json3.allOf;
  assignProps(json3, folded);
}
function finalize(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const flattenRef = /* @__PURE__ */ __name((zodSchema2) => {
    const seen = ctx.seen.get(zodSchema2);
    if (seen.ref === null)
      return;
    const schema2 = seen.def ?? seen.schema;
    const _cached = { ...schema2 };
    const ref = seen.ref;
    seen.ref = null;
    if (ref) {
      flattenRef(ref);
      const refSeen = ctx.seen.get(ref);
      const refSchema = refSeen.schema;
      if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
        schema2.allOf = schema2.allOf ?? [];
        schema2.allOf.push(refSchema);
      } else {
        assignProps(schema2, refSchema);
      }
      assignProps(schema2, _cached);
      const isParentRef = zodSchema2._zod.parent === ref;
      if (isParentRef) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (!(key in _cached)) {
            delete schema2[key];
          }
        }
      }
      if (refSchema.$ref && refSeen.def) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (key in refSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(refSeen.def[key])) {
            delete schema2[key];
          }
        }
      }
    }
    const parent = zodSchema2._zod.parent;
    if (parent && parent !== ref) {
      flattenRef(parent);
      const parentSeen = ctx.seen.get(parent);
      if (parentSeen?.schema.$ref) {
        schema2.$ref = parentSeen.schema.$ref;
        if (parentSeen.def) {
          for (const key in schema2) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (key in parentSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(parentSeen.def[key])) {
              delete schema2[key];
            }
          }
        }
      }
    }
    ctx.override({
      zodSchema: zodSchema2,
      jsonSchema: schema2,
      path: seen.path ?? []
    });
  }, "flattenRef");
  if (!ctx.external || ctx.sharedEmitDoneFor !== ctx.external) {
    for (const entry of [...ctx.seen.entries()].reverse()) {
      flattenRef(entry[0]);
    }
    if (ctx.target !== "openapi-3.0") {
      for (const entry of ctx.seen.entries()) {
        compactTypeUnion(entry[1].def ?? entry[1].schema);
      }
    }
    for (const rewrite of ctx.deferred)
      rewrite();
    if (ctx.intersections.length) {
      const carriers = /* @__PURE__ */ new Map();
      for (const seen of ctx.seen.values()) {
        for (const json3 of [seen.schema, seen.def]) {
          const allOf = json3?.allOf;
          if (!Array.isArray(allOf))
            continue;
          const existing = carriers.get(allOf);
          if (existing)
            existing.push(json3);
          else
            carriers.set(allOf, [json3]);
        }
      }
      for (const allOf of ctx.intersections) {
        for (const json3 of carriers.get(allOf) ?? [])
          foldIntersection(json3);
      }
    }
  }
  const result = {};
  if (ctx.target === "draft-2020-12") {
    result.$schema = "https://json-schema.org/draft/2020-12/schema";
  } else if (ctx.target === "draft-07") {
    result.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (ctx.target === "draft-04") {
    result.$schema = "http://json-schema.org/draft-04/schema#";
  } else if (ctx.target === "openapi-3.0") {
  } else {
  }
  if (ctx.external?.uri) {
    const id = ctx.external.registry.get(schema)?.id;
    if (!id)
      throw new Error("Schema is missing an `id` property");
    result.$id = ctx.external.uri(id);
  }
  assignProps(result, root.defId ? root.schema : root.def ?? root.schema);
  const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
  if (rootMetaId !== void 0 && result.id === rootMetaId)
    delete result.id;
  const defs = ctx.external?.defs ?? {};
  if (!ctx.external || ctx.sharedEmitDoneFor !== ctx.external) {
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.def && seen.defId) {
        if (seen.def.id === seen.defId)
          delete seen.def.id;
        assignProp(defs, seen.defId, seen.def);
      }
    }
  }
  if (ctx.external)
    ctx.sharedEmitDoneFor = ctx.external;
  if (ctx.external) {
  } else {
    if (Object.keys(defs).length > 0) {
      if (ctx.target === "draft-2020-12") {
        result.$defs = defs;
      } else {
        result.definitions = defs;
      }
    }
  }
  try {
    const finalized = JSON.parse(JSON.stringify(result));
    Object.defineProperty(finalized, "~standard", {
      value: {
        ...schema["~standard"],
        jsonSchema: {
          input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
          output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
        }
      },
      enumerable: false,
      writable: false
    });
    return finalized;
  } catch (_err) {
    throw new Error("Error converting schema to JSON.");
  }
}
function isTransforming(_schema, _ctx) {
  const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
  if (ctx.seen.has(_schema))
    return false;
  ctx.seen.add(_schema);
  const def = _schema._zod.def;
  if (def.type === "transform")
    return true;
  if (def.type === "array")
    return isTransforming(def.element, ctx);
  if (def.type === "set")
    return isTransforming(def.valueType, ctx);
  if (def.type === "lazy")
    return isTransforming(def.getter(), ctx);
  if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault" || def.type === "catch") {
    return isTransforming(def.innerType, ctx);
  }
  if (def.type === "intersection") {
    return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
  }
  if (def.type === "record" || def.type === "map") {
    return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
  }
  if (def.type === "pipe") {
    if (_schema._zod.traits.has("$ZodCodec"))
      return true;
    return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
  }
  if (def.type === "object") {
    for (const key in def.shape) {
      if (isTransforming(def.shape[key], ctx))
        return true;
    }
    return false;
  }
  if (def.type === "union") {
    for (const option of def.options) {
      if (isTransforming(option, ctx))
        return true;
    }
    return false;
  }
  if (def.type === "tuple") {
    for (const item of def.items) {
      if (isTransforming(item, ctx))
        return true;
    }
    if (def.rest && isTransforming(def.rest, ctx))
      return true;
    return false;
  }
  return false;
}
var FOLDABLE_KEYS, UNION_KEYS, createToJSONSchemaMethod, createStandardJSONSchemaMethod;
var init_to_json_schema = __esm({
  "node_modules/zod/v4/core/to-json-schema.js"() {
    init_registries();
    init_util();
    __name(assignProps, "assignProps");
    __name(initializeContext, "initializeContext");
    __name(handleUnrepresentable, "handleUnrepresentable");
    __name(processSchema, "processSchema");
    __name(encodeJSONPointerSegment, "encodeJSONPointerSegment");
    __name(extractDefs, "extractDefs");
    __name(compactTypeUnion, "compactTypeUnion");
    FOLDABLE_KEYS = /* @__PURE__ */ new Set(["type", "properties", "required", "additionalProperties"]);
    UNION_KEYS = ["oneOf", "anyOf"];
    __name(undeclaredConstraint, "undeclaredConstraint");
    __name(foldObjects, "foldObjects");
    __name(foldIntersection, "foldIntersection");
    __name(finalize, "finalize");
    __name(isTransforming, "isTransforming");
    createToJSONSchemaMethod = /* @__PURE__ */ __name((schema, processors = {}) => (params) => {
      const ctx = initializeContext({ ...params, processors });
      processSchema(schema, ctx);
      extractDefs(ctx, schema);
      return finalize(ctx, schema);
    }, "createToJSONSchemaMethod");
    createStandardJSONSchemaMethod = /* @__PURE__ */ __name((schema, io, processors = {}) => (params) => {
      const { libraryOptions, target } = params ?? {};
      const ctx = initializeContext({ ...libraryOptions ?? {}, target, io, processors });
      processSchema(schema, ctx);
      extractDefs(ctx, schema);
      return finalize(ctx, schema);
    }, "createStandardJSONSchemaMethod");
  }
});

// node_modules/zod/v4/core/json-schema-processors.js
function aggregateChecks(schema) {
  const agg = {};
  const def = schema._zod.def;
  const list = schema._zod.traits.has("$ZodCheck") ? [schema, ...def.checks ?? []] : def.checks ?? [];
  for (const ch of list)
    contributors[ch._zod.def.check]?.(agg, ch._zod.def);
  const bag = schema._zod.bag;
  if (bag.minimum !== void 0)
    narrowMin(agg, "minimum", bag.minimum);
  if (bag.exclusiveMinimum !== void 0)
    narrowMin(agg, "exclusiveMinimum", bag.exclusiveMinimum);
  if (bag.maximum !== void 0)
    narrowMax(agg, "maximum", bag.maximum);
  if (bag.exclusiveMaximum !== void 0)
    narrowMax(agg, "exclusiveMaximum", bag.exclusiveMaximum);
  if (bag.multipleOf !== void 0)
    addDivisor(agg, bag.multipleOf);
  if (bag.format !== void 0) {
    agg.format ?? (agg.format = bag.format);
    if (bag.format.includes("int"))
      agg.isInt = true;
  }
  if (bag.mime)
    intersectMime(agg, bag.mime);
  for (const pattern of bag.patterns ?? [])
    addPattern(agg, pattern);
  return agg;
}
function inputOptin(schema) {
  const def = schema._zod.def;
  if (def.type === "pipe" && def.in._zod.traits.has("$ZodTransform")) {
    return inputOptin(def.out);
  }
  if (def.type === "catch") {
    return inputOptin(def.innerType);
  }
  return schema._zod.optin;
}
function stringifyKeyNames(bySchema, json3, visited) {
  if (json3.$ref) {
    if (visited.has(json3))
      return json3;
    visited.add(json3);
    const def = bySchema.get(json3)?.def;
    if (!def)
      return json3;
    const inlined = stringifyKeyNames(bySchema, def, visited);
    return inlined === def ? json3 : inlined;
  }
  for (const keyword of ["anyOf", "oneOf"]) {
    const branches = json3[keyword];
    if (!Array.isArray(branches))
      continue;
    const mapped = branches.map((branch) => stringifyKeyNames(bySchema, branch, visited));
    if (mapped.some((branch, i) => branch !== branches[i]))
      json3 = { ...json3, [keyword]: mapped };
  }
  const types = Array.isArray(json3.type) ? json3.type : [json3.type];
  const numericType = !types.includes("string") && types.some((t) => t === "number" || t === "integer");
  const values = json3.enum ?? (json3.const !== void 0 ? [json3.const] : void 0);
  if (!numericType && !values?.some((v) => typeof v === "number"))
    return json3;
  const { minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf, format, id, ...rest } = json3;
  if (rest.enum)
    rest.enum = rest.enum.map((v) => typeof v === "number" ? String(v) : v);
  else if (typeof rest.const === "number")
    rest.const = String(rest.const);
  if (!numericType)
    return rest;
  rest.type = "string";
  if (!values)
    rest.pattern = (types.includes("number") ? number : integer).source;
  return rest;
}
function rewriteKeyNames(ctx) {
  const bySchema = /* @__PURE__ */ new Map();
  for (const entry of ctx.seen.values()) {
    if (entry.def && !bySchema.has(entry.schema))
      bySchema.set(entry.schema, entry);
  }
  const rewrites = /* @__PURE__ */ new Map();
  for (const record2 of pendingRecords.get(ctx) ?? []) {
    const seen = ctx.seen.get(record2);
    const names = (seen?.def ?? seen?.schema)?.propertyNames;
    if (!names || names === true || rewrites.has(names))
      continue;
    const rewritten = stringifyKeyNames(bySchema, names, /* @__PURE__ */ new Set());
    if (rewritten !== names)
      rewrites.set(names, rewritten);
  }
  if (!rewrites.size)
    return;
  for (const entry of ctx.seen.values()) {
    for (const carrier of [entry.schema, entry.def]) {
      const rewritten = carrier && rewrites.get(carrier.propertyNames);
      if (rewritten)
        carrier.propertyNames = rewritten;
    }
  }
}
function serializeDefaultValue(value, schema, ctx, json3, params) {
  let unrepresentable = false;
  const serialized = JSON.stringify(value, (_, val) => {
    if (typeof val !== "bigint")
      return val;
    unrepresentable = true;
    return null;
  });
  if (!unrepresentable)
    return JSON.parse(serialized);
  handleUnrepresentable(schema, ctx, json3, params, "BigInt defaults cannot be represented in JSON Schema");
  return UNREPRESENTABLE_DEFAULT;
}
function toJSONSchema(input, params) {
  if ("_idmap" in input) {
    const registry2 = input;
    const ctx2 = initializeContext({ ...params, processors: allProcessors });
    const defs = {};
    for (const entry of registry2._idmap.entries()) {
      const [_, schema] = entry;
      processSchema(schema, ctx2);
    }
    const schemas = {};
    const external = {
      registry: registry2,
      uri: params?.uri,
      defs
    };
    ctx2.external = external;
    for (const entry of registry2._idmap.entries()) {
      const [key, schema] = entry;
      extractDefs(ctx2, schema);
      assignProp(schemas, key, finalize(ctx2, schema));
    }
    if (Object.keys(defs).length > 0) {
      const defsSegment = ctx2.target === "draft-2020-12" ? "$defs" : "definitions";
      schemas.__shared = {
        [defsSegment]: defs
      };
    }
    return { schemas };
  }
  const ctx = initializeContext({ ...params, processors: allProcessors });
  processSchema(input, ctx);
  extractDefs(ctx, input);
  return finalize(ctx, input);
}
var narrowMin, narrowMax, narrowBoth, addDivisor, addPattern, intersectMime, setFormat, minContributor, maxContributor, formatContributor, contributors, formatMap, exactPatterns, exactPattern, stringProcessor, numberProcessor, booleanProcessor, bigintProcessor, symbolProcessor, nullProcessor, undefinedProcessor, voidProcessor, neverProcessor, anyProcessor, unknownProcessor, dateProcessor, enumProcessor, literalProcessor, nanProcessor, templateLiteralProcessor, fileProcessor, successProcessor, customProcessor, functionProcessor, transformProcessor, mapProcessor, setProcessor, arrayProcessor, objectProcessor, unionProcessor, intersectionProcessor, tupleProcessor, pendingRecords, recordProcessor, nullableProcessor, nonoptionalProcessor, UNREPRESENTABLE_DEFAULT, defaultProcessor, prefaultProcessor, catchProcessor, pipeProcessor, readonlyProcessor, promiseProcessor, optionalProcessor, lazyProcessor, allProcessors;
var init_json_schema_processors = __esm({
  "node_modules/zod/v4/core/json-schema-processors.js"() {
    init_regexes();
    init_schemas();
    init_to_json_schema();
    init_util();
    narrowMin = /* @__PURE__ */ __name((agg, key, value) => {
      if (agg[key] === void 0 || value > agg[key])
        agg[key] = value;
    }, "narrowMin");
    narrowMax = /* @__PURE__ */ __name((agg, key, value) => {
      if (agg[key] === void 0 || value < agg[key])
        agg[key] = value;
    }, "narrowMax");
    narrowBoth = /* @__PURE__ */ __name((agg, value) => {
      narrowMin(agg, "minimum", value);
      narrowMax(agg, "maximum", value);
    }, "narrowBoth");
    addDivisor = /* @__PURE__ */ __name((agg, value) => {
      agg.multipleOf ?? (agg.multipleOf = []);
      if (!agg.multipleOf.includes(value))
        agg.multipleOf.push(value);
    }, "addDivisor");
    addPattern = /* @__PURE__ */ __name((agg, pattern) => {
      agg.patterns ?? (agg.patterns = /* @__PURE__ */ new Set());
      agg.patterns.add(pattern);
    }, "addPattern");
    intersectMime = /* @__PURE__ */ __name((agg, mime) => {
      agg.mime = agg.mime ? agg.mime.filter((m) => mime.includes(m)) : [...mime];
    }, "intersectMime");
    setFormat = /* @__PURE__ */ __name((agg, format) => {
      agg.format = format;
      if (format.includes("int"))
        agg.isInt = true;
    }, "setFormat");
    minContributor = /* @__PURE__ */ __name((agg, def) => narrowMin(agg, "minimum", def.minimum), "minContributor");
    maxContributor = /* @__PURE__ */ __name((agg, def) => narrowMax(agg, "maximum", def.maximum), "maxContributor");
    formatContributor = /* @__PURE__ */ __name((ranges) => (agg, def) => {
      setFormat(agg, def.format);
      const [minimum, maximum] = ranges[def.format];
      narrowMin(agg, "minimum", minimum);
      narrowMax(agg, "maximum", maximum);
    }, "formatContributor");
    contributors = {
      greater_than: /* @__PURE__ */ __name((agg, def) => narrowMin(agg, def.inclusive ? "minimum" : "exclusiveMinimum", def.value), "greater_than"),
      less_than: /* @__PURE__ */ __name((agg, def) => narrowMax(agg, def.inclusive ? "maximum" : "exclusiveMaximum", def.value), "less_than"),
      multiple_of: /* @__PURE__ */ __name((agg, def) => addDivisor(agg, def.value), "multiple_of"),
      number_format: formatContributor(NUMBER_FORMAT_RANGES),
      bigint_format: formatContributor(BIGINT_FORMAT_RANGES),
      min_length: minContributor,
      max_length: maxContributor,
      length_equals: /* @__PURE__ */ __name((agg, def) => narrowBoth(agg, def.length), "length_equals"),
      min_size: minContributor,
      max_size: maxContributor,
      size_equals: /* @__PURE__ */ __name((agg, def) => narrowBoth(agg, def.size), "size_equals"),
      string_format: /* @__PURE__ */ __name((agg, def) => {
        setFormat(agg, def.format);
        if (def.pattern)
          addPattern(agg, def.pattern);
        if (def.format === "base64" || def.format === "base64url")
          agg.contentEncoding = def.format;
        if (def.local || def.precision === -1)
          agg.laxFormat = true;
      }, "string_format"),
      mime_type: /* @__PURE__ */ __name((agg, def) => intersectMime(agg, def.mime), "mime_type")
    };
    __name(aggregateChecks, "aggregateChecks");
    formatMap = {
      guid: "uuid",
      url: "uri",
      datetime: "date-time",
      json_string: "json-string",
      regex: ""
      // do not set
    };
    exactPatterns = /* @__PURE__ */ new Map([
      [base64Charset, base64],
      [base64urlCharset, base64url]
    ]);
    exactPattern = /* @__PURE__ */ __name((p) => exactPatterns.get(p) ?? p, "exactPattern");
    stringProcessor = /* @__PURE__ */ __name((schema, ctx, _json, _params) => {
      const json3 = _json;
      json3.type = "string";
      const { minimum, maximum, format, patterns, contentEncoding, laxFormat } = aggregateChecks(schema);
      if (typeof minimum === "number")
        json3.minLength = minimum;
      if (typeof maximum === "number")
        json3.maxLength = maximum;
      if (format) {
        json3.format = formatMap[format] ?? format;
        if (json3.format === "")
          delete json3.format;
        if (format === "time" || laxFormat) {
          delete json3.format;
        }
      }
      if (contentEncoding)
        json3.contentEncoding = contentEncoding;
      if (patterns && patterns.size > 0) {
        const patternList = [...patterns].map(exactPattern);
        if (patternList.length === 1)
          json3.pattern = patternList[0].source;
        else if (patternList.length > 1) {
          json3.allOf = [
            ...patternList.map((regex) => ({
              ...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
              pattern: regex.source
            }))
          ];
        }
      }
    }, "stringProcessor");
    numberProcessor = /* @__PURE__ */ __name((schema, ctx, _json, params) => {
      const json3 = _json;
      const { minimum, maximum, multipleOf, exclusiveMaximum, exclusiveMinimum, isInt } = aggregateChecks(schema);
      json3.type = isInt ? "integer" : "number";
      const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
      const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
      const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
      if (exMin) {
        if (legacy) {
          json3.minimum = exclusiveMinimum;
          json3.exclusiveMinimum = true;
        } else {
          json3.exclusiveMinimum = exclusiveMinimum;
        }
      } else if (typeof minimum === "number") {
        json3.minimum = minimum;
      }
      if (exMax) {
        if (legacy) {
          json3.maximum = exclusiveMaximum;
          json3.exclusiveMaximum = true;
        } else {
          json3.exclusiveMaximum = exclusiveMaximum;
        }
      } else if (typeof maximum === "number") {
        json3.maximum = maximum;
      }
      if (multipleOf) {
        const divisors = /* @__PURE__ */ new Set();
        for (const divisor of multipleOf) {
          if (Number.isFinite(divisor) && divisor !== 0)
            divisors.add(Math.abs(divisor));
          else
            handleUnrepresentable(schema, ctx, json3, params, `A multipleOf divisor of ${divisor} cannot be represented in JSON Schema`);
        }
        const [first, ...rest] = divisors;
        if (first !== void 0)
          json3.multipleOf = first;
        if (rest.length)
          json3.allOf = [...json3.allOf ?? [], ...rest.map((m) => ({ multipleOf: m }))];
      }
    }, "numberProcessor");
    booleanProcessor = /* @__PURE__ */ __name((_schema, _ctx, json3, _params) => {
      json3.type = "boolean";
    }, "booleanProcessor");
    bigintProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      handleUnrepresentable(schema, ctx, json3, params, "BigInt cannot be represented in JSON Schema");
    }, "bigintProcessor");
    symbolProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      handleUnrepresentable(schema, ctx, json3, params, "Symbols cannot be represented in JSON Schema");
    }, "symbolProcessor");
    nullProcessor = /* @__PURE__ */ __name((_schema, ctx, json3, _params) => {
      if (ctx.target === "openapi-3.0") {
        json3.type = "string";
        json3.nullable = true;
        json3.enum = [null];
      } else {
        json3.type = "null";
      }
    }, "nullProcessor");
    undefinedProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      handleUnrepresentable(schema, ctx, json3, params, "Undefined cannot be represented in JSON Schema");
    }, "undefinedProcessor");
    voidProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      handleUnrepresentable(schema, ctx, json3, params, "Void cannot be represented in JSON Schema");
    }, "voidProcessor");
    neverProcessor = /* @__PURE__ */ __name((_schema, _ctx, json3, _params) => {
      json3.not = {};
    }, "neverProcessor");
    anyProcessor = /* @__PURE__ */ __name((_schema, _ctx, _json, _params) => {
    }, "anyProcessor");
    unknownProcessor = /* @__PURE__ */ __name((_schema, _ctx, _json, _params) => {
    }, "unknownProcessor");
    dateProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      handleUnrepresentable(schema, ctx, json3, params, "Date cannot be represented in JSON Schema");
    }, "dateProcessor");
    enumProcessor = /* @__PURE__ */ __name((schema, _ctx, json3, _params) => {
      const def = schema._zod.def;
      const values = getEnumValues(def.entries);
      if (values.length === 0) {
        json3.not = {};
        return;
      }
      if (values.every((v) => typeof v === "number"))
        json3.type = "number";
      if (values.every((v) => typeof v === "string"))
        json3.type = "string";
      json3.enum = values;
    }, "enumProcessor");
    literalProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      const def = schema._zod.def;
      if (def.values.length === 0) {
        json3.not = {};
        return;
      }
      const vals = [];
      for (const val of def.values) {
        if (val === void 0) {
          if (handleUnrepresentable(schema, ctx, json3, params, "Literal `undefined` cannot be represented in JSON Schema"))
            return;
        } else if (typeof val === "bigint") {
          if (handleUnrepresentable(schema, ctx, json3, params, "BigInt literals cannot be represented in JSON Schema"))
            return;
          vals.push(Number(val));
        } else {
          vals.push(val);
        }
      }
      if (vals.length === 0) {
      } else if (vals.length === 1) {
        const val = vals[0];
        json3.type = val === null ? "null" : typeof val;
        if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
          json3.enum = [val];
        } else {
          json3.const = val;
        }
      } else {
        if (vals.every((v) => typeof v === "number"))
          json3.type = "number";
        if (vals.every((v) => typeof v === "string"))
          json3.type = "string";
        if (vals.every((v) => typeof v === "boolean"))
          json3.type = "boolean";
        if (vals.every((v) => v === null))
          json3.type = "null";
        json3.enum = vals;
      }
    }, "literalProcessor");
    nanProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      handleUnrepresentable(schema, ctx, json3, params, "NaN cannot be represented in JSON Schema");
    }, "nanProcessor");
    templateLiteralProcessor = /* @__PURE__ */ __name((schema, _ctx, json3, _params) => {
      const _json = json3;
      const pattern = schema._zod.pattern;
      if (!pattern)
        throw new Error("Pattern not found in template literal");
      _json.type = "string";
      _json.pattern = pattern.source;
    }, "templateLiteralProcessor");
    fileProcessor = /* @__PURE__ */ __name((schema, _ctx, json3, _params) => {
      const _json = json3;
      _json.type = "string";
      _json.format = "binary";
      _json.contentEncoding = "binary";
      const { minimum, maximum, mime } = aggregateChecks(schema);
      if (minimum !== void 0)
        _json.minLength = minimum;
      if (maximum !== void 0)
        _json.maxLength = maximum;
      if (!mime)
        return;
      if (mime.length === 0)
        _json.not = {};
      else if (mime.length === 1)
        _json.contentMediaType = mime[0];
      else
        _json.anyOf = mime.map((m) => ({ contentMediaType: m }));
    }, "fileProcessor");
    successProcessor = /* @__PURE__ */ __name((_schema, _ctx, json3, _params) => {
      json3.type = "boolean";
    }, "successProcessor");
    customProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      handleUnrepresentable(schema, ctx, json3, params, "Custom types cannot be represented in JSON Schema");
    }, "customProcessor");
    functionProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      handleUnrepresentable(schema, ctx, json3, params, "Function types cannot be represented in JSON Schema");
    }, "functionProcessor");
    transformProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      handleUnrepresentable(schema, ctx, json3, params, "Transforms cannot be represented in JSON Schema");
    }, "transformProcessor");
    mapProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      handleUnrepresentable(schema, ctx, json3, params, "Map cannot be represented in JSON Schema");
    }, "mapProcessor");
    setProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      handleUnrepresentable(schema, ctx, json3, params, "Set cannot be represented in JSON Schema");
    }, "setProcessor");
    arrayProcessor = /* @__PURE__ */ __name((schema, ctx, _json, params) => {
      const json3 = _json;
      const def = schema._zod.def;
      const { minimum, maximum } = aggregateChecks(schema);
      if (typeof minimum === "number")
        json3.minItems = minimum;
      if (typeof maximum === "number")
        json3.maxItems = maximum;
      json3.type = "array";
      json3.items = processSchema(def.element, ctx, {
        ...params,
        path: [...params.path, "items"]
      });
    }, "arrayProcessor");
    __name(inputOptin, "inputOptin");
    objectProcessor = /* @__PURE__ */ __name((schema, ctx, _json, params) => {
      const json3 = _json;
      const def = schema._zod.def;
      const shape = def.shape;
      const symbolKeys = Object.getOwnPropertySymbols(shape);
      if (symbolKeys.length && handleUnrepresentable(schema, ctx, json3, params, "Symbol keys cannot be represented in JSON Schema")) {
        return;
      }
      json3.type = "object";
      json3.properties = {};
      for (const key in shape) {
        assignProp(json3.properties, key, processSchema(shape[key], ctx, {
          ...params,
          path: [...params.path, "properties", key]
        }));
      }
      const requiredKeys = [];
      for (const key of Object.keys(shape)) {
        const field = def.shape[key];
        if (ctx.io === "input" ? inputOptin(field) === void 0 : field._zod.optout === void 0) {
          requiredKeys.push(key);
        }
      }
      if (requiredKeys.length > 0) {
        json3.required = requiredKeys;
      }
      if (def.catchall?._zod.def.type === "never") {
        json3.additionalProperties = false;
      } else if (!def.catchall) {
        if (ctx.io === "output")
          json3.additionalProperties = false;
      } else if (def.catchall) {
        json3.additionalProperties = processSchema(def.catchall, ctx, {
          ...params,
          path: [...params.path, "additionalProperties"]
        });
      }
    }, "objectProcessor");
    unionProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      const def = schema._zod.def;
      const isExclusive = def.inclusive === false;
      const options = def.options.map((x, i) => processSchema(x, ctx, {
        ...params,
        path: [...params.path, isExclusive ? "oneOf" : "anyOf", i]
      }));
      if (isExclusive) {
        json3.oneOf = options;
      } else {
        json3.anyOf = options;
      }
    }, "unionProcessor");
    intersectionProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      const def = schema._zod.def;
      const a = processSchema(def.left, ctx, {
        ...params,
        path: [...params.path, "allOf", 0]
      });
      const b = processSchema(def.right, ctx, {
        ...params,
        path: [...params.path, "allOf", 1]
      });
      const isSimpleIntersection = /* @__PURE__ */ __name((val) => "allOf" in val && Object.keys(val).length === 1, "isSimpleIntersection");
      const allOf = [
        ...isSimpleIntersection(a) ? a.allOf : [a],
        ...isSimpleIntersection(b) ? b.allOf : [b]
      ];
      json3.allOf = allOf;
      ctx.intersections.push(allOf);
    }, "intersectionProcessor");
    tupleProcessor = /* @__PURE__ */ __name((schema, ctx, _json, params) => {
      const json3 = _json;
      const def = schema._zod.def;
      json3.type = "array";
      const prefixPath = ctx.target === "draft-2020-12" ? "prefixItems" : "items";
      const restPath = ctx.target === "draft-2020-12" ? "items" : ctx.target === "openapi-3.0" ? "items" : "additionalItems";
      const prefixItems = def.items.map((x, i) => processSchema(x, ctx, {
        ...params,
        path: [...params.path, prefixPath, i]
      }));
      const rest = def.rest ? processSchema(def.rest, ctx, {
        ...params,
        path: [...params.path, restPath, ...ctx.target === "openapi-3.0" ? [def.items.length] : []]
      }) : null;
      let minItems = def.items.length;
      while (minItems > 0) {
        const item = def.items[minItems - 1];
        const optional2 = ctx.io === "input" ? inputOptin(item) !== void 0 : item._zod.optout === "optional";
        if (!optional2)
          break;
        minItems--;
      }
      const maxItems = def.items.length;
      const isClosed = !def.rest;
      if (ctx.target === "draft-2020-12") {
        json3.prefixItems = prefixItems;
        if (isClosed) {
          json3.items = false;
        } else if (rest) {
          json3.items = rest;
        }
        if (minItems > 0)
          json3.minItems = minItems;
        if (isClosed)
          json3.maxItems = maxItems;
      } else if (ctx.target === "openapi-3.0") {
        json3.items = {
          anyOf: prefixItems
        };
        if (rest) {
          json3.items.anyOf.push(rest);
        }
        if (minItems > 0)
          json3.minItems = minItems;
        if (isClosed)
          json3.maxItems = maxItems;
      } else {
        json3.items = prefixItems;
        if (isClosed) {
          json3.additionalItems = false;
        } else if (rest) {
          json3.additionalItems = rest;
        }
        if (minItems > 0)
          json3.minItems = minItems;
        if (isClosed)
          json3.maxItems = maxItems;
      }
      const { minimum, maximum } = aggregateChecks(schema);
      if (typeof minimum === "number")
        json3.minItems = minimum;
      if (typeof maximum === "number")
        json3.maxItems = maximum;
    }, "tupleProcessor");
    __name(stringifyKeyNames, "stringifyKeyNames");
    pendingRecords = /* @__PURE__ */ new WeakMap();
    __name(rewriteKeyNames, "rewriteKeyNames");
    recordProcessor = /* @__PURE__ */ __name((schema, ctx, _json, params) => {
      const json3 = _json;
      const def = schema._zod.def;
      json3.type = "object";
      const keyType = def.keyType;
      const patterns = aggregateChecks(keyType).patterns;
      if (def.mode === "loose" && patterns && patterns.size > 0) {
        const valueSchema = processSchema(def.valueType, ctx, {
          ...params,
          path: [...params.path, "patternProperties", "*"]
        });
        json3.patternProperties = {};
        for (const pattern of patterns) {
          assignProp(json3.patternProperties, exactPattern(pattern).source, valueSchema);
        }
      } else {
        if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
          json3.propertyNames = processSchema(def.keyType, ctx, {
            ...params,
            path: [...params.path, "propertyNames"]
          });
          let pending = pendingRecords.get(ctx);
          if (!pending) {
            pending = [];
            pendingRecords.set(ctx, pending);
            ctx.deferred.push(() => rewriteKeyNames(ctx));
          }
          pending.push(schema);
        }
        json3.additionalProperties = processSchema(def.valueType, ctx, {
          ...params,
          path: [...params.path, "additionalProperties"]
        });
      }
      const keyValues = keyType._zod.values;
      const omittableOnInput = ctx.io === "input" && inputOptin(def.valueType) !== void 0;
      if (keyValues && !def.partial && !omittableOnInput) {
        const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
        if (validKeyValues.length > 0) {
          json3.required = validKeyValues.map(String);
        }
      }
    }, "recordProcessor");
    nullableProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      const def = schema._zod.def;
      const inner = processSchema(def.innerType, ctx, params);
      const seen = ctx.seen.get(schema);
      if (ctx.target === "openapi-3.0") {
        seen.ref = def.innerType;
        json3.nullable = true;
      } else {
        json3.anyOf = [inner, { type: "null" }];
      }
    }, "nullableProcessor");
    nonoptionalProcessor = /* @__PURE__ */ __name((schema, ctx, _json, params) => {
      const def = schema._zod.def;
      processSchema(def.innerType, ctx, params);
      const seen = ctx.seen.get(schema);
      seen.ref = def.innerType;
    }, "nonoptionalProcessor");
    UNREPRESENTABLE_DEFAULT = /* @__PURE__ */ Symbol();
    __name(serializeDefaultValue, "serializeDefaultValue");
    defaultProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      const def = schema._zod.def;
      processSchema(def.innerType, ctx, params);
      const seen = ctx.seen.get(schema);
      seen.ref = def.innerType;
      const value = serializeDefaultValue(def.defaultValue, schema, ctx, json3, params);
      if (value !== UNREPRESENTABLE_DEFAULT)
        json3.default = value;
    }, "defaultProcessor");
    prefaultProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      const def = schema._zod.def;
      processSchema(def.innerType, ctx, params);
      const seen = ctx.seen.get(schema);
      seen.ref = def.innerType;
      if (ctx.io !== "input")
        return;
      const value = serializeDefaultValue(def.defaultValue, schema, ctx, json3, params);
      if (value !== UNREPRESENTABLE_DEFAULT)
        json3._prefault = value;
    }, "prefaultProcessor");
    catchProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      const def = schema._zod.def;
      processSchema(def.innerType, ctx, params);
      const seen = ctx.seen.get(schema);
      seen.ref = def.innerType;
      let catchValue;
      try {
        catchValue = def.catchValue(void 0);
      } catch {
        handleUnrepresentable(schema, ctx, json3, params, "Dynamic catch values are not supported in JSON Schema");
        return;
      }
      json3.default = catchValue;
    }, "catchProcessor");
    pipeProcessor = /* @__PURE__ */ __name((schema, ctx, _json, params) => {
      const def = schema._zod.def;
      const inIsTransform = def.in._zod.traits.has("$ZodTransform");
      const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
      processSchema(innerType, ctx, params);
      const seen = ctx.seen.get(schema);
      seen.ref = innerType;
    }, "pipeProcessor");
    readonlyProcessor = /* @__PURE__ */ __name((schema, ctx, json3, params) => {
      const def = schema._zod.def;
      processSchema(def.innerType, ctx, params);
      const seen = ctx.seen.get(schema);
      seen.ref = def.innerType;
      json3.readOnly = true;
    }, "readonlyProcessor");
    promiseProcessor = /* @__PURE__ */ __name((schema, ctx, _json, params) => {
      const def = schema._zod.def;
      processSchema(def.innerType, ctx, params);
      const seen = ctx.seen.get(schema);
      seen.ref = def.innerType;
    }, "promiseProcessor");
    optionalProcessor = /* @__PURE__ */ __name((schema, ctx, _json, params) => {
      const def = schema._zod.def;
      processSchema(def.innerType, ctx, params);
      const seen = ctx.seen.get(schema);
      seen.ref = def.innerType;
    }, "optionalProcessor");
    lazyProcessor = /* @__PURE__ */ __name((schema, ctx, _json, params) => {
      const innerType = schema._zod.innerType;
      processSchema(innerType, ctx, params);
      const seen = ctx.seen.get(schema);
      seen.ref = innerType;
    }, "lazyProcessor");
    allProcessors = {
      string: stringProcessor,
      number: numberProcessor,
      boolean: booleanProcessor,
      bigint: bigintProcessor,
      symbol: symbolProcessor,
      null: nullProcessor,
      undefined: undefinedProcessor,
      void: voidProcessor,
      never: neverProcessor,
      any: anyProcessor,
      unknown: unknownProcessor,
      date: dateProcessor,
      enum: enumProcessor,
      literal: literalProcessor,
      nan: nanProcessor,
      template_literal: templateLiteralProcessor,
      file: fileProcessor,
      success: successProcessor,
      custom: customProcessor,
      function: functionProcessor,
      transform: transformProcessor,
      map: mapProcessor,
      set: setProcessor,
      array: arrayProcessor,
      object: objectProcessor,
      union: unionProcessor,
      intersection: intersectionProcessor,
      tuple: tupleProcessor,
      record: recordProcessor,
      nullable: nullableProcessor,
      nonoptional: nonoptionalProcessor,
      default: defaultProcessor,
      prefault: prefaultProcessor,
      catch: catchProcessor,
      pipe: pipeProcessor,
      readonly: readonlyProcessor,
      promise: promiseProcessor,
      optional: optionalProcessor,
      lazy: lazyProcessor
    };
    __name(toJSONSchema, "toJSONSchema");
  }
});

// node_modules/zod/v4/core/json-schema.js
var init_json_schema = __esm({
  "node_modules/zod/v4/core/json-schema.js"() {
  }
});

// node_modules/zod/v4/core/index.js
var init_core2 = __esm({
  "node_modules/zod/v4/core/index.js"() {
    init_core();
    init_parse();
    init_errors();
    init_schemas();
    init_memoizer();
    init_checks();
    init_versions();
    init_util();
    init_regexes();
    init_locales();
    init_registries();
    init_doc();
    init_compile();
    init_api();
    init_to_json_schema();
    init_json_schema_processors();
    init_json_schema();
  }
});

// node_modules/zod/v4/classic/checks.js
var init_checks2 = __esm({
  "node_modules/zod/v4/classic/checks.js"() {
    init_core2();
  }
});

// node_modules/zod/v4/classic/errors.js
function _lazyMethod(proto, key, make) {
  Object.defineProperty(proto, key, {
    configurable: true,
    enumerable: false,
    get() {
      const value = make(this);
      Object.defineProperty(this, key, { value, configurable: true, writable: true });
      return value;
    },
    set(value) {
      Object.defineProperty(this, key, { value, configurable: true, writable: true });
    }
  });
}
var _installedErrorProtos, initializer2, ZodRealError;
var init_errors2 = __esm({
  "node_modules/zod/v4/classic/errors.js"() {
    init_core2();
    init_core2();
    init_util();
    _installedErrorProtos = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
    __name(_lazyMethod, "_lazyMethod");
    initializer2 = /* @__PURE__ */ __name((inst, issues) => {
      $ZodError.init(inst, issues);
      inst.name = "ZodError";
      const proto = Object.getPrototypeOf(inst);
      if (_installedErrorProtos.has(proto))
        return;
      _installedErrorProtos.add(proto);
      _lazyMethod(proto, "format", (self) => (mapper) => formatError(self, mapper));
      _lazyMethod(proto, "flatten", (self) => (mapper) => flattenError(self, mapper));
      _lazyMethod(proto, "addIssue", (self) => (issue2) => {
        self.issues.push(issue2);
        self.message = JSON.stringify(self.issues, jsonStringifyReplacer, 2);
      });
      _lazyMethod(proto, "addIssues", (self) => (issues2) => {
        self.issues.push(...issues2);
        self.message = JSON.stringify(self.issues, jsonStringifyReplacer, 2);
      });
      Object.defineProperty(proto, "isEmpty", {
        configurable: true,
        enumerable: false,
        get() {
          return this.issues.length === 0;
        }
      });
    }, "initializer");
    ZodRealError = /* @__PURE__ */ $constructor("ZodError", initializer2, void 0, {
      Parent: Error
    });
  }
});

// node_modules/zod/v4/classic/parse.js
var parse, parseAsync, safeParse, safeParseAsync, encode, decode, encodeAsync, decodeAsync, safeEncode, safeDecode, safeEncodeAsync, safeDecodeAsync;
var init_parse2 = __esm({
  "node_modules/zod/v4/classic/parse.js"() {
    init_core2();
    init_errors2();
    init_core2();
    parse = /* @__PURE__ */ _parse(ZodRealError);
    parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
    safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
    safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
    encode = /* @__PURE__ */ _encode(ZodRealError);
    decode = /* @__PURE__ */ _decode(ZodRealError);
    encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
    decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
    safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
    safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
    safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
    safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
  }
});

// node_modules/zod/v4/classic/schemas.js
function _ensureDefaultLocale() {
  if (!globalConfig.localeError)
    config(en_default());
}
function _ensureDefaultMemoizer() {
  if (!globalConfig.memoizer)
    config({ memoizer: memoizer() });
}
function string2(params) {
  return _string(ZodString, params);
}
function number2(params) {
  return _number(ZodNumber, params);
}
function int(params) {
  return _int(ZodNumberFormat, params);
}
function boolean2(params) {
  return _boolean(ZodBoolean, params);
}
function _null3(params) {
  return _null2(ZodNull, params);
}
function any() {
  return _any(ZodAny);
}
function unknown() {
  return _unknown(ZodUnknown);
}
function never(params) {
  return _never(ZodNever, params);
}
function array(element, params) {
  return _array(ZodArray, element, params);
}
function object(shape, params) {
  const def = {
    type: "object",
    shape: shape ?? {},
    ...util_exports.normalizeParams(params)
  };
  return new ZodObject(def);
}
function looseObject(shape, params) {
  return new ZodObject({
    type: "object",
    shape,
    catchall: unknown(),
    ...util_exports.normalizeParams(params)
  });
}
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...util_exports.normalizeParams(params)
  });
}
function discriminatedUnion(discriminator, options, params) {
  return new ZodDiscriminatedUnion({
    type: "union",
    options,
    discriminator,
    ...util_exports.normalizeParams(params)
  });
}
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
function record(keyType, valueType, params) {
  if (!valueType || !valueType._zod) {
    return new ZodRecord({
      type: "record",
      keyType: string2(),
      valueType: keyType,
      ...util_exports.normalizeParams(valueType)
    });
  }
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    ...util_exports.normalizeParams(params)
  });
}
function _enum(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodEnum({
    type: "enum",
    entries,
    ...util_exports.normalizeParams(params)
  });
}
function literal(value, params) {
  return new ZodLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...util_exports.normalizeParams(params)
  });
}
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
function exactOptional(innerType) {
  return new ZodExactOptional({
    type: "optional",
    innerType
  });
}
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
function _default(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : util_exports.shallowClone(defaultValue);
    }
  });
}
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : util_exports.shallowClone(defaultValue);
    }
  });
}
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...util_exports.normalizeParams(params)
  });
}
function _catch(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : util_exports.constantCatch(catchValue)
  });
}
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
    // ...util.normalizeParams(params),
  });
}
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
function lazy(getter) {
  return new ZodLazy({
    type: "lazy",
    getter
  });
}
function custom(fn, _params) {
  return _custom(ZodCustom, fn ?? (() => true), _params);
}
function refine(fn, _params = {}) {
  return _refine(ZodCustom, fn, _params);
}
function superRefine(fn, params) {
  return _superRefine(fn, params);
}
function _instanceof(cls, params = {}) {
  const inst = new ZodInstanceOf({
    type: "custom",
    check: "custom",
    fn: /* @__PURE__ */ __name((data) => data instanceof cls, "fn"),
    abort: true,
    ...util_exports.normalizeParams(params)
  });
  inst._zod.bag.Class = cls;
  inst._zod.check = (payload) => {
    if (!(payload.value instanceof cls)) {
      payload.issues.push({
        code: "invalid_type",
        expected: cls.name,
        input: payload.value,
        inst,
        path: [...inst._zod.def.path ?? []]
      });
    }
  };
  return inst;
}
var ZodType, _ZodString, ZodString, ZodStringFormat, ZodISODateTime, ZodISODate, ZodISOTime, ZodISODuration, ZodEmail, ZodGUID, ZodUUID, ZodURL, ZodEmoji, ZodNanoID, ZodCUID, ZodCUID2, ZodULID, ZodXID, ZodKSUID, ZodIPv4, ZodIPv6, ZodCIDRv4, ZodCIDRv6, ZodBase64, ZodBase64URL, ZodE164, ZodJWT, ZodNumber, ZodNumberFormat, ZodBoolean, ZodNull, ZodAny, ZodUnknown, ZodNever, ZodArray, ZodObject, ZodUnion, ZodDiscriminatedUnion, ZodIntersection, ZodRecord, ZodEnum, ZodLiteral, ZodTransform, ZodOptional, ZodExactOptional, ZodNullable, ZodDefault, ZodPrefault, ZodNonOptional, ZodCatch, ZodPipe, ZodReadonly, ZodLazy, ZodCustom, ZodInstanceOf;
var init_schemas2 = __esm({
  "node_modules/zod/v4/classic/schemas.js"() {
    init_core2();
    init_core2();
    init_json_schema_processors();
    init_to_json_schema();
    init_en();
    init_checks2();
    init_parse2();
    __name(_ensureDefaultLocale, "_ensureDefaultLocale");
    __name(_ensureDefaultMemoizer, "_ensureDefaultMemoizer");
    ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
      _ensureDefaultLocale();
      $ZodType.init(inst, def);
      inst.def = def;
      inst.type = def.type;
      return inst;
    }, {
      check(...chks) {
        const def = this.def;
        return this.clone(util_exports.mergeDefs(def, {
          checks: [
            ...def.checks ?? [],
            ...chks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
          ]
        }), { parent: true });
      },
      with(...chks) {
        return this.check(...chks);
      },
      clone(def, params) {
        return clone(this, def, params);
      },
      brand() {
        return this;
      },
      register(reg, meta2) {
        reg.add(this, meta2);
        return this;
      },
      refine(check, params) {
        return this.check(refine(check, params));
      },
      superRefine(refinement, params) {
        return this.check(superRefine(refinement, params));
      },
      overwrite(fn) {
        return this.check(_overwrite(fn));
      },
      optional() {
        return optional(this);
      },
      exactOptional() {
        return exactOptional(this);
      },
      nullable() {
        return nullable(this);
      },
      nullish() {
        return optional(nullable(this));
      },
      nonoptional(params) {
        return nonoptional(this, params);
      },
      array() {
        return array(this);
      },
      or(arg) {
        return union([this, arg]);
      },
      and(arg) {
        return intersection(this, arg);
      },
      transform(tx) {
        return pipe(this, transform(tx));
      },
      default(d) {
        return _default(this, d);
      },
      prefault(d) {
        return prefault(this, d);
      },
      catch(params) {
        return _catch(this, params);
      },
      pipe(target) {
        return pipe(this, target);
      },
      readonly() {
        return readonly(this);
      },
      describe(description) {
        const cl = this.clone();
        globalRegistry.add(cl, { description });
        return cl;
      },
      meta(...args) {
        if (args.length === 0)
          return globalRegistry.get(this);
        const cl = this.clone();
        globalRegistry.add(cl, args[0]);
        return cl;
      },
      isOptional() {
        return this.safeParse(void 0).success;
      },
      isNullable() {
        return this.safeParse(null).success;
      },
      apply(fn, ...args) {
        return args.length === 0 ? fn(this) : fn(this, ...args);
      },
      // Overrides core's `~standard` to add `jsonSchema`. Must stay a prototype entry: redefining it per instance demotes instances to dictionary mode.
      get "~standard"() {
        return util_exports.hide(this, "~standard", {
          ...standardProps(this),
          jsonSchema: {
            input: createStandardJSONSchemaMethod(this, "input"),
            output: createStandardJSONSchemaMethod(this, "output")
          }
        });
      },
      set "~standard"(value) {
        util_exports.own(this, "~standard", value);
      },
      parse: /* @__PURE__ */ __name(function _parse2(data, params) {
        return parse(this, data, params, { callee: _parse2 });
      }, "_parse"),
      parseAsync: /* @__PURE__ */ __name(async function _parseAsync2(data, params) {
        return await parseAsync(this, data, params, { callee: _parseAsync2 });
      }, "_parseAsync"),
      safeParse(data, params) {
        return safeParse(this, data, params);
      },
      async safeParseAsync(data, params) {
        return safeParseAsync(this, data, params);
      },
      // `spa` is an alias: same function object as `safeParseAsync`, as before.
      get spa() {
        return this?.safeParseAsync;
      },
      set spa(value) {
        util_exports.own(this, "spa", value);
      },
      validate(data, params) {
        return validate(this, data, params);
      },
      validateAsync(data, params) {
        return validateAsync(this, data, params);
      },
      encode: /* @__PURE__ */ __name(function _encode2(data, params) {
        return encode(this, data, params, { callee: _encode2 });
      }, "_encode"),
      decode: /* @__PURE__ */ __name(function _decode2(data, params) {
        return decode(this, data, params, { callee: _decode2 });
      }, "_decode"),
      encodeAsync: /* @__PURE__ */ __name(async function _encodeAsync2(data, params) {
        return await encodeAsync(this, data, params, { callee: _encodeAsync2 });
      }, "_encodeAsync"),
      decodeAsync: /* @__PURE__ */ __name(async function _decodeAsync2(data, params) {
        return await decodeAsync(this, data, params, { callee: _decodeAsync2 });
      }, "_decodeAsync"),
      safeEncode(data, params) {
        return safeEncode(this, data, params);
      },
      safeDecode(data, params) {
        return safeDecode(this, data, params);
      },
      async safeEncodeAsync(data, params) {
        return safeEncodeAsync(this, data, params);
      },
      async safeDecodeAsync(data, params) {
        return safeDecodeAsync(this, data, params);
      },
      toJSONSchema(params) {
        return createToJSONSchemaMethod(this, {})(params);
      },
      // Reads through to the registry on every access, so it must not cache.
      get description() {
        return globalRegistry.get(this)?.description;
      },
      // No setter: `schema._def = x` throws, as it did when `_def` was a non-writable own property.
      get _def() {
        return this._zod.def;
      }
    });
    _ZodString = /* @__PURE__ */ $constructor(
      "_ZodString",
      (inst, def) => {
        $ZodString.init(inst, def);
        ZodType.init(inst, def);
        inst._zod.processJSONSchema = (ctx, json3, params) => stringProcessor(inst, ctx, json3, params);
      },
      /* @__PURE__ */ util_exports.derived({
        format: /* @__PURE__ */ __name((inst) => aggregateChecks(inst).format ?? null, "format"),
        minLength: /* @__PURE__ */ __name((inst) => aggregateChecks(inst).minimum ?? null, "minLength"),
        maxLength: /* @__PURE__ */ __name((inst) => aggregateChecks(inst).maximum ?? null, "maxLength")
      }, {
        regex(...args) {
          return this.check(_regex(...args));
        },
        includes(...args) {
          return this.check(_includes(...args));
        },
        startsWith(...args) {
          return this.check(_startsWith(...args));
        },
        endsWith(...args) {
          return this.check(_endsWith(...args));
        },
        min(...args) {
          return this.check(_minLength(...args));
        },
        max(...args) {
          return this.check(_maxLength(...args));
        },
        length(...args) {
          return this.check(_length(...args));
        },
        nonempty(...args) {
          return this.check(_minLength(1, ...args));
        },
        lowercase(params) {
          return this.check(_lowercase(params));
        },
        uppercase(params) {
          return this.check(_uppercase(params));
        },
        trim() {
          return this.check(_trim());
        },
        normalize(...args) {
          return this.check(_normalize(...args));
        },
        toLowerCase() {
          return this.check(_toLowerCase());
        },
        toUpperCase() {
          return this.check(_toUpperCase());
        },
        slugify() {
          return this.check(_slugify());
        }
      })
    );
    ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
      $ZodString.init(inst, def);
      _ZodString.init(inst, def);
    }, {
      email(params) {
        return this.check(_email(ZodEmail, params));
      },
      url(params) {
        return this.check(_url(ZodURL, params));
      },
      jwt(params) {
        return this.check(_jwt(ZodJWT, params));
      },
      emoji(params) {
        return this.check(_emoji2(ZodEmoji, params));
      },
      guid(params) {
        return this.check(_guid(ZodGUID, params));
      },
      uuid(params) {
        return this.check(_uuid(ZodUUID, params));
      },
      uuidv4(params) {
        return this.check(_uuidv4(ZodUUID, params));
      },
      uuidv6(params) {
        return this.check(_uuidv6(ZodUUID, params));
      },
      uuidv7(params) {
        return this.check(_uuidv7(ZodUUID, params));
      },
      nanoid(params) {
        return this.check(_nanoid(ZodNanoID, params));
      },
      cuid(params) {
        return this.check(_cuid(ZodCUID, params));
      },
      cuid2(params) {
        return this.check(_cuid2(ZodCUID2, params));
      },
      ulid(params) {
        return this.check(_ulid(ZodULID, params));
      },
      base64(params) {
        return this.check(_base64(ZodBase64, params));
      },
      base64url(params) {
        return this.check(_base64url(ZodBase64URL, params));
      },
      xid(params) {
        return this.check(_xid(ZodXID, params));
      },
      ksuid(params) {
        return this.check(_ksuid(ZodKSUID, params));
      },
      ipv4(params) {
        return this.check(_ipv4(ZodIPv4, params));
      },
      ipv6(params) {
        return this.check(_ipv6(ZodIPv6, params));
      },
      cidrv4(params) {
        return this.check(_cidrv4(ZodCIDRv4, params));
      },
      cidrv6(params) {
        return this.check(_cidrv6(ZodCIDRv6, params));
      },
      e164(params) {
        return this.check(_e164(ZodE164, params));
      },
      datetime(params) {
        return this.check(_isoDateTime(ZodISODateTime, params));
      },
      date(params) {
        return this.check(_isoDate(ZodISODate, params));
      },
      time(params) {
        return this.check(_isoTime(ZodISOTime, params));
      },
      duration(params) {
        return this.check(_isoDuration(ZodISODuration, params));
      }
    });
    __name(string2, "string");
    ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
      $ZodStringFormat.init(inst, def);
      _ZodString.init(inst, def);
    });
    ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
      $ZodISODateTime.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
      $ZodISODate.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
      $ZodISOTime.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
      $ZodISODuration.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
      $ZodEmail.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
      $ZodGUID.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
      $ZodUUID.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
      $ZodURL.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
      $ZodEmoji.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
      $ZodNanoID.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
      $ZodCUID.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
      $ZodCUID2.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
      $ZodULID.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
      $ZodXID.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
      $ZodKSUID.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
      $ZodIPv4.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
      $ZodIPv6.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
      $ZodCIDRv4.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
      $ZodCIDRv6.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
      $ZodBase64.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
      $ZodBase64URL.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
      $ZodE164.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
      $ZodJWT.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodNumber = /* @__PURE__ */ $constructor(
      "ZodNumber",
      (inst, def) => {
        $ZodNumber.init(inst, def);
        ZodType.init(inst, def);
        inst._zod.processJSONSchema = (ctx, json3, params) => numberProcessor(inst, ctx, json3, params);
        inst.isFinite = true;
      },
      /* @__PURE__ */ util_exports.derived({
        minValue: /* @__PURE__ */ __name((inst) => {
          const { minimum, exclusiveMinimum } = aggregateChecks(inst);
          return Math.max(minimum ?? Number.NEGATIVE_INFINITY, exclusiveMinimum ?? Number.NEGATIVE_INFINITY);
        }, "minValue"),
        maxValue: /* @__PURE__ */ __name((inst) => {
          const { maximum, exclusiveMaximum } = aggregateChecks(inst);
          return Math.min(maximum ?? Number.POSITIVE_INFINITY, exclusiveMaximum ?? Number.POSITIVE_INFINITY);
        }, "maxValue"),
        isInt: /* @__PURE__ */ __name((inst) => {
          const { isInt, multipleOf } = aggregateChecks(inst);
          return !!isInt || !!multipleOf?.some(Number.isSafeInteger);
        }, "isInt"),
        format: /* @__PURE__ */ __name((inst) => aggregateChecks(inst).format ?? null, "format")
      }, {
        gt(value, params) {
          return this.check(_gt(value, params));
        },
        gte(value, params) {
          return this.check(_gte(value, params));
        },
        min(value, params) {
          return this.check(_gte(value, params));
        },
        lt(value, params) {
          return this.check(_lt(value, params));
        },
        lte(value, params) {
          return this.check(_lte(value, params));
        },
        max(value, params) {
          return this.check(_lte(value, params));
        },
        int(params) {
          return this.check(int(params));
        },
        safe(params) {
          return this.check(int(params));
        },
        positive(params) {
          return this.check(_gt(0, params));
        },
        nonnegative(params) {
          return this.check(_gte(0, params));
        },
        negative(params) {
          return this.check(_lt(0, params));
        },
        nonpositive(params) {
          return this.check(_lte(0, params));
        },
        multipleOf(value, params) {
          return this.check(_multipleOf(value, params));
        },
        step(value, params) {
          return this.check(_multipleOf(value, params));
        },
        finite() {
          return this;
        }
      })
    );
    __name(number2, "number");
    ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
      $ZodNumberFormat.init(inst, def);
      ZodNumber.init(inst, def);
    });
    __name(int, "int");
    ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
      $ZodBoolean.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => booleanProcessor(inst, ctx, json3, params);
    });
    __name(boolean2, "boolean");
    ZodNull = /* @__PURE__ */ $constructor("ZodNull", (inst, def) => {
      $ZodNull.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => nullProcessor(inst, ctx, json3, params);
    });
    __name(_null3, "_null");
    ZodAny = /* @__PURE__ */ $constructor("ZodAny", (inst, def) => {
      $ZodAny.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => anyProcessor(inst, ctx, json3, params);
    });
    __name(any, "any");
    ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
      $ZodUnknown.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => unknownProcessor(inst, ctx, json3, params);
    });
    __name(unknown, "unknown");
    ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
      $ZodNever.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => neverProcessor(inst, ctx, json3, params);
    });
    __name(never, "never");
    ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
      _ensureDefaultMemoizer();
      $ZodArray.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => arrayProcessor(inst, ctx, json3, params);
      inst.element = def.element;
    }, {
      min(n, params) {
        return this.check(_minLength(n, params));
      },
      nonempty(params) {
        return this.check(_minLength(1, params));
      },
      max(n, params) {
        return this.check(_maxLength(n, params));
      },
      length(n, params) {
        return this.check(_length(n, params));
      },
      unwrap() {
        return this.element;
      }
    });
    __name(array, "array");
    ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
      _ensureDefaultMemoizer();
      $ZodObjectJIT.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => objectProcessor(inst, ctx, json3, params);
      util_exports.installLazyProp(inst, "shape", (self) => self._zod.def.shape, false);
    }, {
      keyof() {
        return _enum(Object.keys(this._zod.def.shape));
      },
      catchall(catchall) {
        return this.clone(util_exports.mergeDefs(this._zod.def, { catchall }));
      },
      passthrough() {
        return this.clone(util_exports.mergeDefs(this._zod.def, { catchall: unknown() }));
      },
      loose() {
        return this.clone(util_exports.mergeDefs(this._zod.def, { catchall: unknown() }));
      },
      strict() {
        return this.clone(util_exports.mergeDefs(this._zod.def, { catchall: never() }));
      },
      strip() {
        return this.clone(util_exports.mergeDefs(this._zod.def, { catchall: void 0 }));
      },
      extend(incoming) {
        return util_exports.extend(this, incoming);
      },
      safeExtend(incoming) {
        return util_exports.safeExtend(this, incoming);
      },
      merge(other) {
        return util_exports.merge(this, other);
      },
      pick(mask) {
        return util_exports.pick(this, mask);
      },
      omit(mask) {
        return util_exports.omit(this, mask);
      },
      partial(...args) {
        return util_exports.partial(ZodOptional, this, args[0]);
      },
      exactPartial(...args) {
        return util_exports.partial(ZodExactOptional, this, args[0], "exactPartial");
      },
      required(...args) {
        return util_exports.required(ZodNonOptional, this, args[0]);
      }
    });
    __name(object, "object");
    __name(looseObject, "looseObject");
    ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
      $ZodUnion.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => unionProcessor(inst, ctx, json3, params);
      inst.options = def.options;
    });
    __name(union, "union");
    ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("ZodDiscriminatedUnion", (inst, def) => {
      ZodUnion.init(inst, def);
      $ZodDiscriminatedUnion.init(inst, def);
    });
    __name(discriminatedUnion, "discriminatedUnion");
    ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
      $ZodIntersection.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => intersectionProcessor(inst, ctx, json3, params);
    });
    __name(intersection, "intersection");
    ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
      _ensureDefaultMemoizer();
      $ZodRecord.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => recordProcessor(inst, ctx, json3, params);
      inst.keyType = def.keyType;
      inst.valueType = def.valueType;
    });
    __name(record, "record");
    ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
      $ZodEnum.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => enumProcessor(inst, ctx, json3, params);
      inst.enum = def.entries;
      inst.options = [...inst._zod.values];
      const keys = new Set(Object.keys(def.entries));
      inst.extract = (values, params) => {
        const newEntries = {};
        for (const value of values) {
          if (keys.has(value)) {
            newEntries[value] = def.entries[value];
          } else
            throw new Error(`Key ${value} not found in enum`);
        }
        return new ZodEnum({
          ...def,
          checks: [],
          ...util_exports.normalizeParams(params),
          entries: newEntries
        });
      };
      inst.exclude = (values, params) => {
        const newEntries = { ...def.entries };
        for (const value of values) {
          if (keys.has(value)) {
            delete newEntries[value];
          } else
            throw new Error(`Key ${value} not found in enum`);
        }
        return new ZodEnum({
          ...def,
          checks: [],
          ...util_exports.normalizeParams(params),
          entries: newEntries
        });
      };
    });
    __name(_enum, "_enum");
    ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
      $ZodLiteral.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => literalProcessor(inst, ctx, json3, params);
      inst.values = new Set(def.values);
      Object.defineProperty(inst, "value", {
        get() {
          if (def.values.length > 1) {
            throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
          }
          return def.values[0];
        }
      });
    });
    __name(literal, "literal");
    ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
      _ensureDefaultMemoizer();
      $ZodTransform.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => transformProcessor(inst, ctx, json3, params);
      inst._zod.parse = (payload, _ctx) => {
        if (_ctx.direction === "backward") {
          throw new $ZodEncodeError(inst.constructor.name);
        }
        payload.addIssue = (issue2) => {
          if (typeof issue2 === "string") {
            payload.issues.push(util_exports.issue(issue2, payload.value, def));
          } else {
            const _issue = issue2;
            if (_issue.fatal)
              _issue.continue = false;
            _issue.code ?? (_issue.code = "custom");
            if (!("input" in _issue))
              _issue.input = payload.value;
            _issue.inst ?? (_issue.inst = inst);
            payload.issues.push(util_exports.issue(_issue));
          }
        };
        const output = def.transform(payload.value, payload);
        if (output instanceof Promise) {
          return output.then((output2) => {
            payload.value = output2;
            return payload;
          });
        }
        payload.value = output;
        return payload;
      };
    });
    __name(transform, "transform");
    ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
      $ZodOptional.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => optionalProcessor(inst, ctx, json3, params);
      inst.unwrap = () => inst._zod.def.innerType;
    });
    __name(optional, "optional");
    ZodExactOptional = /* @__PURE__ */ $constructor("ZodExactOptional", (inst, def) => {
      $ZodExactOptional.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => optionalProcessor(inst, ctx, json3, params);
      inst.unwrap = () => inst._zod.def.innerType;
    });
    __name(exactOptional, "exactOptional");
    ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
      $ZodNullable.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => nullableProcessor(inst, ctx, json3, params);
      inst.unwrap = () => inst._zod.def.innerType;
    });
    __name(nullable, "nullable");
    ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
      $ZodDefault.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => defaultProcessor(inst, ctx, json3, params);
      inst.unwrap = () => inst._zod.def.innerType;
      inst.removeDefault = inst.unwrap;
    });
    __name(_default, "_default");
    ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
      $ZodPrefault.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => prefaultProcessor(inst, ctx, json3, params);
      inst.unwrap = () => inst._zod.def.innerType;
    });
    __name(prefault, "prefault");
    ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
      $ZodNonOptional.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => nonoptionalProcessor(inst, ctx, json3, params);
      inst.unwrap = () => inst._zod.def.innerType;
    });
    __name(nonoptional, "nonoptional");
    ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
      $ZodCatch.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => catchProcessor(inst, ctx, json3, params);
      inst.unwrap = () => inst._zod.def.innerType;
      inst.removeCatch = inst.unwrap;
    });
    __name(_catch, "_catch");
    ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
      $ZodPipe.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => pipeProcessor(inst, ctx, json3, params);
      inst.in = def.in;
      inst.out = def.out;
    });
    __name(pipe, "pipe");
    ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
      $ZodReadonly.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => readonlyProcessor(inst, ctx, json3, params);
      inst.unwrap = () => inst._zod.def.innerType;
    });
    __name(readonly, "readonly");
    ZodLazy = /* @__PURE__ */ $constructor("ZodLazy", (inst, def) => {
      $ZodLazy.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => lazyProcessor(inst, ctx, json3, params);
      inst.unwrap = () => inst._zod.def.getter();
    });
    __name(lazy, "lazy");
    ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
      $ZodCustom.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json3, params) => customProcessor(inst, ctx, json3, params);
    });
    __name(custom, "custom");
    __name(refine, "refine");
    __name(superRefine, "superRefine");
    ZodInstanceOf = /* @__PURE__ */ $constructor("ZodInstanceOf", (inst, def) => {
      ZodCustom.init(inst, def);
    }, {
      properties(shape, params) {
        return this.check(_properties(shape, params));
      }
    });
    __name(_instanceof, "_instanceof");
  }
});

// node_modules/zod/v4/classic/compat.js
var ZodFirstPartyTypeKind;
var init_compat = __esm({
  "node_modules/zod/v4/classic/compat.js"() {
    /* @__PURE__ */ (function(ZodFirstPartyTypeKind2) {
    })(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
  }
});

// node_modules/zod/v4/classic/iso.js
var init_iso = __esm({
  "node_modules/zod/v4/classic/iso.js"() {
  }
});

// node_modules/zod/v4/classic/coerce.js
var init_coerce = __esm({
  "node_modules/zod/v4/classic/coerce.js"() {
  }
});

// node_modules/zod/v4/classic/external.js
var init_external = __esm({
  "node_modules/zod/v4/classic/external.js"() {
    init_core2();
    init_schemas2();
    init_checks2();
    init_errors2();
    init_parse2();
    init_compat();
    init_locales();
    init_iso();
    init_coerce();
  }
});

// node_modules/zod/v4/classic/index.js
var init_classic = __esm({
  "node_modules/zod/v4/classic/index.js"() {
    init_external();
  }
});

// node_modules/zod/v4/index.js
var init_v4 = __esm({
  "node_modules/zod/v4/index.js"() {
    init_classic();
  }
});

// node_modules/eventsource-parser/dist/index.js
function noop(_arg) {
}
function createParser(config2) {
  if (typeof config2 == "function")
    throw new TypeError(
      "`config` must be an object, got a function instead. Did you mean `createParser({onEvent: fn})`?"
    );
  const { onEvent = noop, onError = noop, onRetry = noop, onComment, maxBufferSize } = config2, pendingFragments = [];
  let pendingFragmentsLength = 0, isFirstChunk = true, id, data = "", dataLines = 0, eventType, terminated = false;
  function feed(chunk) {
    if (terminated)
      throw new Error(
        "Cannot feed parser: it was terminated after exceeding the configured max buffer size. Call `reset()` to resume parsing."
      );
    if (isFirstChunk && (isFirstChunk = false, chunk.charCodeAt(0) === 239 && chunk.charCodeAt(1) === 187 && chunk.charCodeAt(2) === 191 && (chunk = chunk.slice(3))), pendingFragments.length === 0) {
      const trailing2 = processLines(chunk);
      trailing2 !== "" && (pendingFragments.push(trailing2), pendingFragmentsLength = trailing2.length), checkBufferSize();
      return;
    }
    if (chunk.indexOf(`
`) === -1 && chunk.indexOf("\r") === -1) {
      pendingFragments.push(chunk), pendingFragmentsLength += chunk.length, checkBufferSize();
      return;
    }
    pendingFragments.push(chunk);
    const input = pendingFragments.join("");
    pendingFragments.length = 0, pendingFragmentsLength = 0;
    const trailing = processLines(input);
    trailing !== "" && (pendingFragments.push(trailing), pendingFragmentsLength = trailing.length), checkBufferSize();
  }
  __name(feed, "feed");
  function checkBufferSize() {
    maxBufferSize !== void 0 && (pendingFragmentsLength + data.length <= maxBufferSize || (terminated = true, pendingFragments.length = 0, pendingFragmentsLength = 0, id = void 0, data = "", dataLines = 0, eventType = void 0, onError(
      new ParseError(`Buffered data exceeded max buffer size of ${maxBufferSize} characters`, {
        type: "max-buffer-size-exceeded"
      })
    )));
  }
  __name(checkBufferSize, "checkBufferSize");
  function processLines(chunk) {
    let searchIndex = 0;
    if (chunk.indexOf("\r") === -1) {
      let lfIndex = chunk.indexOf(`
`, searchIndex);
      for (; lfIndex !== -1; ) {
        if (searchIndex === lfIndex) {
          dataLines > 0 && onEvent({ id, event: eventType, data }), id = void 0, data = "", dataLines = 0, eventType = void 0, searchIndex = lfIndex + 1, lfIndex = chunk.indexOf(`
`, searchIndex);
          continue;
        }
        const firstCharCode = chunk.charCodeAt(searchIndex);
        if (isDataPrefix(chunk, searchIndex, firstCharCode)) {
          const valueStart = chunk.charCodeAt(searchIndex + 5) === SPACE ? searchIndex + 6 : searchIndex + 5, value = chunk.slice(valueStart, lfIndex);
          if (dataLines === 0 && chunk.charCodeAt(lfIndex + 1) === LF) {
            onEvent({ id, event: eventType, data: value }), id = void 0, data = "", eventType = void 0, searchIndex = lfIndex + 2, lfIndex = chunk.indexOf(`
`, searchIndex);
            continue;
          }
          data = dataLines === 0 ? value : `${data}
${value}`, dataLines++;
        } else isEventPrefix(chunk, searchIndex, firstCharCode) ? eventType = chunk.slice(
          chunk.charCodeAt(searchIndex + 6) === SPACE ? searchIndex + 7 : searchIndex + 6,
          lfIndex
        ) || void 0 : parseLine(chunk, searchIndex, lfIndex);
        searchIndex = lfIndex + 1, lfIndex = chunk.indexOf(`
`, searchIndex);
      }
      return chunk.slice(searchIndex);
    }
    for (; searchIndex < chunk.length; ) {
      const crIndex = chunk.indexOf("\r", searchIndex), lfIndex = chunk.indexOf(`
`, searchIndex);
      let lineEnd = -1;
      if (crIndex !== -1 && lfIndex !== -1 ? lineEnd = crIndex < lfIndex ? crIndex : lfIndex : crIndex !== -1 ? crIndex === chunk.length - 1 ? lineEnd = -1 : lineEnd = crIndex : lfIndex !== -1 && (lineEnd = lfIndex), lineEnd === -1)
        break;
      parseLine(chunk, searchIndex, lineEnd), searchIndex = lineEnd + 1, chunk.charCodeAt(searchIndex - 1) === CR && chunk.charCodeAt(searchIndex) === LF && searchIndex++;
    }
    return chunk.slice(searchIndex);
  }
  __name(processLines, "processLines");
  function parseLine(chunk, start, end) {
    if (start === end) {
      dispatchEvent();
      return;
    }
    const firstCharCode = chunk.charCodeAt(start);
    if (isDataPrefix(chunk, start, firstCharCode)) {
      const valueStart = chunk.charCodeAt(start + 5) === SPACE ? start + 6 : start + 5, value2 = chunk.slice(valueStart, end);
      data = dataLines === 0 ? value2 : `${data}
${value2}`, dataLines++;
      return;
    }
    if (isEventPrefix(chunk, start, firstCharCode)) {
      eventType = chunk.slice(chunk.charCodeAt(start + 6) === SPACE ? start + 7 : start + 6, end) || void 0;
      return;
    }
    if (firstCharCode === 105 && chunk.charCodeAt(start + 1) === 100 && chunk.charCodeAt(start + 2) === 58) {
      const value2 = chunk.slice(chunk.charCodeAt(start + 3) === SPACE ? start + 4 : start + 3, end);
      value2.includes("\0") || (id = value2);
      return;
    }
    if (firstCharCode === 58) {
      if (onComment) {
        const line2 = chunk.slice(start, end);
        onComment(line2.slice(chunk.charCodeAt(start + 1) === SPACE ? 2 : 1));
      }
      return;
    }
    const line = chunk.slice(start, end), fieldSeparatorIndex = line.indexOf(":");
    if (fieldSeparatorIndex === -1) {
      processField(line, "", line);
      return;
    }
    const field = line.slice(0, fieldSeparatorIndex), offset = line.charCodeAt(fieldSeparatorIndex + 1) === SPACE ? 2 : 1, value = line.slice(fieldSeparatorIndex + offset);
    processField(field, value, line);
  }
  __name(parseLine, "parseLine");
  function processField(field, value, line) {
    switch (field) {
      case "event":
        eventType = value || void 0;
        break;
      case "data":
        data = dataLines === 0 ? value : `${data}
${value}`, dataLines++;
        break;
      case "id":
        value.includes("\0") || (id = value);
        break;
      case "retry":
        /^\d+$/.test(value) ? onRetry(parseInt(value, 10)) : onError(
          new ParseError(`Invalid \`retry\` value: "${value}"`, {
            type: "invalid-retry",
            value,
            line
          })
        );
        break;
      default:
        onError(
          new ParseError(
            `Unknown field "${field.length > 20 ? `${field.slice(0, 20)}\u2026` : field}"`,
            { type: "unknown-field", field, value, line }
          )
        );
        break;
    }
  }
  __name(processField, "processField");
  function dispatchEvent() {
    dataLines > 0 && onEvent({
      id,
      event: eventType,
      data
    }), id = void 0, data = "", dataLines = 0, eventType = void 0;
  }
  __name(dispatchEvent, "dispatchEvent");
  function reset(options = {}) {
    if (options.consume && pendingFragments.length > 0) {
      const incompleteLine = pendingFragments.join("");
      parseLine(incompleteLine, 0, incompleteLine.length);
    }
    isFirstChunk = true, id = void 0, data = "", dataLines = 0, eventType = void 0, pendingFragments.length = 0, pendingFragmentsLength = 0, terminated = false;
  }
  __name(reset, "reset");
  return { feed, reset };
}
function isDataPrefix(chunk, i, firstCharCode) {
  return firstCharCode === 100 && chunk.charCodeAt(i + 1) === 97 && chunk.charCodeAt(i + 2) === 116 && chunk.charCodeAt(i + 3) === 97 && chunk.charCodeAt(i + 4) === 58;
}
function isEventPrefix(chunk, i, firstCharCode) {
  return firstCharCode === 101 && chunk.charCodeAt(i + 1) === 118 && chunk.charCodeAt(i + 2) === 101 && chunk.charCodeAt(i + 3) === 110 && chunk.charCodeAt(i + 4) === 116 && chunk.charCodeAt(i + 5) === 58;
}
var ParseError, LF, CR, SPACE;
var init_dist2 = __esm({
  "node_modules/eventsource-parser/dist/index.js"() {
    ParseError = class extends Error {
      static {
        __name(this, "ParseError");
      }
      constructor(message, options) {
        super(message), this.name = "ParseError", this.type = options.type, this.field = options.field, this.value = options.value, this.line = options.line;
      }
    };
    LF = 10;
    CR = 13;
    SPACE = 32;
    __name(noop, "noop");
    __name(createParser, "createParser");
    __name(isDataPrefix, "isDataPrefix");
    __name(isEventPrefix, "isEventPrefix");
  }
});

// node_modules/eventsource-parser/dist/stream.js
var EventSourceParserStream;
var init_stream = __esm({
  "node_modules/eventsource-parser/dist/stream.js"() {
    init_dist2();
    EventSourceParserStream = class extends TransformStream {
      static {
        __name(this, "EventSourceParserStream");
      }
      constructor({ onError, onRetry, onComment, maxBufferSize } = {}) {
        let parser;
        super({
          start(controller) {
            parser = createParser({
              onEvent: /* @__PURE__ */ __name((event) => {
                controller.enqueue(event);
              }, "onEvent"),
              onError(error2) {
                typeof onError == "function" && onError(error2), (onError === "terminate" || error2.type === "max-buffer-size-exceeded") && controller.error(error2);
              },
              onRetry,
              onComment,
              maxBufferSize
            });
          },
          transform(chunk) {
            parser.feed(chunk);
          }
        });
      }
    };
  }
});

// node_modules/@workflow/serde/dist/index.js
var WORKFLOW_SERIALIZE, WORKFLOW_DESERIALIZE;
var init_dist3 = __esm({
  "node_modules/@workflow/serde/dist/index.js"() {
    WORKFLOW_SERIALIZE = /* @__PURE__ */ Symbol.for("workflow-serialize");
    WORKFLOW_DESERIALIZE = /* @__PURE__ */ Symbol.for("workflow-deserialize");
  }
});

// node_modules/@ai-sdk/provider-utils/dist/index.js
function combineHeaders(...headers) {
  return headers.reduce(
    (combinedHeaders, currentHeaders) => ({
      ...combinedHeaders,
      ...currentHeaders != null ? currentHeaders : {}
    }),
    {}
  );
}
function removeUndefinedEntries(record2) {
  return Object.fromEntries(
    Object.entries(record2).filter(([_key, value]) => value != null)
  );
}
async function delay(delayInMs, options) {
  if (delayInMs == null) {
    return Promise.resolve();
  }
  const signal = options == null ? void 0 : options.abortSignal;
  return new Promise((resolve2, reject) => {
    if (signal == null ? void 0 : signal.aborted) {
      reject(createAbortError());
      return;
    }
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve2();
    }, delayInMs);
    const cleanup = /* @__PURE__ */ __name(() => {
      clearTimeout(timeoutId);
      signal == null ? void 0 : signal.removeEventListener("abort", onAbort);
    }, "cleanup");
    const onAbort = /* @__PURE__ */ __name(() => {
      cleanup();
      reject(createAbortError());
    }, "onAbort");
    signal == null ? void 0 : signal.addEventListener("abort", onAbort);
  });
}
function createAbortError() {
  return new DOMException("Delay was aborted", "AbortError");
}
function getWebSocketConstructor(webSocket) {
  const WebSocketConstructor = webSocket != null ? webSocket : globalThis.WebSocket;
  if (WebSocketConstructor == null) {
    throw new Error("No WebSocket implementation available.");
  }
  return WebSocketConstructor;
}
async function readWebSocketMessageText(data) {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return textDecoder.decode(data);
  if (ArrayBuffer.isView(data)) {
    return textDecoder.decode(data);
  }
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return data.text();
  }
  return String(data);
}
async function waitForWebSocketBufferDrain(socket, {
  highWaterMark = 1024 * 1024,
  pollIntervalMs = 20,
  abortSignal
} = {}) {
  var _a34;
  while (socket.readyState === WEBSOCKET_OPEN_STATE && ((_a34 = socket.bufferedAmount) != null ? _a34 : 0) > highWaterMark) {
    if ((abortSignal == null ? void 0 : abortSignal.aborted) === true) {
      return;
    }
    await delay(pollIntervalMs);
  }
}
function connectToWebSocket({
  url,
  protocols,
  headers,
  webSocket,
  abortSignal,
  onOpen,
  onMessageText,
  onProcessingError,
  onSocketError,
  onClose,
  onAbort
}) {
  var _a34;
  let socket;
  let abortListener;
  const close = /* @__PURE__ */ __name((code) => {
    if (abortListener != null) {
      abortSignal == null ? void 0 : abortSignal.removeEventListener("abort", abortListener);
      abortListener = void 0;
    }
    try {
      socket == null ? void 0 : socket.close(code);
    } catch (e) {
    }
  }, "close");
  if (abortSignal == null ? void 0 : abortSignal.aborted) {
    onAbort == null ? void 0 : onAbort((_a34 = abortSignal.reason) != null ? _a34 : new Error("Aborted"));
    return { socket: void 0, close };
  }
  try {
    const WebSocketConstructor = getWebSocketConstructor(webSocket);
    socket = new WebSocketConstructor(url, protocols, {
      headers: removeUndefinedEntries(headers != null ? headers : {})
    });
  } catch (error2) {
    onProcessingError(error2);
    return { socket: void 0, close };
  }
  if (abortSignal != null && onAbort != null) {
    abortListener = /* @__PURE__ */ __name(() => {
      var _a44;
      return onAbort((_a44 = abortSignal.reason) != null ? _a44 : new Error("Aborted"));
    }, "abortListener");
    abortSignal.addEventListener("abort", abortListener, { once: true });
  }
  const openedSocket = socket;
  socket.onopen = () => {
    try {
      onOpen == null ? void 0 : onOpen(openedSocket);
    } catch (error2) {
      onProcessingError(error2);
    }
  };
  let tail = Promise.resolve();
  socket.onmessage = (event) => {
    tail = tail.then(() => readWebSocketMessageText(event.data)).then((text2) => onMessageText(text2)).catch(onProcessingError);
  };
  socket.onerror = () => {
    tail = tail.then(() => onSocketError == null ? void 0 : onSocketError()).catch(onProcessingError);
  };
  socket.onclose = (event) => {
    const closeEvent = event;
    const code = typeof (closeEvent == null ? void 0 : closeEvent.code) === "number" ? closeEvent.code : void 0;
    const reason = typeof (closeEvent == null ? void 0 : closeEvent.reason) === "string" ? closeEvent.reason : void 0;
    tail = tail.then(() => onClose == null ? void 0 : onClose({ code, reason })).catch(onProcessingError);
  };
  return { socket, close };
}
function convertAsyncIteratorToReadableStream(iterator) {
  let cancelled = false;
  return new ReadableStream({
    /**
     * Called when the consumer wants to pull more data from the stream.
     *
     * @param {ReadableStreamDefaultController<T>} controller - The controller to enqueue data into the stream.
     * @returns {Promise<void>}
     */
    async pull(controller) {
      if (cancelled) return;
      try {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error2) {
        controller.error(error2);
      }
    },
    /**
     * Called when the consumer cancels the stream.
     */
    async cancel(reason) {
      cancelled = true;
      if (iterator.return) {
        try {
          await iterator.return(reason);
        } catch (e) {
        }
      }
    }
  });
}
function convertBase64ToUint8Array(base64String) {
  const base64Url = base64String.replace(/-/g, "+").replace(/_/g, "/");
  const latin1string = atob2(base64Url);
  return Uint8Array.from(latin1string, (byte) => byte.codePointAt(0));
}
function convertUint8ArrayToBase64(array3) {
  const chunks = [];
  const chunkSize = 4096;
  for (let i = 0; i < array3.length; i += chunkSize) {
    chunks.push(String.fromCodePoint(...array3.subarray(i, i + chunkSize)));
  }
  return btoa2(chunks.join(""));
}
function extractResponseHeaders(response) {
  return Object.fromEntries([...response.headers]);
}
function getRuntimeEnvironmentUserAgent(globalThisAny = globalThis) {
  var _a34, _b34, _c;
  if (globalThisAny.window) {
    return `runtime/browser`;
  }
  if ((_a34 = globalThisAny.navigator) == null ? void 0 : _a34.userAgent) {
    return `runtime/${globalThisAny.navigator.userAgent.toLowerCase()}`;
  }
  if ((_c = (_b34 = globalThisAny.process) == null ? void 0 : _b34.versions) == null ? void 0 : _c.node) {
    return `runtime/node.js/${globalThisAny.process.version.substring(0)}`;
  }
  if (globalThisAny.EdgeRuntime) {
    return `runtime/vercel-edge`;
  }
  return "runtime/unknown";
}
function isAbortError(error2) {
  return (error2 instanceof Error || typeof DOMException === "function" && error2 instanceof DOMException) && (error2.name === "AbortError" || error2.name === "ResponseAborted" || // Next.js
  error2.name === "TimeoutError");
}
function findNetworkError(error2) {
  const visited = /* @__PURE__ */ new Set();
  let current = error2;
  while (current instanceof Error && !visited.has(current)) {
    visited.add(current);
    const errorWithCode = current;
    if (typeof errorWithCode.code === "string" && RETRYABLE_NETWORK_ERROR_CODES.has(errorWithCode.code)) {
      return errorWithCode;
    }
    current = current.cause;
  }
  return void 0;
}
function handleFetchError({
  error: error2,
  url,
  requestBodyValues
}) {
  if (isAbortError(error2)) {
    return error2;
  }
  if (error2 instanceof TypeError && FETCH_FAILED_ERROR_MESSAGES.includes(error2.message.toLowerCase())) {
    const cause = error2.cause;
    if (cause != null) {
      return new APICallError({
        message: `Cannot connect to API: ${cause.message}`,
        cause,
        url,
        requestBodyValues,
        isRetryable: true
        // retry when network error
      });
    }
  }
  const networkError = findNetworkError(error2);
  if (networkError != null) {
    if (APICallError.isInstance(error2)) {
      return new APICallError({
        message: error2.message,
        cause: error2.cause,
        url: error2.url,
        requestBodyValues: error2.requestBodyValues,
        statusCode: error2.statusCode,
        responseHeaders: error2.responseHeaders,
        responseBody: error2.responseBody,
        data: error2.data,
        isRetryable: true
      });
    }
    return new APICallError({
      message: `Cannot connect to API: ${error2 instanceof Error ? error2.message : networkError.message}`,
      cause: error2,
      url,
      requestBodyValues,
      isRetryable: true
    });
  }
  return error2;
}
function normalizeHeaders(headers) {
  if (headers == null) {
    return {};
  }
  const normalized = {};
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      normalized[key.toLowerCase()] = value;
    });
  } else {
    if (!Array.isArray(headers)) {
      headers = Object.entries(headers);
    }
    for (const [key, value] of headers) {
      if (value != null) {
        normalized[key.toLowerCase()] = value;
      }
    }
  }
  return normalized;
}
function withUserAgentSuffix(headers, ...userAgentSuffixParts) {
  const normalizedHeaders = new Headers(normalizeHeaders(headers));
  const currentUserAgentHeader = normalizedHeaders.get("user-agent") || "";
  normalizedHeaders.set(
    "user-agent",
    [currentUserAgentHeader, ...userAgentSuffixParts].filter(Boolean).join(" ")
  );
  return Object.fromEntries(normalizedHeaders.entries());
}
async function cancelResponseBody(response) {
  var _a34;
  try {
    await ((_a34 = response.body) == null ? void 0 : _a34.cancel());
  } catch (e) {
  }
}
function isBrowserRuntime(globalThisAny = globalThis) {
  return globalThisAny.window != null;
}
function isSameOrigin(url, baseUrl) {
  try {
    return new URL(url).origin === new URL(baseUrl).origin;
  } catch (e) {
    return false;
  }
}
function validateDownloadUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    throw new DownloadError({
      url,
      message: `Invalid URL: ${url}`
    });
  }
  if (parsed.protocol === "data:") {
    return;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new DownloadError({
      url,
      message: `URL scheme must be http, https, or data, got ${parsed.protocol}`
    });
  }
  const hostname = parsed.hostname.toLowerCase().replace(/\.+$/, "");
  if (!hostname) {
    throw new DownloadError({
      url,
      message: `URL must have a hostname`
    });
  }
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".localhost")) {
    throw new DownloadError({
      url,
      message: `URL with hostname ${hostname} is not allowed`
    });
  }
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    const ipv62 = hostname.slice(1, -1);
    if (isPrivateIPv6(ipv62)) {
      throw new DownloadError({
        url,
        message: `URL with IPv6 address ${hostname} is not allowed`
      });
    }
    return;
  }
  if (isIPv4(hostname)) {
    if (isPrivateIPv4(hostname)) {
      throw new DownloadError({
        url,
        message: `URL with IP address ${hostname} is not allowed`
      });
    }
    return;
  }
}
function validateDownloadAddress({
  address,
  family,
  hostname
}) {
  const isUnsafe = family === 4 ? !isIPv4(address) || isPrivateIPv4(address) : family === 6 ? isPrivateIPv6(address) : true;
  if (isUnsafe) {
    throw new DownloadError({
      url: hostname,
      message: `Hostname ${hostname} resolved to disallowed IP address ${address}`
    });
  }
}
function isIPv4(hostname) {
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const num3 = Number(part);
    return Number.isInteger(num3) && num3 >= 0 && num3 <= 255 && String(num3) === part;
  });
}
function isPrivateIPv4(ip) {
  const parts = ip.split(".").map(Number);
  const [a, b, c] = parts;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0 && c === 0) return true;
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;
  return false;
}
function parseIPv6(ip) {
  let address = ip.toLowerCase();
  const zoneIndex = address.indexOf("%");
  if (zoneIndex !== -1) {
    address = address.slice(0, zoneIndex);
  }
  const halves = address.split("::");
  if (halves.length > 2) return null;
  const toGroups = /* @__PURE__ */ __name((segment) => {
    if (segment === "") return [];
    const groups = [];
    const parts = segment.split(":");
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.includes(".")) {
        if (i !== parts.length - 1 || !isIPv4(part)) return null;
        const [a, b, c, d] = part.split(".").map(Number);
        groups.push(a << 8 | b, c << 8 | d);
        continue;
      }
      if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
      groups.push(parseInt(part, 16));
    }
    return groups;
  }, "toGroups");
  const head = toGroups(halves[0]);
  if (head === null) return null;
  if (halves.length === 2) {
    const tail = toGroups(halves[1]);
    if (tail === null) return null;
    const fill = 8 - head.length - tail.length;
    if (fill < 0) return null;
    return [...head, ...new Array(fill).fill(0), ...tail];
  }
  return head.length === 8 ? head : null;
}
function isPrivateIPv6(ip) {
  const groups = parseIPv6(ip);
  if (groups === null) return true;
  const topZero = /* @__PURE__ */ __name((count) => groups.slice(0, count).every((group) => group === 0), "topZero");
  if (topZero(7) && (groups[7] === 0 || groups[7] === 1)) return true;
  if ((groups[0] & 65024) === 64512) return true;
  if ((groups[0] & 65472) === 65152) return true;
  if ((groups[0] & 65472) === 65216) return true;
  if ((groups[0] & 65280) === 65280) return true;
  if (groups[0] === 8193 && groups[1] === 3512) return true;
  if (groups[0] === 16383 && (groups[1] & 61440) === 0) return true;
  const embedsIPv4 = (
    // ::/96 — IPv4-compatible (deprecated)
    topZero(6) || // ::ffff:0:0/96 — IPv4-mapped (ffff in group 5)
    topZero(5) && groups[5] === 65535 || // ::ffff:0:0/96 — IPv4-translated form (ffff in group 4, group 5 zero)
    topZero(4) && groups[4] === 65535 && groups[5] === 0 || // 64:ff9b::/96 — NAT64 well-known prefix
    groups[0] === 100 && groups[1] === 65435 && groups[2] === 0 && groups[3] === 0 && groups[4] === 0 && groups[5] === 0 || // 64:ff9b:1::/48 — NAT64 local-use prefix
    groups[0] === 100 && groups[1] === 65435 && groups[2] === 1
  );
  if (embedsIPv4) {
    const a = groups[6] >> 8 & 255;
    const b = groups[6] & 255;
    const c = groups[7] >> 8 & 255;
    const d = groups[7] & 255;
    return isPrivateIPv4(`${a}.${b}.${c}.${d}`);
  }
  return false;
}
function createSafeLookup(lookup) {
  return ((hostname, options, callback) => {
    lookup(hostname, { ...options, all: true }, (error2, addresses) => {
      if (error2) {
        callback(error2);
        return;
      }
      try {
        const [firstAddress] = addresses;
        if (firstAddress == null) {
          throw new Error(`Hostname ${hostname} did not resolve to an address`);
        }
        for (const { address, family } of addresses) {
          validateDownloadAddress({ address, family, hostname });
        }
        if (options.all === true) {
          callback(null, addresses);
        } else {
          callback(
            null,
            firstAddress.address,
            firstAddress.family
          );
        }
      } catch (error22) {
        callback(
          error22 instanceof Error ? error22 : new Error(String(error22))
        );
      }
    });
  });
}
function isNodeRuntime() {
  var _a34, _b34, _c;
  const runtimeProcess = globalThis.process;
  return ((_a34 = runtimeProcess == null ? void 0 : runtimeProcess.release) == null ? void 0 : _a34.name) === "node" && ((_b34 = runtimeProcess.versions) == null ? void 0 : _b34.bun) == null && ((_c = runtimeProcess.versions) == null ? void 0 : _c.deno) == null && runtimeProcess.title !== "workerd" && globalThis.EdgeRuntime == null;
}
async function getDefaultDownloadFetch() {
  if (!isNodeRuntime()) {
    return globalThis.fetch;
  }
  return safeNodeFetchPromise != null ? safeNodeFetchPromise : safeNodeFetchPromise = Promise.resolve().then(createSafeNodeFetch);
}
function createSafeNodeFetch() {
  const { createRequire } = loadBuiltinModule("node:module");
  const { lookup } = loadBuiltinModule("node:dns");
  const { Agent, fetch: fetch2 } = createRequire(getCurrentModulePath())(
    "undici"
  );
  const dispatcher = new Agent({
    connect: {
      lookup: createSafeLookup(lookup)
    }
  });
  return ((input, init) => fetch2(
    input,
    {
      ...init,
      dispatcher
    }
  ));
}
function loadBuiltinModule(id) {
  var _a34;
  const processWithBuiltins = globalThis.process;
  const builtinModule = (_a34 = processWithBuiltins == null ? void 0 : processWithBuiltins.getBuiltinModule) == null ? void 0 : _a34.call(processWithBuiltins, id);
  if (builtinModule == null) {
    throw new Error(`Node.js built-in module ${id} is unavailable`);
  }
  return builtinModule;
}
function getCurrentModulePath() {
  const originalPrepareStackTrace = Error.prepareStackTrace;
  try {
    Error.prepareStackTrace = (_error, callSites) => callSites;
    const error2 = new Error("Capture current module path");
    Error.captureStackTrace(error2, getCurrentModulePath);
    const [caller] = error2.stack;
    const fileName = caller == null ? void 0 : caller.getFileName();
    if (fileName == null) {
      throw new Error("Unable to determine the current module path");
    }
    return fileName;
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
}
function sanitizeRequestHeaders(input) {
  const headers = new Headers(input);
  for (const name34 of BLOCKED_REQUEST_HEADERS) {
    headers.delete(name34);
  }
  return headers;
}
async function getValidatedFetch(customFetch) {
  return customFetch == null || customFetch === globalThis.fetch ? await getDefaultDownloadFetch() : customFetch;
}
async function fetchWithValidatedRedirects({
  url,
  headers,
  abortSignal,
  maxRedirects = MAX_DOWNLOAD_REDIRECTS,
  fetch: customFetch,
  trustedOrigin
}) {
  var _a34;
  let currentHeaders = headers === void 0 ? void 0 : sanitizeRequestHeaders(headers);
  const perHopInit = /* @__PURE__ */ __name((redirect) => {
    const init = { signal: abortSignal, redirect };
    if (currentHeaders !== void 0) {
      init.headers = new Headers(currentHeaders);
    }
    return init;
  }, "perHopInit");
  let currentUrl = url;
  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    const isTrustedHop = trustedOrigin !== void 0 && isSameOrigin(currentUrl, trustedOrigin);
    if (!isTrustedHop) {
      validateDownloadUrl(currentUrl);
    }
    const fetch2 = isTrustedHop && customFetch != null ? customFetch : isTrustedHop ? globalThis.fetch : await getValidatedFetch(customFetch);
    const response = await fetch2(currentUrl, perHopInit("manual"));
    if (response.type === "opaqueredirect") {
      if (!isBrowserRuntime()) {
        throw new DownloadError({
          url,
          message: `Redirect from ${currentUrl} could not be validated and was blocked`
        });
      }
      return await fetch2(currentUrl, perHopInit("follow"));
    }
    const location = (_a34 = response.headers) == null ? void 0 : _a34.get("location");
    if (REDIRECT_STATUS_CODES.has(response.status) && location) {
      await cancelResponseBody(response);
      const nextUrl = new URL(location, currentUrl).toString();
      if (currentHeaders !== void 0 && !isSameOrigin(nextUrl, currentUrl)) {
        const userAgent = currentHeaders.get("user-agent");
        currentHeaders = new Headers(
          userAgent == null ? void 0 : { "user-agent": userAgent }
        );
      }
      currentUrl = nextUrl;
      continue;
    }
    return response;
  }
  throw new DownloadError({
    url,
    message: `Too many redirects (max ${maxRedirects})`
  });
}
async function readResponseWithSizeLimit({
  response,
  url,
  maxBytes = DEFAULT_MAX_DOWNLOAD_SIZE
}) {
  const contentLength = response.headers.get("content-length");
  if (contentLength != null) {
    const length = parseInt(contentLength, 10);
    if (!isNaN(length) && length > maxBytes) {
      await cancelResponseBody(response);
      throw new DownloadError({
        url,
        message: `Download of ${url} exceeded maximum size of ${maxBytes} bytes (Content-Length: ${length}).`
      });
    }
  }
  const body = response.body;
  if (body == null) {
    return new Uint8Array(0);
  }
  const reader = body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      totalBytes += value.length;
      if (totalBytes > maxBytes) {
        throw new DownloadError({
          url,
          message: `Download of ${url} exceeded maximum size of ${maxBytes} bytes.`
        });
      }
      chunks.push(value);
    }
  } finally {
    try {
      await reader.cancel();
    } catch (e) {
    } finally {
      reader.releaseLock();
    }
  }
  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
function isBuffer(value) {
  var _a34, _b34;
  return (_b34 = (_a34 = globalThis.Buffer) == null ? void 0 : _a34.isBuffer(value)) != null ? _b34 : false;
}
function isRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
function loadApiKey({
  apiKey,
  environmentVariableName,
  apiKeyParameterName = "apiKey",
  description
}) {
  if (typeof apiKey === "string") {
    return apiKey;
  }
  if (apiKey != null) {
    throw new LoadAPIKeyError({
      message: `${description} API key must be a string.`
    });
  }
  if (typeof process === "undefined") {
    throw new LoadAPIKeyError({
      message: `${description} API key is missing. Pass it using the '${apiKeyParameterName}' parameter. Environment variables are not supported in this environment.`
    });
  }
  apiKey = process.env[environmentVariableName];
  if (apiKey == null) {
    throw new LoadAPIKeyError({
      message: `${description} API key is missing. Pass it using the '${apiKeyParameterName}' parameter or the ${environmentVariableName} environment variable.`
    });
  }
  if (typeof apiKey !== "string") {
    throw new LoadAPIKeyError({
      message: `${description} API key must be a string. The value of the ${environmentVariableName} environment variable is not a string.`
    });
  }
  return apiKey;
}
function loadOptionalSetting({
  settingValue,
  environmentVariableName
}) {
  if (typeof settingValue === "string") {
    return settingValue;
  }
  if (settingValue != null || typeof process === "undefined") {
    return void 0;
  }
  settingValue = process.env[environmentVariableName];
  if (settingValue == null || typeof settingValue !== "string") {
    return void 0;
  }
  return settingValue;
}
function normalizeBatchRequestCounts({
  total,
  pending,
  completed,
  failed
}) {
  if (isNonNegativeSafeInteger(total) && isNonNegativeSafeInteger(pending) && isNonNegativeSafeInteger(completed) && isNonNegativeSafeInteger(failed) && pending + completed + failed === total) {
    return {
      total,
      pending,
      completed,
      failed
    };
  }
  return void 0;
}
function isNonNegativeSafeInteger(value) {
  return value != null && Number.isSafeInteger(value) && value >= 0;
}
function _parse3(text2) {
  const obj = JSON.parse(text2);
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (suspectProtoRx.test(text2) === false && suspectConstructorRx.test(text2) === false) {
    return obj;
  }
  return filter(obj);
}
function filter(obj) {
  let next = [obj];
  while (next.length) {
    const nodes = next;
    next = [];
    for (const node2 of nodes) {
      if (Object.prototype.hasOwnProperty.call(node2, "__proto__")) {
        throw new SyntaxError("Object contains forbidden prototype property");
      }
      if (Object.prototype.hasOwnProperty.call(node2, "constructor") && node2.constructor !== null && typeof node2.constructor === "object" && Object.prototype.hasOwnProperty.call(node2.constructor, "prototype")) {
        throw new SyntaxError("Object contains forbidden prototype property");
      }
      for (const key in node2) {
        const value = node2[key];
        if (value && typeof value === "object") {
          next.push(value);
        }
      }
    }
  }
  return obj;
}
function secureJsonParse(text2) {
  const { stackTraceLimit } = Error;
  try {
    Error.stackTraceLimit = 0;
  } catch (e) {
    return _parse3(text2);
  }
  try {
    return _parse3(text2);
  } finally {
    Error.stackTraceLimit = stackTraceLimit;
  }
}
function addAdditionalPropertiesToJsonSchema(jsonSchema2) {
  if (jsonSchema2.type === "object" || Array.isArray(jsonSchema2.type) && jsonSchema2.type.includes("object")) {
    const { additionalProperties } = jsonSchema2;
    jsonSchema2.additionalProperties = additionalProperties != null && typeof additionalProperties !== "boolean" ? visit(additionalProperties) : false;
    const { properties } = jsonSchema2;
    if (properties != null) {
      for (const key of Object.keys(properties)) {
        properties[key] = visit(properties[key]);
      }
    }
  }
  if (jsonSchema2.items != null) {
    jsonSchema2.items = Array.isArray(jsonSchema2.items) ? jsonSchema2.items.map(visit) : visit(jsonSchema2.items);
  }
  if (jsonSchema2.anyOf != null) {
    jsonSchema2.anyOf = jsonSchema2.anyOf.map(visit);
  }
  if (jsonSchema2.allOf != null) {
    jsonSchema2.allOf = jsonSchema2.allOf.map(visit);
  }
  if (jsonSchema2.oneOf != null) {
    jsonSchema2.oneOf = jsonSchema2.oneOf.map(visit);
  }
  const { definitions } = jsonSchema2;
  if (definitions != null) {
    for (const key of Object.keys(definitions)) {
      definitions[key] = visit(definitions[key]);
    }
  }
  return jsonSchema2;
}
function visit(def) {
  if (typeof def === "boolean") return def;
  return addAdditionalPropertiesToJsonSchema(def);
}
function parseAnyDef() {
  return {};
}
function parseArrayDef(def, refs) {
  var _a34, _b34, _c;
  const res = {
    type: "array"
  };
  if (((_a34 = def.type) == null ? void 0 : _a34._def) && ((_c = (_b34 = def.type) == null ? void 0 : _b34._def) == null ? void 0 : _c.typeName) !== "ZodAny") {
    res.items = parseDef(def.type._def, {
      ...refs,
      currentPath: [...refs.currentPath, "items"]
    });
  }
  if (def.minLength) {
    res.minItems = def.minLength.value;
  }
  if (def.maxLength) {
    res.maxItems = def.maxLength.value;
  }
  if (def.exactLength) {
    res.minItems = def.exactLength.value;
    res.maxItems = def.exactLength.value;
  }
  return res;
}
function parseBigintDef(def) {
  const res = {
    type: "integer",
    format: "int64"
  };
  if (!def.checks) return res;
  for (const check of def.checks) {
    switch (check.kind) {
      case "min":
        if (check.inclusive) {
          res.minimum = check.value;
        } else {
          res.exclusiveMinimum = check.value;
        }
        break;
      case "max":
        if (check.inclusive) {
          res.maximum = check.value;
        } else {
          res.exclusiveMaximum = check.value;
        }
        break;
      case "multipleOf":
        res.multipleOf = check.value;
        break;
    }
  }
  return res;
}
function parseBooleanDef() {
  return { type: "boolean" };
}
function parseBrandedDef(_def, refs) {
  return parseDef(_def.type._def, refs);
}
function parseDateDef(def, refs, overrideDateStrategy) {
  const strategy = overrideDateStrategy != null ? overrideDateStrategy : refs.dateStrategy;
  if (Array.isArray(strategy)) {
    return {
      anyOf: strategy.map((item) => parseDateDef(def, refs, item))
    };
  }
  switch (strategy) {
    case "string":
    case "format:date-time":
      return {
        type: "string",
        format: "date-time"
      };
    case "format:date":
      return {
        type: "string",
        format: "date"
      };
    case "integer":
      return integerDateParser(def);
  }
}
function parseDefaultDef(_def, refs) {
  return {
    ...parseDef(_def.innerType._def, refs),
    default: _def.defaultValue()
  };
}
function parseEffectsDef(_def, refs) {
  return refs.effectStrategy === "input" ? parseDef(_def.schema._def, refs) : parseAnyDef();
}
function parseEnumDef(def) {
  return {
    type: "string",
    enum: Array.from(def.values)
  };
}
function parseIntersectionDef(def, refs) {
  const allOf = [
    parseDef(def.left._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "0"]
    }),
    parseDef(def.right._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "1"]
    })
  ].filter((x) => !!x);
  const mergedAllOf = [];
  allOf.forEach((schema) => {
    if (isJsonSchema7AllOfType(schema)) {
      mergedAllOf.push(...schema.allOf);
    } else {
      let nestedSchema = schema;
      if ("additionalProperties" in schema && schema.additionalProperties === false) {
        const { additionalProperties: _additionalProperties, ...rest } = schema;
        nestedSchema = rest;
      }
      mergedAllOf.push(nestedSchema);
    }
  });
  return mergedAllOf.length ? { allOf: mergedAllOf } : void 0;
}
function parseLiteralDef(def) {
  const parsedType2 = typeof def.value;
  if (parsedType2 !== "bigint" && parsedType2 !== "number" && parsedType2 !== "boolean" && parsedType2 !== "string") {
    return {
      type: Array.isArray(def.value) ? "array" : "object"
    };
  }
  return {
    type: parsedType2 === "bigint" ? "integer" : parsedType2,
    const: def.value
  };
}
function parseStringDef(def, refs) {
  const res = {
    type: "string"
  };
  if (def.checks) {
    for (const check of def.checks) {
      switch (check.kind) {
        case "min":
          res.minLength = typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value;
          break;
        case "max":
          res.maxLength = typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value;
          break;
        case "email":
          switch (refs.emailStrategy) {
            case "format:email":
              addFormat(res, "email", check.message, refs);
              break;
            case "format:idn-email":
              addFormat(res, "idn-email", check.message, refs);
              break;
            case "pattern:zod":
              addPattern2(res, zodPatterns.email, check.message, refs);
              break;
          }
          break;
        case "url":
          addFormat(res, "uri", check.message, refs);
          break;
        case "uuid":
          addFormat(res, "uuid", check.message, refs);
          break;
        case "regex":
          addPattern2(res, check.regex, check.message, refs);
          break;
        case "cuid":
          addPattern2(res, zodPatterns.cuid, check.message, refs);
          break;
        case "cuid2":
          addPattern2(res, zodPatterns.cuid2, check.message, refs);
          break;
        case "startsWith":
          addPattern2(
            res,
            RegExp(`^${escapeLiteralCheckValue(check.value, refs)}`),
            check.message,
            refs
          );
          break;
        case "endsWith":
          addPattern2(
            res,
            RegExp(`${escapeLiteralCheckValue(check.value, refs)}$`),
            check.message,
            refs
          );
          break;
        case "datetime":
          addFormat(res, "date-time", check.message, refs);
          break;
        case "date":
          addFormat(res, "date", check.message, refs);
          break;
        case "time":
          addFormat(res, "time", check.message, refs);
          break;
        case "duration":
          addFormat(res, "duration", check.message, refs);
          break;
        case "length":
          res.minLength = typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value;
          res.maxLength = typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value;
          break;
        case "includes": {
          addPattern2(
            res,
            RegExp(escapeLiteralCheckValue(check.value, refs)),
            check.message,
            refs
          );
          break;
        }
        case "ip": {
          if (check.version !== "v6") {
            addFormat(res, "ipv4", check.message, refs);
          }
          if (check.version !== "v4") {
            addFormat(res, "ipv6", check.message, refs);
          }
          break;
        }
        case "base64url":
          addPattern2(res, zodPatterns.base64url, check.message, refs);
          break;
        case "jwt":
          addPattern2(res, zodPatterns.jwt, check.message, refs);
          break;
        case "cidr": {
          if (check.version !== "v6") {
            addPattern2(res, zodPatterns.ipv4Cidr, check.message, refs);
          }
          if (check.version !== "v4") {
            addPattern2(res, zodPatterns.ipv6Cidr, check.message, refs);
          }
          break;
        }
        case "emoji":
          addPattern2(res, zodPatterns.emoji(), check.message, refs);
          break;
        case "ulid": {
          addPattern2(res, zodPatterns.ulid, check.message, refs);
          break;
        }
        case "base64": {
          switch (refs.base64Strategy) {
            case "format:binary": {
              addFormat(res, "binary", check.message, refs);
              break;
            }
            case "contentEncoding:base64": {
              res.contentEncoding = "base64";
              break;
            }
            case "pattern:zod": {
              addPattern2(res, zodPatterns.base64, check.message, refs);
              break;
            }
          }
          break;
        }
        case "nanoid": {
          addPattern2(res, zodPatterns.nanoid, check.message, refs);
        }
        case "toLowerCase":
        case "toUpperCase":
        case "trim":
          break;
        default:
          /* @__PURE__ */ ((_) => {
          })(check);
      }
    }
  }
  return res;
}
function escapeLiteralCheckValue(literal2, refs) {
  return refs.patternStrategy === "escape" ? escapeNonAlphaNumeric(literal2) : literal2;
}
function escapeNonAlphaNumeric(source) {
  let result = "";
  for (let i = 0; i < source.length; i++) {
    if (!ALPHA_NUMERIC.has(source[i])) {
      result += "\\";
    }
    result += source[i];
  }
  return result;
}
function addFormat(schema, value, message, refs) {
  var _a34;
  if (schema.format || ((_a34 = schema.anyOf) == null ? void 0 : _a34.some((x) => x.format))) {
    if (!schema.anyOf) {
      schema.anyOf = [];
    }
    if (schema.format) {
      schema.anyOf.push({
        format: schema.format
      });
      delete schema.format;
    }
    schema.anyOf.push({
      format: value,
      ...message && refs.errorMessages && { errorMessage: { format: message } }
    });
  } else {
    schema.format = value;
  }
}
function addPattern2(schema, regex, message, refs) {
  var _a34;
  if (schema.pattern || ((_a34 = schema.allOf) == null ? void 0 : _a34.some((x) => x.pattern))) {
    if (!schema.allOf) {
      schema.allOf = [];
    }
    if (schema.pattern) {
      schema.allOf.push({
        pattern: schema.pattern
      });
      delete schema.pattern;
    }
    schema.allOf.push({
      pattern: stringifyRegExpWithFlags(regex, refs),
      ...message && refs.errorMessages && { errorMessage: { pattern: message } }
    });
  } else {
    schema.pattern = stringifyRegExpWithFlags(regex, refs);
  }
}
function stringifyRegExpWithFlags(regex, refs) {
  var _a34;
  if (!refs.applyRegexFlags || !regex.flags) {
    return regex.source;
  }
  const flags = {
    i: regex.flags.includes("i"),
    // Case-insensitive
    m: regex.flags.includes("m"),
    // `^` and `$` matches adjacent to newline characters
    s: regex.flags.includes("s")
    // `.` matches newlines
  };
  const source = flags.i ? regex.source.toLowerCase() : regex.source;
  let pattern = "";
  let isEscaped = false;
  let inCharGroup = false;
  let inCharRange = false;
  for (let i = 0; i < source.length; i++) {
    if (isEscaped) {
      pattern += source[i];
      isEscaped = false;
      continue;
    }
    if (flags.i) {
      if (inCharGroup) {
        if (source[i].match(/[a-z]/)) {
          if (inCharRange) {
            pattern += source[i];
            pattern += `${source[i - 2]}-${source[i]}`.toUpperCase();
            inCharRange = false;
          } else if (source[i + 1] === "-" && ((_a34 = source[i + 2]) == null ? void 0 : _a34.match(/[a-z]/))) {
            pattern += source[i];
            inCharRange = true;
          } else {
            pattern += `${source[i]}${source[i].toUpperCase()}`;
          }
          continue;
        }
      } else if (source[i].match(/[a-z]/)) {
        pattern += `[${source[i]}${source[i].toUpperCase()}]`;
        continue;
      }
    }
    if (flags.m) {
      if (source[i] === "^") {
        pattern += `(^|(?<=[\r
]))`;
        continue;
      } else if (source[i] === "$") {
        pattern += `($|(?=[\r
]))`;
        continue;
      }
    }
    if (flags.s && source[i] === ".") {
      pattern += inCharGroup ? `${source[i]}\r
` : `[${source[i]}\r
]`;
      continue;
    }
    pattern += source[i];
    if (source[i] === "\\") {
      isEscaped = true;
    } else if (inCharGroup && source[i] === "]") {
      inCharGroup = false;
    } else if (!inCharGroup && source[i] === "[") {
      inCharGroup = true;
    }
  }
  try {
    new RegExp(pattern);
  } catch (e) {
    console.warn(
      `Could not convert regex pattern at ${refs.currentPath.join(
        "/"
      )} to a flag-independent form! Falling back to the flag-ignorant source`
    );
    return regex.source;
  }
  return pattern;
}
function parseRecordDef(def, refs) {
  var _a34, _b34, _c, _d, _e, _f;
  const schema = {
    type: "object",
    additionalProperties: (_a34 = parseDef(def.valueType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    })) != null ? _a34 : refs.allowedAdditionalProperties
  };
  if (((_b34 = def.keyType) == null ? void 0 : _b34._def.typeName) === "ZodString" && ((_c = def.keyType._def.checks) == null ? void 0 : _c.length)) {
    const { type: _type, ...keyType } = parseStringDef(def.keyType._def, refs);
    return {
      ...schema,
      propertyNames: keyType
    };
  } else if (((_d = def.keyType) == null ? void 0 : _d._def.typeName) === "ZodEnum") {
    return {
      ...schema,
      propertyNames: {
        enum: def.keyType._def.values
      }
    };
  } else if (((_e = def.keyType) == null ? void 0 : _e._def.typeName) === "ZodBranded" && def.keyType._def.type._def.typeName === "ZodString" && ((_f = def.keyType._def.type._def.checks) == null ? void 0 : _f.length)) {
    const { type: _type, ...keyType } = parseBrandedDef(
      def.keyType._def,
      refs
    );
    return {
      ...schema,
      propertyNames: keyType
    };
  }
  return schema;
}
function parseMapDef(def, refs) {
  if (refs.mapStrategy === "record") {
    return parseRecordDef(def, refs);
  }
  const keys = parseDef(def.keyType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "0"]
  }) || parseAnyDef();
  const values = parseDef(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "1"]
  }) || parseAnyDef();
  return {
    type: "array",
    maxItems: 125,
    items: {
      type: "array",
      items: [keys, values],
      minItems: 2,
      maxItems: 2
    }
  };
}
function parseNativeEnumDef(def) {
  const object3 = def.values;
  const actualKeys = Object.keys(def.values).filter((key) => {
    return typeof object3[object3[key]] !== "number";
  });
  const actualValues = actualKeys.map((key) => object3[key]);
  const parsedTypes = Array.from(
    new Set(actualValues.map((values) => typeof values))
  );
  return {
    type: parsedTypes.length === 1 ? parsedTypes[0] === "string" ? "string" : "number" : ["string", "number"],
    enum: actualValues
  };
}
function parseNeverDef() {
  return { not: parseAnyDef() };
}
function parseNullDef() {
  return {
    type: "null"
  };
}
function parseUnionDef(def, refs) {
  const options = def.options instanceof Map ? Array.from(def.options.values()) : def.options;
  if (options.every(
    (x) => x._def.typeName in primitiveMappings && (!x._def.checks || !x._def.checks.length)
  )) {
    const types = options.reduce((types2, x) => {
      const type = primitiveMappings[x._def.typeName];
      return type && !types2.includes(type) ? [...types2, type] : types2;
    }, []);
    return {
      type: types.length > 1 ? types : types[0]
    };
  } else if (options.every((x) => x._def.typeName === "ZodLiteral" && !x.description)) {
    const types = options.reduce(
      (acc, x) => {
        const type = typeof x._def.value;
        switch (type) {
          case "string":
          case "number":
          case "boolean":
            return [...acc, type];
          case "bigint":
            return [...acc, "integer"];
          case "object":
            if (x._def.value === null) return [...acc, "null"];
          case "symbol":
          case "undefined":
          case "function":
          default:
            return acc;
        }
      },
      []
    );
    if (types.length === options.length) {
      const uniqueTypes = types.filter((x, i, a) => a.indexOf(x) === i);
      return {
        type: uniqueTypes.length > 1 ? uniqueTypes : uniqueTypes[0],
        enum: options.reduce(
          (acc, x) => {
            return acc.includes(x._def.value) ? acc : [...acc, x._def.value];
          },
          []
        )
      };
    }
  } else if (options.every((x) => x._def.typeName === "ZodEnum")) {
    return {
      type: "string",
      enum: options.reduce(
        (acc, x) => [
          ...acc,
          ...x._def.values.filter((x2) => !acc.includes(x2))
        ],
        []
      )
    };
  }
  return asAnyOf(def, refs);
}
function parseNullableDef(def, refs) {
  if (["ZodString", "ZodNumber", "ZodBigInt", "ZodBoolean", "ZodNull"].includes(
    def.innerType._def.typeName
  ) && (!def.innerType._def.checks || !def.innerType._def.checks.length)) {
    return {
      type: [
        primitiveMappings[def.innerType._def.typeName],
        "null"
      ]
    };
  }
  const base = parseDef(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "0"]
  });
  return base && { anyOf: [base, { type: "null" }] };
}
function parseNumberDef(def) {
  const res = {
    type: "number"
  };
  if (!def.checks) return res;
  for (const check of def.checks) {
    switch (check.kind) {
      case "int":
        res.type = "integer";
        break;
      case "min":
        if (check.inclusive) {
          res.minimum = check.value;
        } else {
          res.exclusiveMinimum = check.value;
        }
        break;
      case "max":
        if (check.inclusive) {
          res.maximum = check.value;
        } else {
          res.exclusiveMaximum = check.value;
        }
        break;
      case "multipleOf":
        res.multipleOf = check.value;
        break;
    }
  }
  return res;
}
function parseObjectDef(def, refs) {
  const result = {
    type: "object",
    properties: {}
  };
  const required2 = [];
  const shape = def.shape();
  for (const propName in shape) {
    let propDef = shape[propName];
    if (propDef === void 0 || propDef._def === void 0) {
      continue;
    }
    const propOptional = safeIsOptional(propDef);
    const parsedDef = parseDef(propDef._def, {
      ...refs,
      currentPath: [...refs.currentPath, "properties", propName],
      propertyPath: [...refs.currentPath, "properties", propName]
    });
    if (parsedDef === void 0) {
      continue;
    }
    result.properties[propName] = parsedDef;
    if (!propOptional) {
      required2.push(propName);
    }
  }
  if (required2.length) {
    result.required = required2;
  }
  const additionalProperties = decideAdditionalProperties(def, refs);
  if (additionalProperties !== void 0) {
    result.additionalProperties = additionalProperties;
  }
  return result;
}
function decideAdditionalProperties(def, refs) {
  if (def.catchall._def.typeName !== "ZodNever") {
    return parseDef(def.catchall._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    });
  }
  switch (def.unknownKeys) {
    case "passthrough":
      return refs.allowedAdditionalProperties;
    case "strict":
      return refs.rejectedAdditionalProperties;
    case "strip":
      return refs.removeAdditionalStrategy === "strict" ? refs.allowedAdditionalProperties : refs.rejectedAdditionalProperties;
  }
}
function safeIsOptional(schema) {
  try {
    return schema.isOptional();
  } catch (e) {
    return true;
  }
}
function parsePromiseDef(def, refs) {
  return parseDef(def.type._def, refs);
}
function parseSetDef(def, refs) {
  const items = parseDef(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items"]
  });
  const schema = {
    type: "array",
    uniqueItems: true,
    items
  };
  if (def.minSize) {
    schema.minItems = def.minSize.value;
  }
  if (def.maxSize) {
    schema.maxItems = def.maxSize.value;
  }
  return schema;
}
function parseTupleDef(def, refs) {
  if (def.rest) {
    return {
      type: "array",
      minItems: def.items.length,
      items: def.items.map(
        (x, i) => parseDef(x._def, {
          ...refs,
          currentPath: [...refs.currentPath, "items", `${i}`]
        })
      ).reduce(
        (acc, x) => x === void 0 ? acc : [...acc, x],
        []
      ),
      additionalItems: parseDef(def.rest._def, {
        ...refs,
        currentPath: [...refs.currentPath, "additionalItems"]
      })
    };
  } else {
    return {
      type: "array",
      minItems: def.items.length,
      maxItems: def.items.length,
      items: def.items.map(
        (x, i) => parseDef(x._def, {
          ...refs,
          currentPath: [...refs.currentPath, "items", `${i}`]
        })
      ).reduce(
        (acc, x) => x === void 0 ? acc : [...acc, x],
        []
      )
    };
  }
}
function parseUndefinedDef() {
  return {
    not: parseAnyDef()
  };
}
function parseUnknownDef() {
  return parseAnyDef();
}
function parseDef(def, refs, forceResolution = false) {
  var _a34;
  const seenItem = refs.seen.get(def);
  if (refs.override) {
    const overrideResult = (_a34 = refs.override) == null ? void 0 : _a34.call(
      refs,
      def,
      refs,
      seenItem,
      forceResolution
    );
    if (overrideResult !== ignoreOverride) {
      return overrideResult;
    }
  }
  if (seenItem && !forceResolution) {
    const seenSchema = get$ref(seenItem, refs);
    if (seenSchema !== void 0) {
      return seenSchema;
    }
  }
  const newItem = { def, path: refs.currentPath, jsonSchema: void 0 };
  refs.seen.set(def, newItem);
  const jsonSchemaOrGetter = selectParser(def, def.typeName, refs);
  const jsonSchema2 = typeof jsonSchemaOrGetter === "function" ? parseDef(jsonSchemaOrGetter(), refs) : jsonSchemaOrGetter;
  if (jsonSchema2) {
    addMeta(def, refs, jsonSchema2);
  }
  if (refs.postProcess) {
    const postProcessResult = refs.postProcess(jsonSchema2, def, refs);
    newItem.jsonSchema = jsonSchema2;
    return postProcessResult;
  }
  newItem.jsonSchema = jsonSchema2;
  return jsonSchema2;
}
function lazySchema(createSchema) {
  let schema;
  return () => {
    if (schema == null) {
      schema = createSchema();
    }
    return schema;
  };
}
function jsonSchema(jsonSchema2, {
  validate: validate2
} = {}) {
  return {
    [schemaSymbol]: true,
    _type: void 0,
    // should never be used directly
    get jsonSchema() {
      if (typeof jsonSchema2 === "function") {
        jsonSchema2 = jsonSchema2();
      }
      return jsonSchema2;
    },
    validate: validate2
  };
}
function isSchema(value) {
  return typeof value === "object" && value !== null && schemaSymbol in value && value[schemaSymbol] === true && "jsonSchema" in value && "validate" in value;
}
function asSchema(schema) {
  return schema == null ? jsonSchema({
    type: "object",
    properties: {},
    additionalProperties: false
  }) : isSchema(schema) ? schema : "~standard" in schema ? schema["~standard"].vendor === "zod" ? zodSchema(schema) : standardSchema(schema) : schema();
}
function standardSchema(standardSchema2) {
  return jsonSchema(
    () => {
      if (!hasStandardJsonSchema(standardSchema2)) {
        throw new Error(
          `Standard schema vendor '${standardSchema2["~standard"].vendor}' does not support JSON Schema conversion.`
        );
      }
      return addAdditionalPropertiesToJsonSchema(
        standardSchema2["~standard"].jsonSchema.input({
          target: "draft-07"
        })
      );
    },
    {
      validate: /* @__PURE__ */ __name(async (value) => {
        const result = await standardSchema2["~standard"].validate(value);
        return "value" in result ? { success: true, value: result.value } : {
          success: false,
          error: new TypeValidationError({
            value,
            cause: result.issues
          })
        };
      }, "validate")
    }
  );
}
function hasStandardJsonSchema(schema) {
  return schema["~standard"].jsonSchema != null;
}
function zod3Schema(zodSchema2, options) {
  var _a34;
  const useReferences = (_a34 = options == null ? void 0 : options.useReferences) != null ? _a34 : false;
  return jsonSchema(
    // defer json schema creation to avoid unnecessary computation when only validation is needed
    () => zod3ToJsonSchema(zodSchema2, {
      $refStrategy: useReferences ? "root" : "none"
    }),
    {
      validate: /* @__PURE__ */ __name(async (value) => {
        const result = await zodSchema2.safeParseAsync(value);
        return result.success ? { success: true, value: result.data } : { success: false, error: result.error };
      }, "validate")
    }
  );
}
function zod4Schema(zodSchema2, options) {
  var _a34;
  const useReferences = (_a34 = options == null ? void 0 : options.useReferences) != null ? _a34 : false;
  return jsonSchema(
    // defer json schema creation to avoid unnecessary computation when only validation is needed
    () => addAdditionalPropertiesToJsonSchema(
      toJSONSchema(zodSchema2, {
        target: "draft-7",
        io: "input",
        reused: useReferences ? "ref" : "inline"
      })
    ),
    {
      validate: /* @__PURE__ */ __name(async (value) => {
        const result = await safeParseAsync(zodSchema2, value);
        return result.success ? { success: true, value: result.data } : { success: false, error: result.error };
      }, "validate")
    }
  );
}
function isZod4Schema(zodSchema2) {
  return "_zod" in zodSchema2;
}
function zodSchema(zodSchema2, options) {
  if (isZod4Schema(zodSchema2)) {
    return zod4Schema(zodSchema2, options);
  } else {
    return zod3Schema(zodSchema2, options);
  }
}
async function validateTypes({
  value,
  schema,
  context
}) {
  const result = await safeValidateTypes({ value, schema, context });
  if (!result.success) {
    throw TypeValidationError.wrap({ value, cause: result.error, context });
  }
  return result.value;
}
async function safeValidateTypes({
  value,
  schema,
  context
}) {
  const actualSchema = asSchema(schema);
  try {
    if (actualSchema.validate == null) {
      return { success: true, value, rawValue: value };
    }
    const result = await actualSchema.validate(value);
    if (result.success) {
      return { success: true, value: result.value, rawValue: value };
    }
    return {
      success: false,
      error: TypeValidationError.wrap({ value, cause: result.error, context }),
      rawValue: value
    };
  } catch (error2) {
    return {
      success: false,
      error: TypeValidationError.wrap({ value, cause: error2, context }),
      rawValue: value
    };
  }
}
async function parseJSON({
  text: text2,
  schema
}) {
  try {
    const value = secureJsonParse(text2);
    if (schema == null) {
      return value;
    }
    return await validateTypes({ value, schema });
  } catch (error2) {
    if (JSONParseError.isInstance(error2) || TypeValidationError.isInstance(error2)) {
      throw error2;
    }
    throw new JSONParseError({ text: text2, cause: error2 });
  }
}
async function safeParseJSON({
  text: text2,
  schema
}) {
  try {
    const value = secureJsonParse(text2);
    if (schema == null) {
      return { success: true, value, rawValue: value };
    }
    return await safeValidateTypes({ value, schema });
  } catch (error2) {
    return {
      success: false,
      error: JSONParseError.isInstance(error2) ? error2 : new JSONParseError({ text: text2, cause: error2 }),
      rawValue: void 0
    };
  }
}
function parseJsonEventStream({
  stream,
  schema
}) {
  return stream.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream()).pipeThrough(
    new TransformStream({
      async transform({ data }, controller) {
        if (data === "[DONE]") {
          return;
        }
        controller.enqueue(await safeParseJSON({ text: data, schema }));
      }
    })
  );
}
function tool(tool2) {
  return tool2;
}
function createProviderExecutedToolFactory({
  id,
  inputSchema,
  outputSchema: outputSchema2,
  supportsDeferredResults
}) {
  return ({
    onInputStart,
    onInputDelta,
    onInputAvailable,
    ...args
  }) => tool({
    type: "provider",
    isProviderExecuted: true,
    id,
    args,
    inputSchema,
    outputSchema: outputSchema2,
    onInputStart,
    onInputDelta,
    onInputAvailable,
    supportsDeferredResults
  });
}
async function resolve(value) {
  if (typeof value === "function") {
    value = value();
  }
  return Promise.resolve(value);
}
async function retryWithExponentialBackoffInternal(f, {
  maxRetries,
  delayInMs,
  backoffFactor,
  abortSignal,
  shouldRetry,
  getDelayInMs,
  createRetryError
}, errors = []) {
  try {
    return await f();
  } catch (error2) {
    if (isAbortError(error2)) {
      throw error2;
    }
    if (maxRetries === 0) {
      throw error2;
    }
    const errorMessage = getErrorMessage(error2);
    const newErrors = [...errors, error2];
    const tryNumber = newErrors.length;
    if (tryNumber > maxRetries) {
      throw createRetryError({
        message: `Failed after ${tryNumber} attempts. Last error: ${errorMessage}`,
        reason: "maxRetriesExceeded",
        errors: newErrors
      });
    }
    if (await shouldRetry(error2) && tryNumber <= maxRetries) {
      await delay(
        getDelayInMs({
          error: error2,
          exponentialBackoffDelay: delayInMs
        }),
        { abortSignal }
      );
      return retryWithExponentialBackoffInternal(
        f,
        {
          maxRetries,
          delayInMs: backoffFactor * delayInMs,
          backoffFactor,
          abortSignal,
          shouldRetry,
          getDelayInMs,
          createRetryError
        },
        newErrors
      );
    }
    if (tryNumber === 1) {
      throw error2;
    }
    throw createRetryError({
      message: `Failed after ${tryNumber} attempts with non-retryable error: '${errorMessage}'`,
      reason: "errorNotRetryable",
      errors: newErrors
    });
  }
}
function wrapResponseBodyStream({
  stream,
  url,
  requestBodyValues,
  statusCode,
  responseHeaders
}) {
  const reader = stream.getReader();
  let readerReleased = false;
  const releaseReader = /* @__PURE__ */ __name(() => {
    if (!readerReleased) {
      reader.releaseLock();
      readerReleased = true;
    }
  }, "releaseReader");
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          releaseReader();
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error2) {
        releaseReader();
        if (isAbortError(error2)) {
          controller.error(error2);
          return;
        }
        controller.error(
          handleFetchError({
            error: new APICallError({
              message: "Failed to process successful response",
              cause: error2,
              statusCode,
              url,
              responseHeaders,
              requestBodyValues
            }),
            url,
            requestBodyValues
          })
        );
      }
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason);
      } finally {
        releaseReader();
      }
    }
  });
}
async function readResponseBodyAsText({
  response,
  url
}) {
  return textDecoder2.decode(
    await readResponseWithSizeLimit({
      response,
      url
    })
  );
}
async function* parseJsonLines({
  stream,
  schema
}) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        finished = true;
        buffer += decoder.decode();
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      let lineEnd = buffer.indexOf("\n");
      while (lineEnd !== -1) {
        const line = buffer.slice(0, lineEnd).replace(/\r$/, "");
        buffer = buffer.slice(lineEnd + 1);
        if (line.trim().length > 0) {
          yield await parseJSON({ text: line, schema });
        }
        lineEnd = buffer.indexOf("\n");
      }
    }
    const finalLine = buffer.replace(/\r$/, "");
    if (finalLine.trim().length > 0) {
      yield await parseJSON({ text: finalLine, schema });
    }
  } finally {
    if (!finished) {
      await reader.cancel().catch(() => {
      });
    }
    reader.releaseLock();
  }
}
function isJSONSerializable(value) {
  if (value === null || value === void 0) return true;
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") return true;
  if (type === "function" || type === "symbol" || type === "bigint")
    return false;
  if (Array.isArray(value)) {
    return value.every(isJSONSerializable);
  }
  if (Object.getPrototypeOf(value) === Object.prototype) {
    return Object.values(value).every(
      isJSONSerializable
    );
  }
  return false;
}
function serializeModelOptions(options) {
  const serializableConfig = {};
  for (const [key, value] of Object.entries(options.config)) {
    if (key === "headers") {
      const resolvedHeaders = resolveSync(value);
      if (isJSONSerializable(resolvedHeaders)) {
        serializableConfig[key] = resolvedHeaders;
      }
    } else if (isJSONSerializable(value)) {
      serializableConfig[key] = value;
    }
  }
  return { modelId: options.modelId, config: serializableConfig };
}
function resolveSync(value) {
  let next = value;
  if (typeof value === "function") {
    next = value();
  }
  if (next instanceof Promise) {
    throw new SerializationError({
      message: "Cannot serialize asynchronous model options."
    });
  }
  return next;
}
function parseTranscriptionStreamPart(text2) {
  let value;
  try {
    value = secureJsonParse(text2);
  } catch (e) {
    return void 0;
  }
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return void 0;
  }
  const part = value;
  switch (part.type) {
    case "stream-start":
      return Array.isArray(part.warnings) && part.warnings.every(isWarning) ? part : void 0;
    case "transcript-delta":
      return isString(part.delta) && isOptional(part.id, isString) && isOptional(part.providerMetadata, isRecord) ? part : void 0;
    case "transcript-partial":
      return isString(part.text) && isOptional(part.id, isString) && isOptional(part.startSecond, isNumber) && isOptional(part.durationInSeconds, isNumber) && isOptional(part.channelIndex, isNumber) && isOptional(part.providerMetadata, isRecord) ? part : void 0;
    case "transcript-final":
      return isString(part.text) && isOptional(part.id, isString) && isOptional(part.startSecond, isNumber) && isOptional(part.endSecond, isNumber) && isOptional(part.channelIndex, isNumber) && isOptional(part.providerMetadata, isRecord) ? part : void 0;
    case "finish":
      return isString(part.text) && Array.isArray(part.segments) && part.segments.every(isSegment) && isOptional(part.language, isString) && isOptional(part.durationInSeconds, isNumber) && isOptional(part.providerMetadata, isRecord) ? part : void 0;
    case "response-metadata": {
      if (!(isOptional(part.modelId, isString) && isOptional(part.headers, isRecord))) {
        return void 0;
      }
      const timestamp = part.timestamp;
      if (timestamp == null) {
        return { ...part, timestamp: void 0 };
      }
      if (typeof timestamp !== "string") {
        return void 0;
      }
      const revived = new Date(timestamp);
      return Number.isNaN(revived.getTime()) ? void 0 : { ...part, timestamp: revived };
    }
    case "raw":
      return "rawValue" in part ? part : void 0;
    case "error":
      return "error" in part ? part : void 0;
    default:
      return void 0;
  }
}
function isString(value) {
  return typeof value === "string";
}
function isNumber(value) {
  return typeof value === "number";
}
function isOptional(value, check) {
  return value === void 0 || check(value);
}
function isWarning(value) {
  return isRecord(value) && isString(value.type);
}
function isSegment(value) {
  return isRecord(value) && isString(value.text) && isNumber(value.startSecond) && isNumber(value.endSecond);
}
function withoutTrailingSlash(url) {
  return url == null ? void 0 : url.replace(/\/$/, "");
}
var textDecoder, WEBSOCKET_OPEN_STATE, btoa2, atob2, FETCH_FAILED_ERROR_MESSAGES, RETRYABLE_NETWORK_ERROR_CODES, VERSION, audioMediaTypeSignaturesWithoutMp4, audioMediaTypeSignatures, MAX_SIGNATURE_BYTES, MAX_ID3_TAG_BYTES, ID3_SCAN_BYTES, name16, marker22, symbol17, _a19, _b17, DownloadError, safeNodeFetchPromise, BLOCKED_REQUEST_HEADERS, MAX_DOWNLOAD_REDIRECTS, REDIRECT_STATUS_CODES, DEFAULT_MAX_DOWNLOAD_SIZE, createIdGenerator, generateId, getOriginalFetch2, getFromApi, suspectProtoRx, suspectConstructorRx, ignoreOverride, defaultOptions, getDefaultOptions, parseCatchDef, integerDateParser, isJsonSchema7AllOfType, emojiRegex, zodPatterns, ALPHA_NUMERIC, primitiveMappings, asAnyOf, parseOptionalDef, parsePipelineDef, parseReadonlyDef, selectParser, getRelativePath, get$ref, addMeta, getRefs, zod3ToJsonSchema, schemaSymbol, getOriginalFetch4, postJsonToApi, postToApi, retryWithExponentialBackoff, textDecoder2, createJsonErrorResponseHandler, createEventSourceResponseHandler, createJsonResponseHandler, createJsonLinesResponseHandler, name22, marker32, symbol22, _a22, _b22, SerializationError, TRANSCRIPTION_STREAM_START_FRAME_TYPE, TRANSCRIPTION_STREAM_AUDIO_DONE_FRAME_TYPE;
var init_dist4 = __esm({
  "node_modules/@ai-sdk/provider-utils/dist/index.js"() {
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_v4();
    init_core2();
    init_stream();
    init_dist();
    init_dist();
    init_dist();
    init_dist3();
    __name(combineHeaders, "combineHeaders");
    __name(removeUndefinedEntries, "removeUndefinedEntries");
    __name(delay, "delay");
    __name(createAbortError, "createAbortError");
    __name(getWebSocketConstructor, "getWebSocketConstructor");
    textDecoder = new TextDecoder();
    __name(readWebSocketMessageText, "readWebSocketMessageText");
    WEBSOCKET_OPEN_STATE = 1;
    __name(waitForWebSocketBufferDrain, "waitForWebSocketBufferDrain");
    __name(connectToWebSocket, "connectToWebSocket");
    __name(convertAsyncIteratorToReadableStream, "convertAsyncIteratorToReadableStream");
    ({ btoa: btoa2, atob: atob2 } = globalThis);
    __name(convertBase64ToUint8Array, "convertBase64ToUint8Array");
    __name(convertUint8ArrayToBase64, "convertUint8ArrayToBase64");
    __name(extractResponseHeaders, "extractResponseHeaders");
    __name(getRuntimeEnvironmentUserAgent, "getRuntimeEnvironmentUserAgent");
    __name(isAbortError, "isAbortError");
    FETCH_FAILED_ERROR_MESSAGES = ["fetch failed", "failed to fetch"];
    RETRYABLE_NETWORK_ERROR_CODES = /* @__PURE__ */ new Set([
      "ConnectionRefused",
      "ConnectionClosed",
      "FailedToOpenSocket",
      "ECONNRESET",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "EPIPE",
      "UND_ERR_SOCKET",
      "UND_ERR_HEADERS_TIMEOUT",
      "UND_ERR_BODY_TIMEOUT",
      "UND_ERR_CONNECT_TIMEOUT"
    ]);
    __name(findNetworkError, "findNetworkError");
    __name(handleFetchError, "handleFetchError");
    VERSION = true ? "5.0.42" : "0.0.0-test";
    __name(normalizeHeaders, "normalizeHeaders");
    __name(withUserAgentSuffix, "withUserAgentSuffix");
    audioMediaTypeSignaturesWithoutMp4 = [
      {
        mediaType: "audio/mpeg",
        bytesPrefix: [255, 251]
      },
      {
        mediaType: "audio/mpeg",
        bytesPrefix: [255, 250]
      },
      {
        mediaType: "audio/mpeg",
        bytesPrefix: [255, 243]
      },
      {
        mediaType: "audio/mpeg",
        bytesPrefix: [255, 242]
      },
      {
        mediaType: "audio/mpeg",
        bytesPrefix: [255, 227]
      },
      {
        mediaType: "audio/mpeg",
        bytesPrefix: [255, 226]
      },
      {
        mediaType: "audio/wav",
        bytesPrefix: [
          82,
          // R
          73,
          // I
          70,
          // F
          70,
          // F
          null,
          null,
          null,
          null,
          87,
          // W
          65,
          // A
          86,
          // V
          69
          // E
        ]
      },
      {
        mediaType: "audio/ogg",
        bytesPrefix: [79, 103, 103, 83]
      },
      {
        mediaType: "audio/flac",
        bytesPrefix: [102, 76, 97, 67]
      },
      {
        mediaType: "audio/aac",
        bytesPrefix: [64, 21, 0, 0]
      },
      {
        mediaType: "audio/webm",
        bytesPrefix: [26, 69, 223, 163]
      }
    ];
    audioMediaTypeSignatures = [
      ...audioMediaTypeSignaturesWithoutMp4,
      {
        mediaType: "audio/mp4",
        bytesPrefix: [
          0,
          0,
          0,
          null,
          102,
          116,
          121,
          112
          // ftyp
        ]
      }
    ];
    MAX_SIGNATURE_BYTES = 12;
    MAX_ID3_TAG_BYTES = 128 * 1024;
    ID3_SCAN_BYTES = MAX_ID3_TAG_BYTES + MAX_SIGNATURE_BYTES;
    __name(cancelResponseBody, "cancelResponseBody");
    name16 = "AI_DownloadError";
    marker22 = `vercel.ai.error.${name16}`;
    symbol17 = Symbol.for(marker22);
    DownloadError = class extends (_b17 = AISDKError, _a19 = symbol17, _b17) {
      static {
        __name(this, "DownloadError");
      }
      constructor({
        url,
        statusCode,
        statusText,
        cause,
        message = cause == null ? `Failed to download ${url}: ${statusCode} ${statusText}` : `Failed to download ${url}: ${cause}`
      }) {
        super({ name: name16, message, cause });
        this[_a19] = true;
        this.url = url;
        this.statusCode = statusCode;
        this.statusText = statusText;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker22);
      }
    };
    __name(isBrowserRuntime, "isBrowserRuntime");
    __name(isSameOrigin, "isSameOrigin");
    __name(validateDownloadUrl, "validateDownloadUrl");
    __name(validateDownloadAddress, "validateDownloadAddress");
    __name(isIPv4, "isIPv4");
    __name(isPrivateIPv4, "isPrivateIPv4");
    __name(parseIPv6, "parseIPv6");
    __name(isPrivateIPv6, "isPrivateIPv6");
    __name(createSafeLookup, "createSafeLookup");
    __name(isNodeRuntime, "isNodeRuntime");
    __name(getDefaultDownloadFetch, "getDefaultDownloadFetch");
    __name(createSafeNodeFetch, "createSafeNodeFetch");
    __name(loadBuiltinModule, "loadBuiltinModule");
    __name(getCurrentModulePath, "getCurrentModulePath");
    BLOCKED_REQUEST_HEADERS = [
      // Hop-by-hop / transport (RFC 7230 §6.1)
      "connection",
      "keep-alive",
      "te",
      "trailer",
      "transfer-encoding",
      "upgrade",
      // Host / virtual-host routing
      "host",
      // Proxy / origin spoofing
      "forwarded",
      "proxy-authorization",
      "via",
      "x-forwarded-for",
      "x-forwarded-host",
      "x-forwarded-proto",
      "x-real-ip",
      // Cloud metadata (GCP, AWS IMDSv1/v2, Azure, Alibaba, DigitalOcean)
      "metadata",
      "metadata-flavor",
      "x-aws-ec2-metadata-token",
      "x-metadata-token",
      // Session / cookie
      "cookie",
      "set-cookie"
    ];
    __name(sanitizeRequestHeaders, "sanitizeRequestHeaders");
    MAX_DOWNLOAD_REDIRECTS = 10;
    REDIRECT_STATUS_CODES = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
    __name(getValidatedFetch, "getValidatedFetch");
    __name(fetchWithValidatedRedirects, "fetchWithValidatedRedirects");
    DEFAULT_MAX_DOWNLOAD_SIZE = 2 * 1024 * 1024 * 1024;
    __name(readResponseWithSizeLimit, "readResponseWithSizeLimit");
    createIdGenerator = /* @__PURE__ */ __name(({
      prefix,
      size = 16,
      alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      separator = "-"
    } = {}) => {
      const generator = /* @__PURE__ */ __name(() => {
        const alphabetLength = alphabet.length;
        const chars = new Array(size);
        for (let i = 0; i < size; i++) {
          chars[i] = alphabet[Math.random() * alphabetLength | 0];
        }
        return chars.join("");
      }, "generator");
      if (prefix == null) {
        return generator;
      }
      if (alphabet.includes(separator)) {
        throw new InvalidArgumentError({
          argument: "separator",
          message: `The separator "${separator}" must not be part of the alphabet "${alphabet}".`
        });
      }
      return () => `${prefix}${separator}${generator()}`;
    }, "createIdGenerator");
    generateId = createIdGenerator();
    getOriginalFetch2 = /* @__PURE__ */ __name(() => globalThis.fetch, "getOriginalFetch2");
    getFromApi = /* @__PURE__ */ __name(async ({
      url,
      headers = {},
      successfulResponseHandler,
      failedResponseHandler,
      abortSignal,
      fetch: fetch2,
      validateUrl,
      credentialedOrigin,
      trustedOrigin
    }) => {
      try {
        const requestFetch = fetch2 != null ? fetch2 : getOriginalFetch2();
        const outgoingHeaders = credentialedOrigin !== void 0 && !isSameOrigin(url, credentialedOrigin) ? {} : headers;
        const requestHeaders = withUserAgentSuffix(
          outgoingHeaders,
          `ai-sdk/provider-utils/${VERSION}`,
          getRuntimeEnvironmentUserAgent()
        );
        const response = validateUrl ? await fetchWithValidatedRedirects({
          url,
          headers: requestHeaders,
          abortSignal,
          fetch: fetch2,
          trustedOrigin
        }) : await requestFetch(url, {
          method: "GET",
          headers: requestHeaders,
          signal: abortSignal
        });
        const responseHeaders = extractResponseHeaders(response);
        if (!response.ok) {
          let errorInformation;
          try {
            errorInformation = await failedResponseHandler({
              response,
              url,
              requestBodyValues: {}
            });
          } catch (error2) {
            if (isAbortError(error2) || APICallError.isInstance(error2)) {
              throw error2;
            }
            throw new APICallError({
              message: "Failed to process error response",
              cause: error2,
              statusCode: response.status,
              url,
              responseHeaders,
              requestBodyValues: {}
            });
          }
          throw errorInformation.value;
        }
        try {
          return await successfulResponseHandler({
            response,
            url,
            requestBodyValues: {}
          });
        } catch (error2) {
          if (error2 instanceof Error) {
            if (isAbortError(error2) || APICallError.isInstance(error2)) {
              throw error2;
            }
          }
          throw new APICallError({
            message: "Failed to process successful response",
            cause: error2,
            statusCode: response.status,
            url,
            responseHeaders,
            requestBodyValues: {}
          });
        }
      } catch (error2) {
        throw handleFetchError({ error: error2, url, requestBodyValues: {} });
      }
    }, "getFromApi");
    __name(isBuffer, "isBuffer");
    __name(isRecord, "isRecord");
    __name(loadApiKey, "loadApiKey");
    __name(loadOptionalSetting, "loadOptionalSetting");
    __name(normalizeBatchRequestCounts, "normalizeBatchRequestCounts");
    __name(isNonNegativeSafeInteger, "isNonNegativeSafeInteger");
    suspectProtoRx = /"(?:_|\\u005[Ff])(?:_|\\u005[Ff])(?:p|\\u0070)(?:r|\\u0072)(?:o|\\u006[Ff])(?:t|\\u0074)(?:o|\\u006[Ff])(?:_|\\u005[Ff])(?:_|\\u005[Ff])"\s*:/;
    suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
    __name(_parse3, "_parse");
    __name(filter, "filter");
    __name(secureJsonParse, "secureJsonParse");
    __name(addAdditionalPropertiesToJsonSchema, "addAdditionalPropertiesToJsonSchema");
    __name(visit, "visit");
    ignoreOverride = /* @__PURE__ */ Symbol(
      "Let zodToJsonSchema decide on which parser to use"
    );
    defaultOptions = {
      name: void 0,
      $refStrategy: "root",
      basePath: ["#"],
      effectStrategy: "input",
      pipeStrategy: "all",
      dateStrategy: "format:date-time",
      mapStrategy: "entries",
      removeAdditionalStrategy: "passthrough",
      allowedAdditionalProperties: true,
      rejectedAdditionalProperties: false,
      definitionPath: "definitions",
      strictUnions: false,
      definitions: {},
      errorMessages: false,
      patternStrategy: "escape",
      applyRegexFlags: false,
      emailStrategy: "format:email",
      base64Strategy: "contentEncoding:base64",
      nameStrategy: "ref"
    };
    getDefaultOptions = /* @__PURE__ */ __name((options) => typeof options === "string" ? {
      ...defaultOptions,
      name: options
    } : {
      ...defaultOptions,
      ...options
    }, "getDefaultOptions");
    __name(parseAnyDef, "parseAnyDef");
    __name(parseArrayDef, "parseArrayDef");
    __name(parseBigintDef, "parseBigintDef");
    __name(parseBooleanDef, "parseBooleanDef");
    __name(parseBrandedDef, "parseBrandedDef");
    parseCatchDef = /* @__PURE__ */ __name((def, refs) => {
      return parseDef(def.innerType._def, refs);
    }, "parseCatchDef");
    __name(parseDateDef, "parseDateDef");
    integerDateParser = /* @__PURE__ */ __name((def) => {
      const res = {
        type: "integer",
        format: "unix-time"
      };
      for (const check of def.checks) {
        switch (check.kind) {
          case "min":
            res.minimum = check.value;
            break;
          case "max":
            res.maximum = check.value;
            break;
        }
      }
      return res;
    }, "integerDateParser");
    __name(parseDefaultDef, "parseDefaultDef");
    __name(parseEffectsDef, "parseEffectsDef");
    __name(parseEnumDef, "parseEnumDef");
    isJsonSchema7AllOfType = /* @__PURE__ */ __name((type) => {
      if ("type" in type && type.type === "string") return false;
      return "allOf" in type;
    }, "isJsonSchema7AllOfType");
    __name(parseIntersectionDef, "parseIntersectionDef");
    __name(parseLiteralDef, "parseLiteralDef");
    emojiRegex = void 0;
    zodPatterns = {
      /**
       * `c` was changed to `[cC]` to replicate /i flag
       */
      cuid: /^[cC][^\s-]{8,}$/,
      cuid2: /^[0-9a-z]+$/,
      ulid: /^[0-9A-HJKMNP-TV-Z]{26}$/,
      /**
       * `a-z` was added to replicate /i flag
       */
      email: /^(?!\.)(?!.*\.\.)([a-zA-Z0-9_'+\-\.]*)[a-zA-Z0-9_+-]@([a-zA-Z0-9][a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,}$/,
      /**
       * Constructed a valid Unicode RegExp
       *
       * Lazily instantiate since this type of regex isn't supported
       * in all envs (e.g. React Native).
       *
       * See:
       * https://github.com/colinhacks/zod/issues/2433
       * Fix in Zod:
       * https://github.com/colinhacks/zod/commit/9340fd51e48576a75adc919bff65dbc4a5d4c99b
       */
      emoji: /* @__PURE__ */ __name(() => {
        if (emojiRegex === void 0) {
          emojiRegex = RegExp(
            "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$",
            "u"
          );
        }
        return emojiRegex;
      }, "emoji"),
      /**
       * Unused
       */
      uuid: /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,
      /**
       * Unused
       */
      ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
      ipv4Cidr: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
      /**
       * Unused
       */
      ipv6: /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/,
      ipv6Cidr: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
      base64: /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
      base64url: /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
      nanoid: /^[a-zA-Z0-9_-]{21}$/,
      jwt: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/
    };
    __name(parseStringDef, "parseStringDef");
    __name(escapeLiteralCheckValue, "escapeLiteralCheckValue");
    ALPHA_NUMERIC = new Set(
      "ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789"
    );
    __name(escapeNonAlphaNumeric, "escapeNonAlphaNumeric");
    __name(addFormat, "addFormat");
    __name(addPattern2, "addPattern");
    __name(stringifyRegExpWithFlags, "stringifyRegExpWithFlags");
    __name(parseRecordDef, "parseRecordDef");
    __name(parseMapDef, "parseMapDef");
    __name(parseNativeEnumDef, "parseNativeEnumDef");
    __name(parseNeverDef, "parseNeverDef");
    __name(parseNullDef, "parseNullDef");
    primitiveMappings = {
      ZodString: "string",
      ZodNumber: "number",
      ZodBigInt: "integer",
      ZodBoolean: "boolean",
      ZodNull: "null"
    };
    __name(parseUnionDef, "parseUnionDef");
    asAnyOf = /* @__PURE__ */ __name((def, refs) => {
      const anyOf = (def.options instanceof Map ? Array.from(def.options.values()) : def.options).map(
        (x, i) => parseDef(x._def, {
          ...refs,
          currentPath: [...refs.currentPath, "anyOf", `${i}`]
        })
      ).filter(
        (x) => !!x && (!refs.strictUnions || typeof x === "object" && Object.keys(x).length > 0)
      );
      return anyOf.length ? { anyOf } : void 0;
    }, "asAnyOf");
    __name(parseNullableDef, "parseNullableDef");
    __name(parseNumberDef, "parseNumberDef");
    __name(parseObjectDef, "parseObjectDef");
    __name(decideAdditionalProperties, "decideAdditionalProperties");
    __name(safeIsOptional, "safeIsOptional");
    parseOptionalDef = /* @__PURE__ */ __name((def, refs) => {
      var _a34;
      if (refs.currentPath.toString() === ((_a34 = refs.propertyPath) == null ? void 0 : _a34.toString())) {
        return parseDef(def.innerType._def, refs);
      }
      const innerSchema = parseDef(def.innerType._def, {
        ...refs,
        currentPath: [...refs.currentPath, "anyOf", "1"]
      });
      return innerSchema ? { anyOf: [{ not: parseAnyDef() }, innerSchema] } : parseAnyDef();
    }, "parseOptionalDef");
    parsePipelineDef = /* @__PURE__ */ __name((def, refs) => {
      if (refs.pipeStrategy === "input") {
        return parseDef(def.in._def, refs);
      } else if (refs.pipeStrategy === "output") {
        return parseDef(def.out._def, refs);
      }
      const inputSchema = parseDef(def.in._def, {
        ...refs,
        currentPath: [...refs.currentPath, "allOf", "0"]
      });
      const outputSchema2 = parseDef(def.out._def, {
        ...refs,
        currentPath: [...refs.currentPath, "allOf", inputSchema ? "1" : "0"]
      });
      return {
        allOf: [inputSchema, outputSchema2].filter(
          (schema) => schema !== void 0
        )
      };
    }, "parsePipelineDef");
    __name(parsePromiseDef, "parsePromiseDef");
    __name(parseSetDef, "parseSetDef");
    __name(parseTupleDef, "parseTupleDef");
    __name(parseUndefinedDef, "parseUndefinedDef");
    __name(parseUnknownDef, "parseUnknownDef");
    parseReadonlyDef = /* @__PURE__ */ __name((def, refs) => {
      return parseDef(def.innerType._def, refs);
    }, "parseReadonlyDef");
    selectParser = /* @__PURE__ */ __name((def, typeName, refs) => {
      switch (typeName) {
        case "ZodString":
          return parseStringDef(def, refs);
        case "ZodNumber":
          return parseNumberDef(def);
        case "ZodObject":
          return parseObjectDef(def, refs);
        case "ZodBigInt":
          return parseBigintDef(def);
        case "ZodBoolean":
          return parseBooleanDef();
        case "ZodDate":
          return parseDateDef(def, refs);
        case "ZodUndefined":
          return parseUndefinedDef();
        case "ZodNull":
          return parseNullDef();
        case "ZodArray":
          return parseArrayDef(def, refs);
        case "ZodUnion":
        case "ZodDiscriminatedUnion":
          return parseUnionDef(def, refs);
        case "ZodIntersection":
          return parseIntersectionDef(def, refs);
        case "ZodTuple":
          return parseTupleDef(def, refs);
        case "ZodRecord":
          return parseRecordDef(def, refs);
        case "ZodLiteral":
          return parseLiteralDef(def);
        case "ZodEnum":
          return parseEnumDef(def);
        case "ZodNativeEnum":
          return parseNativeEnumDef(def);
        case "ZodNullable":
          return parseNullableDef(def, refs);
        case "ZodOptional":
          return parseOptionalDef(def, refs);
        case "ZodMap":
          return parseMapDef(def, refs);
        case "ZodSet":
          return parseSetDef(def, refs);
        case "ZodLazy":
          return () => def.getter()._def;
        case "ZodPromise":
          return parsePromiseDef(def, refs);
        case "ZodNaN":
        case "ZodNever":
          return parseNeverDef();
        case "ZodEffects":
          return parseEffectsDef(def, refs);
        case "ZodAny":
          return parseAnyDef();
        case "ZodUnknown":
          return parseUnknownDef();
        case "ZodDefault":
          return parseDefaultDef(def, refs);
        case "ZodBranded":
          return parseBrandedDef(def, refs);
        case "ZodReadonly":
          return parseReadonlyDef(def, refs);
        case "ZodCatch":
          return parseCatchDef(def, refs);
        case "ZodPipeline":
          return parsePipelineDef(def, refs);
        case "ZodFunction":
        case "ZodVoid":
        case "ZodSymbol":
          return void 0;
        default:
          return /* @__PURE__ */ ((_) => void 0)(typeName);
      }
    }, "selectParser");
    getRelativePath = /* @__PURE__ */ __name((pathA, pathB) => {
      let i = 0;
      for (; i < pathA.length && i < pathB.length; i++) {
        if (pathA[i] !== pathB[i]) break;
      }
      return [(pathA.length - i).toString(), ...pathB.slice(i)].join("/");
    }, "getRelativePath");
    __name(parseDef, "parseDef");
    get$ref = /* @__PURE__ */ __name((item, refs) => {
      switch (refs.$refStrategy) {
        case "root":
          return { $ref: item.path.join("/") };
        case "relative":
          return { $ref: getRelativePath(refs.currentPath, item.path) };
        case "none":
        case "seen": {
          if (item.path.length < refs.currentPath.length && item.path.every((value, index) => refs.currentPath[index] === value)) {
            console.warn(
              `Recursive reference detected at ${refs.currentPath.join(
                "/"
              )}! Defaulting to any`
            );
            return parseAnyDef();
          }
          return refs.$refStrategy === "seen" ? parseAnyDef() : void 0;
        }
      }
    }, "get$ref");
    addMeta = /* @__PURE__ */ __name((def, refs, jsonSchema2) => {
      if (def.description) {
        jsonSchema2.description = def.description;
      }
      return jsonSchema2;
    }, "addMeta");
    getRefs = /* @__PURE__ */ __name((options) => {
      const _options = getDefaultOptions(options);
      const currentPath = _options.name !== void 0 ? [..._options.basePath, _options.definitionPath, _options.name] : _options.basePath;
      return {
        ..._options,
        currentPath,
        propertyPath: void 0,
        seen: new Map(
          Object.entries(_options.definitions).map(([name34, def]) => [
            def._def,
            {
              def: def._def,
              path: [..._options.basePath, _options.definitionPath, name34],
              // Resolution of references will be forced even though seen, so it's ok that the schema is undefined here for now.
              jsonSchema: void 0
            }
          ])
        )
      };
    }, "getRefs");
    zod3ToJsonSchema = /* @__PURE__ */ __name((schema, options) => {
      var _a34;
      const refs = getRefs(options);
      let definitions = typeof options === "object" && options.definitions ? Object.entries(options.definitions).reduce(
        (acc, [name44, schema2]) => {
          var _a44;
          return {
            ...acc,
            [name44]: (_a44 = parseDef(
              schema2._def,
              {
                ...refs,
                currentPath: [...refs.basePath, refs.definitionPath, name44]
              },
              true
            )) != null ? _a44 : parseAnyDef()
          };
        },
        {}
      ) : void 0;
      const name34 = typeof options === "string" ? options : (options == null ? void 0 : options.nameStrategy) === "title" ? void 0 : options == null ? void 0 : options.name;
      const main = (_a34 = parseDef(
        schema._def,
        name34 === void 0 ? refs : {
          ...refs,
          currentPath: [...refs.basePath, refs.definitionPath, name34]
        },
        false
      )) != null ? _a34 : parseAnyDef();
      const title = typeof options === "object" && options.name !== void 0 && options.nameStrategy === "title" ? options.name : void 0;
      if (title !== void 0) {
        main.title = title;
      }
      const combined = name34 === void 0 ? definitions ? {
        ...main,
        [refs.definitionPath]: definitions
      } : main : {
        $ref: [
          ...refs.$refStrategy === "relative" ? [] : refs.basePath,
          refs.definitionPath,
          name34
        ].join("/"),
        [refs.definitionPath]: {
          ...definitions,
          [name34]: main
        }
      };
      combined.$schema = "http://json-schema.org/draft-07/schema#";
      return combined;
    }, "zod3ToJsonSchema");
    schemaSymbol = /* @__PURE__ */ Symbol.for("vercel.ai.schema");
    __name(lazySchema, "lazySchema");
    __name(jsonSchema, "jsonSchema");
    __name(isSchema, "isSchema");
    __name(asSchema, "asSchema");
    __name(standardSchema, "standardSchema");
    __name(hasStandardJsonSchema, "hasStandardJsonSchema");
    __name(zod3Schema, "zod3Schema");
    __name(zod4Schema, "zod4Schema");
    __name(isZod4Schema, "isZod4Schema");
    __name(zodSchema, "zodSchema");
    __name(validateTypes, "validateTypes");
    __name(safeValidateTypes, "safeValidateTypes");
    __name(parseJSON, "parseJSON");
    __name(safeParseJSON, "safeParseJSON");
    __name(parseJsonEventStream, "parseJsonEventStream");
    getOriginalFetch4 = /* @__PURE__ */ __name(() => globalThis.fetch, "getOriginalFetch4");
    postJsonToApi = /* @__PURE__ */ __name(async ({
      url,
      headers,
      body,
      failedResponseHandler,
      successfulResponseHandler,
      abortSignal,
      fetch: fetch2
    }) => await postToApi({
      url,
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: {
        content: JSON.stringify(body),
        values: body
      },
      failedResponseHandler,
      successfulResponseHandler,
      abortSignal,
      fetch: fetch2
    }), "postJsonToApi");
    postToApi = /* @__PURE__ */ __name(async ({
      url,
      headers = {},
      body,
      successfulResponseHandler,
      failedResponseHandler,
      abortSignal,
      fetch: fetch2 = getOriginalFetch4()
    }) => {
      try {
        const response = await fetch2(url, {
          method: "POST",
          headers: withUserAgentSuffix(
            headers,
            `ai-sdk/provider-utils/${VERSION}`,
            getRuntimeEnvironmentUserAgent()
          ),
          body: body.content,
          signal: abortSignal
        });
        const responseHeaders = extractResponseHeaders(response);
        if (!response.ok) {
          let errorInformation;
          try {
            errorInformation = await failedResponseHandler({
              response,
              url,
              requestBodyValues: body.values
            });
          } catch (error2) {
            if (isAbortError(error2) || APICallError.isInstance(error2)) {
              throw error2;
            }
            throw new APICallError({
              message: "Failed to process error response",
              cause: error2,
              statusCode: response.status,
              url,
              responseHeaders,
              requestBodyValues: body.values
            });
          }
          throw errorInformation.value;
        }
        try {
          return await successfulResponseHandler({
            response,
            url,
            requestBodyValues: body.values
          });
        } catch (error2) {
          if (error2 instanceof Error) {
            if (isAbortError(error2) || APICallError.isInstance(error2)) {
              throw error2;
            }
          }
          throw new APICallError({
            message: "Failed to process successful response",
            cause: error2,
            statusCode: response.status,
            url,
            responseHeaders,
            requestBodyValues: body.values
          });
        }
      } catch (error2) {
        throw handleFetchError({ error: error2, url, requestBodyValues: body.values });
      }
    }, "postToApi");
    __name(tool, "tool");
    __name(createProviderExecutedToolFactory, "createProviderExecutedToolFactory");
    __name(resolve, "resolve");
    retryWithExponentialBackoff = /* @__PURE__ */ __name(({
      maxRetries = 2,
      initialDelayInMs = 2e3,
      backoffFactor = 2,
      abortSignal,
      shouldRetry,
      getDelayInMs = /* @__PURE__ */ __name(({ exponentialBackoffDelay }) => exponentialBackoffDelay, "getDelayInMs"),
      createRetryError = /* @__PURE__ */ __name(({ message }) => new Error(message), "createRetryError")
    }) => async (f) => retryWithExponentialBackoffInternal(f, {
      maxRetries,
      delayInMs: initialDelayInMs,
      backoffFactor,
      abortSignal,
      shouldRetry,
      getDelayInMs,
      createRetryError
    }), "retryWithExponentialBackoff");
    __name(retryWithExponentialBackoffInternal, "retryWithExponentialBackoffInternal");
    textDecoder2 = new TextDecoder();
    __name(wrapResponseBodyStream, "wrapResponseBodyStream");
    __name(readResponseBodyAsText, "readResponseBodyAsText");
    createJsonErrorResponseHandler = /* @__PURE__ */ __name(({
      errorSchema,
      errorToMessage,
      isRetryable
    }) => async ({ response, url, requestBodyValues }) => {
      const responseBody = await readResponseBodyAsText({ response, url });
      const responseHeaders = extractResponseHeaders(response);
      if (responseBody.trim() === "") {
        return {
          responseHeaders,
          value: new APICallError({
            message: response.statusText,
            url,
            requestBodyValues,
            statusCode: response.status,
            responseHeaders,
            responseBody,
            isRetryable: isRetryable == null ? void 0 : isRetryable(response)
          })
        };
      }
      try {
        const parsedError = await parseJSON({
          text: responseBody,
          schema: errorSchema
        });
        return {
          responseHeaders,
          value: new APICallError({
            message: errorToMessage(parsedError),
            url,
            requestBodyValues,
            statusCode: response.status,
            responseHeaders,
            responseBody,
            data: parsedError,
            isRetryable: isRetryable == null ? void 0 : isRetryable(response, parsedError)
          })
        };
      } catch (e) {
        return {
          responseHeaders,
          value: new APICallError({
            message: response.statusText,
            url,
            requestBodyValues,
            statusCode: response.status,
            responseHeaders,
            responseBody,
            isRetryable: isRetryable == null ? void 0 : isRetryable(response)
          })
        };
      }
    }, "createJsonErrorResponseHandler");
    createEventSourceResponseHandler = /* @__PURE__ */ __name((chunkSchema) => async ({ response, url, requestBodyValues }) => {
      const responseHeaders = extractResponseHeaders(response);
      if (response.body == null) {
        throw new EmptyResponseBodyError({});
      }
      return {
        responseHeaders,
        value: parseJsonEventStream({
          stream: wrapResponseBodyStream({
            stream: response.body,
            url,
            requestBodyValues,
            statusCode: response.status,
            responseHeaders
          }),
          schema: chunkSchema
        })
      };
    }, "createEventSourceResponseHandler");
    createJsonResponseHandler = /* @__PURE__ */ __name((responseSchema) => async ({ response, url, requestBodyValues }) => {
      const responseBody = await readResponseBodyAsText({ response, url });
      const parsedResult = await safeParseJSON({
        text: responseBody,
        schema: responseSchema
      });
      const responseHeaders = extractResponseHeaders(response);
      if (!parsedResult.success) {
        throw new APICallError({
          message: "Invalid JSON response",
          cause: parsedResult.error,
          statusCode: response.status,
          responseHeaders,
          responseBody,
          url,
          requestBodyValues
        });
      }
      return {
        responseHeaders,
        value: parsedResult.value,
        rawValue: parsedResult.rawValue
      };
    }, "createJsonResponseHandler");
    createJsonLinesResponseHandler = /* @__PURE__ */ __name((responseSchema) => async ({ response }) => {
      const responseHeaders = extractResponseHeaders(response);
      if (response.body == null) {
        throw new EmptyResponseBodyError({});
      }
      return {
        responseHeaders,
        value: parseJsonLines({
          stream: response.body,
          schema: responseSchema
        })
      };
    }, "createJsonLinesResponseHandler");
    __name(parseJsonLines, "parseJsonLines");
    __name(isJSONSerializable, "isJSONSerializable");
    name22 = "AI_SerializationError";
    marker32 = `vercel.ai.error.${name22}`;
    symbol22 = Symbol.for(marker32);
    SerializationError = class extends (_b22 = AISDKError, _a22 = symbol22, _b22) {
      static {
        __name(this, "SerializationError");
      }
      // used in isInstance
      constructor({
        message = "Failed to serialize value.",
        cause
      } = {}) {
        super({ name: name22, message, cause });
        this[_a22] = true;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker32);
      }
    };
    __name(serializeModelOptions, "serializeModelOptions");
    __name(resolveSync, "resolveSync");
    TRANSCRIPTION_STREAM_START_FRAME_TYPE = "transcription-stream.start";
    TRANSCRIPTION_STREAM_AUDIO_DONE_FRAME_TYPE = "transcription-stream.audio-done";
    __name(parseTranscriptionStreamPart, "parseTranscriptionStreamPart");
    __name(isString, "isString");
    __name(isNumber, "isNumber");
    __name(isOptional, "isOptional");
    __name(isWarning, "isWarning");
    __name(isSegment, "isSegment");
    __name(withoutTrailingSlash, "withoutTrailingSlash");
  }
});

// node_modules/@vercel/oidc/dist/get-context.js
var require_get_context = __commonJS({
  "node_modules/@vercel/oidc/dist/get-context.js"(exports, module) {
    "use strict";
    var __defProp3 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export3 = /* @__PURE__ */ __name((target, all) => {
      for (var name25 in all)
        __defProp3(target, name25, { get: all[name25], enumerable: true });
    }, "__export");
    var __copyProps2 = /* @__PURE__ */ __name((to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp3(to, key, { get: /* @__PURE__ */ __name(() => from[key], "get"), enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    }, "__copyProps");
    var __toCommonJS = /* @__PURE__ */ __name((mod) => __copyProps2(__defProp3({}, "__esModule", { value: true }), mod), "__toCommonJS");
    var get_context_exports = {};
    __export3(get_context_exports, {
      SYMBOL_FOR_REQ_CONTEXT: /* @__PURE__ */ __name(() => SYMBOL_FOR_REQ_CONTEXT, "SYMBOL_FOR_REQ_CONTEXT"),
      getContext: /* @__PURE__ */ __name(() => getContext3, "getContext")
    });
    module.exports = __toCommonJS(get_context_exports);
    var SYMBOL_FOR_REQ_CONTEXT = /* @__PURE__ */ Symbol.for("@vercel/request-context");
    function getContext3() {
      const fromSymbol = globalThis;
      return fromSymbol[SYMBOL_FOR_REQ_CONTEXT]?.get?.() ?? {};
    }
    __name(getContext3, "getContext");
  }
});

// node_modules/@vercel/oidc/dist/auth-errors.js
var require_auth_errors = __commonJS({
  "node_modules/@vercel/oidc/dist/auth-errors.js"(exports, module) {
    "use strict";
    var __defProp3 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export3 = /* @__PURE__ */ __name((target, all) => {
      for (var name25 in all)
        __defProp3(target, name25, { get: all[name25], enumerable: true });
    }, "__export");
    var __copyProps2 = /* @__PURE__ */ __name((to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp3(to, key, { get: /* @__PURE__ */ __name(() => from[key], "get"), enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    }, "__copyProps");
    var __toCommonJS = /* @__PURE__ */ __name((mod) => __copyProps2(__defProp3({}, "__esModule", { value: true }), mod), "__toCommonJS");
    var auth_errors_exports = {};
    __export3(auth_errors_exports, {
      AccessTokenMissingError: /* @__PURE__ */ __name(() => AccessTokenMissingError2, "AccessTokenMissingError"),
      RefreshAccessTokenFailedError: /* @__PURE__ */ __name(() => RefreshAccessTokenFailedError2, "RefreshAccessTokenFailedError")
    });
    module.exports = __toCommonJS(auth_errors_exports);
    var AccessTokenMissingError2 = class extends Error {
      static {
        __name(this, "AccessTokenMissingError");
      }
      constructor() {
        super(
          "No authentication found. Please log in with the Vercel CLI (vercel login)."
        );
        this.name = "AccessTokenMissingError";
      }
    };
    var RefreshAccessTokenFailedError2 = class extends Error {
      static {
        __name(this, "RefreshAccessTokenFailedError");
      }
      constructor(cause) {
        super("Failed to refresh authentication token.", { cause });
        this.name = "RefreshAccessTokenFailedError";
      }
    };
  }
});

// node_modules/@vercel/oidc/dist/index-browser.js
var require_index_browser = __commonJS({
  "node_modules/@vercel/oidc/dist/index-browser.js"(exports, module) {
    "use strict";
    var __defProp3 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export3 = /* @__PURE__ */ __name((target, all) => {
      for (var name25 in all)
        __defProp3(target, name25, { get: all[name25], enumerable: true });
    }, "__export");
    var __copyProps2 = /* @__PURE__ */ __name((to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp3(to, key, { get: /* @__PURE__ */ __name(() => from[key], "get"), enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    }, "__copyProps");
    var __toCommonJS = /* @__PURE__ */ __name((mod) => __copyProps2(__defProp3({}, "__esModule", { value: true }), mod), "__toCommonJS");
    var index_browser_exports = {};
    __export3(index_browser_exports, {
      AccessTokenMissingError: /* @__PURE__ */ __name(() => import_auth_errors.AccessTokenMissingError, "AccessTokenMissingError"),
      RefreshAccessTokenFailedError: /* @__PURE__ */ __name(() => import_auth_errors.RefreshAccessTokenFailedError, "RefreshAccessTokenFailedError"),
      getContext: /* @__PURE__ */ __name(() => import_get_context.getContext, "getContext"),
      getVercelOidcToken: /* @__PURE__ */ __name(() => getVercelOidcToken2, "getVercelOidcToken"),
      getVercelOidcTokenSync: /* @__PURE__ */ __name(() => getVercelOidcTokenSync, "getVercelOidcTokenSync"),
      getVercelToken: /* @__PURE__ */ __name(() => getVercelToken, "getVercelToken")
    });
    module.exports = __toCommonJS(index_browser_exports);
    var import_get_context = require_get_context();
    var import_auth_errors = require_auth_errors();
    async function getVercelOidcToken2() {
      return "";
    }
    __name(getVercelOidcToken2, "getVercelOidcToken");
    function getVercelOidcTokenSync() {
      return "";
    }
    __name(getVercelOidcTokenSync, "getVercelOidcTokenSync");
    async function getVercelToken() {
      throw new Error("getVercelToken is not supported in browser environments");
    }
    __name(getVercelToken, "getVercelToken");
  }
});

// node_modules/@ai-sdk/gateway/dist/index.js
function getGatewayRealtimeProtocols(token, options) {
  return buildGatewayProtocols(GATEWAY_REALTIME_SUBPROTOCOL, token, options);
}
function getGatewayTranscriptionProtocols(token, options) {
  return buildGatewayProtocols(
    GATEWAY_TRANSCRIPTION_SUBPROTOCOL,
    token,
    options
  );
}
function buildGatewayProtocols(marker123, token, options) {
  const protocols = [marker123, `${GATEWAY_AUTH_SUBPROTOCOL_PREFIX}${token}`];
  if (options == null ? void 0 : options.teamIdOrSlug) {
    protocols.push(
      `${GATEWAY_TEAM_SUBPROTOCOL_PREFIX}${encodeSubprotocolValue(options.teamIdOrSlug)}`
    );
  }
  return protocols;
}
function encodeSubprotocolValue(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}
async function createGatewayErrorFromResponse({
  response,
  statusCode,
  defaultMessage = "Gateway request failed",
  cause,
  authMethod,
  isRetryable
}) {
  var _a123;
  const parseResult = await safeValidateTypes({
    value: response,
    schema: gatewayErrorResponseSchema
  });
  if (!parseResult.success) {
    const rawGenerationId = typeof response === "object" && response !== null && "generationId" in response ? response.generationId : void 0;
    return new GatewayResponseError({
      message: `Invalid error response format: ${defaultMessage}`,
      statusCode,
      response,
      validationError: parseResult.error,
      cause,
      generationId: rawGenerationId,
      isRetryable
    });
  }
  const validatedResponse = parseResult.value;
  const errorType = validatedResponse.error.type;
  const message = validatedResponse.error.message;
  const generationId = (_a123 = validatedResponse.generationId) != null ? _a123 : void 0;
  switch (errorType) {
    case "authentication_error":
      return GatewayAuthenticationError.createContextualError({
        apiKeyProvided: authMethod === "api-key",
        oidcTokenProvided: authMethod === "oidc",
        statusCode,
        cause,
        generationId
      });
    case "invalid_request_error":
      return new GatewayInvalidRequestError({
        message,
        statusCode,
        cause,
        generationId
      });
    case "rate_limit_exceeded":
      return new GatewayRateLimitError({
        message,
        statusCode,
        cause,
        generationId
      });
    case "model_not_found": {
      const modelResult = await safeValidateTypes({
        value: validatedResponse.error.param,
        schema: modelNotFoundParamSchema
      });
      return new GatewayModelNotFoundError({
        message,
        statusCode,
        modelId: modelResult.success ? modelResult.value.modelId : void 0,
        cause,
        generationId
      });
    }
    case "not_found":
      return new GatewayNotFoundError({
        message,
        statusCode,
        cause,
        generationId
      });
    case "internal_server_error":
      return new GatewayInternalServerError({
        message,
        statusCode,
        cause,
        generationId
      });
    case "failed_dependency":
      return new GatewayFailedDependencyError({
        message,
        statusCode,
        cause,
        generationId
      });
    case "forbidden": {
      const ruleResult = await safeValidateTypes({
        value: validatedResponse.error.param,
        schema: forbiddenParamSchema
      });
      return new GatewayForbiddenError({
        message,
        statusCode,
        cause,
        generationId,
        ruleId: ruleResult.success ? ruleResult.value.ruleId : void 0
      });
    }
    default:
      return new GatewayInternalServerError({
        message,
        statusCode,
        cause,
        generationId
      });
  }
}
function extractApiCallResponse(error2) {
  if (error2.data !== void 0) {
    return error2.data;
  }
  if (error2.responseBody != null) {
    try {
      return secureJsonParse(error2.responseBody);
    } catch (e) {
      return error2.responseBody;
    }
  }
  return {};
}
function isTimeoutError(error2) {
  if (!(error2 instanceof Error)) {
    return false;
  }
  const errorCode = error2.code;
  if (typeof errorCode === "string") {
    const undiciTimeoutCodes = [
      "UND_ERR_HEADERS_TIMEOUT",
      "UND_ERR_BODY_TIMEOUT",
      "UND_ERR_CONNECT_TIMEOUT"
    ];
    return undiciTimeoutCodes.includes(errorCode);
  }
  return false;
}
async function asGatewayError(error2, authMethod) {
  var _a123;
  if (GatewayError.isInstance(error2)) {
    return error2;
  }
  if (isTimeoutError(error2)) {
    return GatewayTimeoutError.createTimeoutError({
      originalMessage: error2 instanceof Error ? error2.message : "Unknown error",
      cause: error2
    });
  }
  if (APICallError.isInstance(error2)) {
    if (error2.cause && isTimeoutError(error2.cause)) {
      return GatewayTimeoutError.createTimeoutError({
        originalMessage: error2.message,
        cause: error2
      });
    }
    return await createGatewayErrorFromResponse({
      response: extractApiCallResponse(error2),
      statusCode: (_a123 = error2.statusCode) != null ? _a123 : 500,
      defaultMessage: "Gateway request failed",
      cause: error2,
      authMethod,
      isRetryable: error2.isRetryable && (error2.statusCode == null || error2.statusCode < 400) ? true : void 0
    });
  }
  return await createGatewayErrorFromResponse({
    response: {},
    statusCode: 500,
    defaultMessage: error2 instanceof Error ? `Gateway request failed: ${error2.message}` : "Unknown Gateway error",
    cause: error2,
    authMethod
  });
}
async function parseAuthMethod(headers) {
  const result = await safeValidateTypes({
    value: headers[GATEWAY_AUTH_METHOD_HEADER],
    schema: gatewayAuthMethodSchema
  });
  return result.success ? result.value : void 0;
}
function maybeEncodeBatchFileParts(options) {
  for (const message of options.prompt) {
    if (!Array.isArray(message.content)) {
      continue;
    }
    for (const part of message.content) {
      if (part.type === "file" || part.type === "reasoning-file") {
        part.data = maybeBase64EncodeFileData(part.data);
      } else if (part.type === "tool-result" && part.output.type === "content") {
        for (const contentPart of part.output.value) {
          if (contentPart.type === "file") {
            contentPart.data = maybeBase64EncodeFileData(contentPart.data);
          }
        }
      }
    }
  }
  return options;
}
function maybeBase64EncodeFileData(data) {
  if (data.type === "data") {
    const bytes = data.data;
    if (bytes instanceof Uint8Array) {
      return { ...data, data: Buffer.from(bytes).toString("base64") };
    }
  }
  return data;
}
function validateSingleModel(requests) {
  var _a123;
  const modelId = (_a123 = requests[0]) == null ? void 0 : _a123.modelId;
  if (modelId == null) {
    throw new InvalidArgumentError({
      argument: "requests",
      message: "The AI Gateway Batch API requires at least one request."
    });
  }
  for (const request of requests) {
    if (request.modelId !== modelId) {
      throw new InvalidArgumentError({
        argument: "requests",
        message: `The AI Gateway Batch API requires all requests in a batch to use the same model. Found "${modelId}" and "${request.modelId}".`
      });
    }
  }
  return modelId;
}
function assertTextBatchRequests(requests) {
  for (const request of requests) {
    const requestType = request.type;
    if (requestType !== "text") {
      throw new UnsupportedFunctionalityError({
        functionality: `batch request type: ${requestType}`,
        message: `The AI Gateway Batch API does not support batch requests with type "${requestType}".`
      });
    }
  }
}
function getGatewayBatchIdempotencyKey(providerOptions) {
  const gatewayOptions = providerOptions == null ? void 0 : providerOptions.gateway;
  if (gatewayOptions == null || typeof gatewayOptions !== "object" || Array.isArray(gatewayOptions)) {
    return void 0;
  }
  const key = gatewayOptions.idempotencyKey;
  return typeof key === "string" && key.length > 0 ? key : void 0;
}
function omitGatewayIdempotencyKey(providerOptions) {
  const gatewayOptions = providerOptions == null ? void 0 : providerOptions.gateway;
  if (gatewayOptions == null || typeof gatewayOptions !== "object" || Array.isArray(gatewayOptions) || !("idempotencyKey" in gatewayOptions)) {
    return providerOptions;
  }
  const { idempotencyKey: _idempotencyKey, ...restGatewayOptions } = gatewayOptions;
  const restProviderOptions = { ...providerOptions };
  if (Object.keys(restGatewayOptions).length === 0) {
    delete restProviderOptions.gateway;
  } else {
    restProviderOptions.gateway = restGatewayOptions;
  }
  if (Object.keys(restProviderOptions).length === 0) {
    return void 0;
  }
  return restProviderOptions;
}
function isAbortOrTimeoutError(error2) {
  if (!(error2 instanceof Error || error2 instanceof DOMException)) {
    return false;
  }
  return error2.name === "AbortError" || error2.name === "TimeoutError";
}
function convertGatewayBatchStatus(body) {
  var _a123, _b123, _c, _d;
  const requestCounts = normalizeBatchRequestCounts({
    total: (_a123 = body.requestCounts) == null ? void 0 : _a123.total,
    pending: (_b123 = body.requestCounts) == null ? void 0 : _b123.pending,
    completed: (_c = body.requestCounts) == null ? void 0 : _c.completed,
    failed: (_d = body.requestCounts) == null ? void 0 : _d.failed
  });
  return {
    status: body.status,
    ...body.rawStatus != null && { rawStatus: body.rawStatus },
    ...requestCounts != null && { requestCounts },
    ...body.error != null && {
      error: {
        message: body.error.message,
        ...body.error.type != null && { type: body.error.type },
        ...body.error.code != null && { code: body.error.code },
        ...body.error.statusCode != null && {
          statusCode: body.error.statusCode
        }
      }
    },
    ...body.createdAt != null && { createdAt: body.createdAt },
    ...body.expiresAt != null && { expiresAt: body.expiresAt },
    ...body.providerMetadata != null && {
      providerMetadata: body.providerMetadata
    }
  };
}
async function* convertGatewayBatchResultLines(lines) {
  var _a123;
  for await (const line of lines) {
    const item = line;
    if (item.status === "succeeded") {
      const response = (_a123 = item.result) == null ? void 0 : _a123.response;
      if (response !== void 0 && typeof response.timestamp === "string") {
        response.timestamp = new Date(response.timestamp);
      }
    }
    yield item;
  }
}
function maybeBase64EncodeFileData2(data) {
  if (data.type === "data") {
    const bytes = data.data;
    if (bytes instanceof Uint8Array) {
      return { ...data, data: Buffer.from(bytes).toString("base64") };
    }
  }
  return data;
}
function maybeEncodeImageFile(file) {
  if (file.type === "file" && file.data instanceof Uint8Array) {
    return {
      ...file,
      data: convertUint8ArrayToBase64(file.data)
    };
  }
  return file;
}
function maybeEncodeVideoFile(file) {
  if (file.type === "file" && file.data instanceof Uint8Array) {
    return {
      ...file,
      data: convertUint8ArrayToBase64(file.data)
    };
  }
  return file;
}
function toGatewayTranscriptionUrl(baseURL, modelId) {
  const url = new URL(`${baseURL.replace(/^http/, "ws")}/transcription-model`);
  url.searchParams.set("ai-model-id", modelId);
  return url.toString();
}
function getProtocolsFromHeaders(headers) {
  const normalizedHeaders = normalizeHeaders(headers);
  const authorization = normalizedHeaders.authorization;
  const token = (authorization == null ? void 0 : authorization.startsWith("Bearer ")) ? authorization.slice("Bearer ".length) : void 0;
  return token == null ? [GATEWAY_TRANSCRIPTION_SUBPROTOCOL] : getGatewayTranscriptionProtocols(token, {
    teamIdOrSlug: normalizedHeaders[VERCEL_AI_GATEWAY_TEAM_HEADER]
  });
}
function createGatewayTranscriptionStream({
  webSocket,
  url,
  protocols,
  headers,
  startFrame,
  audio,
  abortSignal,
  authMethod
}) {
  let finished = false;
  let cleanup = /* @__PURE__ */ __name(() => {
  }, "cleanup");
  return new ReadableStream({
    start: /* @__PURE__ */ __name((controller) => {
      let audioReader;
      let hasServerErrorPart = false;
      let lastServerError;
      let audioStopped = false;
      let connection;
      cleanup = /* @__PURE__ */ __name((closeCode) => {
        if (audioReader != null) {
          void audioReader.cancel().catch(() => {
          });
        } else {
          void audio.cancel().catch(() => {
          });
        }
        connection == null ? void 0 : connection.close(closeCode);
      }, "cleanup");
      const stopAudio = /* @__PURE__ */ __name(() => {
        audioStopped = true;
        if (audioReader != null) {
          void audioReader.cancel().catch(() => {
          });
          audioReader = void 0;
        } else {
          void audio.cancel().catch(() => {
          });
        }
      }, "stopAudio");
      const finishWithError = /* @__PURE__ */ __name((error2) => {
        if (finished) return;
        finished = true;
        cleanup();
        void errorControllerWithGatewayError(controller, error2, authMethod);
      }, "finishWithError");
      const sendAudio = /* @__PURE__ */ __name(async (socket) => {
        const reader = audio.getReader();
        audioReader = reader;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done || finished) break;
            const bytes = typeof value === "string" ? convertBase64ToUint8Array(value) : value;
            for (let offset = 0; offset < bytes.length; offset += MAX_AUDIO_FRAME_BYTES) {
              if (finished) break;
              socket.send(
                bytes.subarray(offset, offset + MAX_AUDIO_FRAME_BYTES)
              );
              await waitForWebSocketBufferDrain(socket);
            }
          }
        } finally {
          reader.releaseLock();
          if (audioReader === reader) {
            audioReader = void 0;
          }
        }
        if (!finished && !audioStopped) {
          socket.send(
            JSON.stringify({
              type: TRANSCRIPTION_STREAM_AUDIO_DONE_FRAME_TYPE
            })
          );
        }
      }, "sendAudio");
      connection = connectToWebSocket({
        url,
        protocols,
        headers,
        webSocket,
        abortSignal,
        onAbort: /* @__PURE__ */ __name((reason) => {
          if (finished) return;
          finished = true;
          cleanup();
          controller.error(reason);
        }, "onAbort"),
        onProcessingError: finishWithError,
        onOpen: /* @__PURE__ */ __name((socket) => {
          socket.send(JSON.stringify(startFrame));
          void sendAudio(socket).catch(finishWithError);
        }, "onOpen"),
        // Server frames are envelope-serialized stream parts; the codec
        // handles parsing, unknown-part skipping, and timestamp revival.
        onMessageText: /* @__PURE__ */ __name((text2) => {
          if (finished) return;
          const part = parseTranscriptionStreamPart(text2);
          if (part == null) return;
          if (part.type === "finish") {
            finished = true;
            controller.enqueue(part);
            controller.close();
            cleanup(1e3);
            return;
          }
          if (part.type === "error") {
            hasServerErrorPart = true;
            lastServerError = part.error;
            stopAudio();
          }
          controller.enqueue(part);
        }, "onMessageText"),
        onSocketError: /* @__PURE__ */ __name(() => {
          finishWithError(
            new Error("Connection error on AI Gateway transcription stream")
          );
        }, "onSocketError"),
        onClose: /* @__PURE__ */ __name(() => {
          if (hasServerErrorPart) {
            if (finished) return;
            void createErrorFromServerErrorPart(
              lastServerError,
              authMethod
            ).then(finishWithError);
            return;
          }
          finishWithError(
            new Error(
              "AI Gateway transcription stream closed before a finish part was received"
            )
          );
        }, "onClose")
      });
    }, "start"),
    cancel: /* @__PURE__ */ __name(() => {
      if (finished) return;
      finished = true;
      cleanup();
    }, "cancel")
  });
}
async function errorControllerWithGatewayError(controller, error2, authMethod) {
  controller.error(await asGatewayError(error2, authMethod));
}
function getServerErrorMessage(error2) {
  if (error2 != null && typeof error2 === "object" && "message" in error2 && typeof error2.message === "string") {
    return error2.message;
  }
  return getErrorMessage(error2);
}
async function createErrorFromServerErrorPart(error2, authMethod) {
  if (typeof error2 === "object" && error2 != null && "message" in error2 && typeof error2.message === "string" && "type" in error2 && typeof error2.type === "string" && error2.type in SERVER_ERROR_STATUS_CODES) {
    return createGatewayErrorFromResponse({
      response: { error: { message: error2.message, type: error2.type } },
      statusCode: SERVER_ERROR_STATUS_CODES[error2.type],
      authMethod
    });
  }
  return new Error(
    `AI Gateway transcription stream failed: ${getServerErrorMessage(error2)}`
  );
}
function toGatewayRealtimeUrl(baseURL, modelId) {
  const url = new URL(`${baseURL.replace(/^http/, "ws")}/realtime-model`);
  url.searchParams.set("ai-model-id", modelId);
  return url.toString();
}
async function getVercelRequestId() {
  var _a123;
  return (_a123 = (0, import_oidc.getContext)().headers) == null ? void 0 : _a123["x-vercel-id"];
}
function createGateway(options = {}) {
  var _a123, _b123;
  let pendingMetadata = null;
  let metadataCache = null;
  const cacheRefreshMillis = (_a123 = options.metadataCacheRefreshMillis) != null ? _a123 : 1e3 * 60 * 5;
  let lastFetchTime = 0;
  const baseURL = (_b123 = withoutTrailingSlash(options.baseURL)) != null ? _b123 : "https://ai-gateway.vercel.sh/v4/ai";
  const createAuthHeaders = /* @__PURE__ */ __name((auth) => withUserAgentSuffix(
    {
      Authorization: `Bearer ${auth.token}`,
      "ai-gateway-protocol-version": AI_GATEWAY_PROTOCOL_VERSION,
      [GATEWAY_AUTH_METHOD_HEADER]: auth.authMethod,
      ...options.teamIdOrSlug != null ? { [VERCEL_AI_GATEWAY_TEAM_HEADER]: options.teamIdOrSlug } : {},
      ...options.headers
    },
    `ai-sdk/gateway/${VERSION2}`
  ), "createAuthHeaders");
  const getHeaders = /* @__PURE__ */ __name(async () => {
    try {
      return createAuthHeaders(await getGatewayAuthToken(options));
    } catch (error2) {
      throw GatewayAuthenticationError.createContextualError({
        apiKeyProvided: false,
        oidcTokenProvided: false,
        statusCode: 401,
        cause: error2
      });
    }
  }, "getHeaders");
  const getRealtimeAuthToken = /* @__PURE__ */ __name(async () => {
    try {
      return await getGatewayAuthToken(options);
    } catch (error2) {
      throw GatewayAuthenticationError.createContextualError({
        apiKeyProvided: false,
        oidcTokenProvided: false,
        statusCode: 401,
        cause: error2
      });
    }
  }, "getRealtimeAuthToken");
  const mintClientSecret = /* @__PURE__ */ __name(async (params) => {
    assertGatewayClientSecretServerEnvironment();
    const auth = await getRealtimeAuthToken();
    const headers = createAuthHeaders(auth);
    const url = new URL("/v1/realtime/client-secrets", baseURL).toString();
    try {
      const { value } = await postJsonToApi({
        url,
        headers,
        body: {
          model: params.modelId,
          ...params.routeKind != null && { routeKind: params.routeKind },
          ...params.expiresAfterSeconds != null && {
            expiresIn: params.expiresAfterSeconds
          }
        },
        successfulResponseHandler: createJsonResponseHandler(
          gatewayClientSecretResponseSchema
        ),
        failedResponseHandler: createJsonErrorResponseHandler({
          errorSchema: z.any(),
          errorToMessage: /* @__PURE__ */ __name((data) => {
            var _a133;
            return (_a133 = getErrorMessage(data)) != null ? _a133 : "unknown error";
          }, "errorToMessage")
        }),
        fetch: options.fetch
      });
      return {
        token: value.token,
        ...value.expiresAt != null && { expiresAt: value.expiresAt }
      };
    } catch (error2) {
      throw await asGatewayError(error2, await parseAuthMethod(headers));
    }
  }, "mintClientSecret");
  const createO11yHeaders = /* @__PURE__ */ __name(() => {
    const deploymentId = loadOptionalSetting({
      settingValue: void 0,
      environmentVariableName: "VERCEL_DEPLOYMENT_ID"
    });
    const environment = loadOptionalSetting({
      settingValue: void 0,
      environmentVariableName: "VERCEL_ENV"
    });
    const region = loadOptionalSetting({
      settingValue: void 0,
      environmentVariableName: "VERCEL_REGION"
    });
    const projectId = loadOptionalSetting({
      settingValue: void 0,
      environmentVariableName: "VERCEL_PROJECT_ID"
    });
    return async () => {
      const requestId = await getVercelRequestId();
      return {
        ...deploymentId && { "ai-o11y-deployment-id": deploymentId },
        ...environment && { "ai-o11y-environment": environment },
        ...region && { "ai-o11y-region": region },
        ...requestId && { "ai-o11y-request-id": requestId },
        ...projectId && { "ai-o11y-project-id": projectId }
      };
    };
  }, "createO11yHeaders");
  const createLanguageModel = /* @__PURE__ */ __name((modelId) => {
    return new GatewayLanguageModel(modelId, {
      provider: "gateway",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders()
    });
  }, "createLanguageModel");
  const createBatch = /* @__PURE__ */ __name(() => new GatewayBatch({
    provider: "gateway",
    baseURL,
    headers: getHeaders,
    fetch: options.fetch,
    o11yHeaders: createO11yHeaders()
  }), "createBatch");
  const getAvailableModels = /* @__PURE__ */ __name(async () => {
    var _a133, _b133, _c;
    const now = (_c = (_b133 = (_a133 = options._internal) == null ? void 0 : _a133.currentDate) == null ? void 0 : _b133.call(_a133).getTime()) != null ? _c : Date.now();
    if (!pendingMetadata || now - lastFetchTime > cacheRefreshMillis) {
      lastFetchTime = now;
      pendingMetadata = new GatewayFetchMetadata({
        baseURL,
        headers: getHeaders,
        fetch: options.fetch
      }).getAvailableModels().then((metadata) => {
        metadataCache = metadata;
        return metadata;
      }).catch(async (error2) => {
        throw await asGatewayError(
          error2,
          await parseAuthMethod(await getHeaders())
        );
      });
    }
    return metadataCache ? Promise.resolve(metadataCache) : pendingMetadata;
  }, "getAvailableModels");
  const getCredits = /* @__PURE__ */ __name(async () => {
    return new GatewayFetchMetadata({
      baseURL,
      headers: getHeaders,
      fetch: options.fetch
    }).getCredits().catch(async (error2) => {
      throw await asGatewayError(
        error2,
        await parseAuthMethod(await getHeaders())
      );
    });
  }, "getCredits");
  const getSpendReport = /* @__PURE__ */ __name(async (params) => {
    return new GatewaySpendReport({
      baseURL,
      headers: getHeaders,
      fetch: options.fetch
    }).getSpendReport(params).catch(async (error2) => {
      throw await asGatewayError(
        error2,
        await parseAuthMethod(await getHeaders())
      );
    });
  }, "getSpendReport");
  const getGenerationInfo = /* @__PURE__ */ __name(async (params) => {
    return new GatewayGenerationInfoFetcher({
      baseURL,
      headers: getHeaders,
      fetch: options.fetch
    }).getGenerationInfo(params).catch(async (error2) => {
      throw await asGatewayError(
        error2,
        await parseAuthMethod(await getHeaders())
      );
    });
  }, "getGenerationInfo");
  const provider = /* @__PURE__ */ __name(function(modelId) {
    if (new.target) {
      throw new Error(
        "The Gateway Provider model function cannot be called with the new keyword."
      );
    }
    return createLanguageModel(modelId);
  }, "provider");
  provider.specificationVersion = "v4";
  provider.getAvailableModels = getAvailableModels;
  provider.getCredits = getCredits;
  provider.getSpendReport = getSpendReport;
  provider.getGenerationInfo = getGenerationInfo;
  provider.imageModel = (modelId) => {
    return new GatewayImageModel(modelId, {
      provider: "gateway",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders()
    });
  };
  provider.languageModel = createLanguageModel;
  provider.experimental_batch = createBatch;
  const createEmbeddingModel = /* @__PURE__ */ __name((modelId) => {
    return new GatewayEmbeddingModel(modelId, {
      provider: "gateway",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders()
    });
  }, "createEmbeddingModel");
  provider.embeddingModel = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  provider.videoModel = (modelId) => {
    return new GatewayVideoModel(modelId, {
      provider: "gateway",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders()
    });
  };
  const createRerankingModel = /* @__PURE__ */ __name((modelId) => {
    return new GatewayRerankingModel(modelId, {
      provider: "gateway",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders()
    });
  }, "createRerankingModel");
  provider.rerankingModel = createRerankingModel;
  provider.reranking = createRerankingModel;
  const createSpeechModel = /* @__PURE__ */ __name((modelId) => {
    return new GatewaySpeechModel(modelId, {
      provider: "gateway",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders()
    });
  }, "createSpeechModel");
  provider.speechModel = createSpeechModel;
  provider.speech = createSpeechModel;
  const createTranscriptionModel = /* @__PURE__ */ __name((modelId) => {
    return new GatewayTranscriptionModel(modelId, {
      provider: "gateway",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders(),
      webSocket: options.webSocket
    });
  }, "createTranscriptionModel");
  provider.transcriptionModel = createTranscriptionModel;
  provider.transcription = createTranscriptionModel;
  provider.experimental_transcription = Object.assign(
    (modelId) => createTranscriptionModel(modelId),
    {
      getToken: /* @__PURE__ */ __name(async (tokenOptions) => {
        const secret = await mintClientSecret({
          modelId: tokenOptions.model,
          routeKind: "transcription",
          ...tokenOptions.expiresAfterSeconds != null && {
            expiresAfterSeconds: tokenOptions.expiresAfterSeconds
          }
        });
        return {
          token: secret.token,
          url: toGatewayTranscriptionUrl(baseURL, tokenOptions.model),
          ...secret.expiresAt != null && { expiresAt: secret.expiresAt }
        };
      }, "getToken")
    }
  );
  const createRealtimeModel = /* @__PURE__ */ __name((modelId) => new GatewayRealtimeModel(modelId, {
    provider: "gateway.realtime",
    baseURL,
    teamIdOrSlug: options.teamIdOrSlug,
    createClientSecret: mintClientSecret
  }), "createRealtimeModel");
  provider.experimental_realtime = Object.assign(
    (modelId) => createRealtimeModel(modelId),
    {
      getToken: /* @__PURE__ */ __name(async (tokenOptions) => {
        const { model: modelId, ...secretOptions } = tokenOptions;
        const model = createRealtimeModel(modelId);
        const secret = await model.doCreateClientSecret(secretOptions);
        return {
          token: secret.token,
          url: secret.url,
          ...secret.expiresAt != null && { expiresAt: secret.expiresAt }
        };
      }, "getToken")
    }
  );
  provider.chat = provider.languageModel;
  provider.embedding = provider.embeddingModel;
  provider.image = provider.imageModel;
  provider.video = provider.videoModel;
  provider.tools = gatewayTools;
  return provider;
}
async function getGatewayAuthToken(options) {
  const apiKey = loadOptionalSetting({
    settingValue: options.apiKey,
    environmentVariableName: "AI_GATEWAY_API_KEY"
  });
  if (apiKey) {
    return {
      token: apiKey,
      authMethod: "api-key"
    };
  }
  const oidcToken = await (0, import_oidc2.getVercelOidcToken)();
  return {
    token: oidcToken,
    authMethod: "oidc"
  };
}
function assertGatewayClientSecretServerEnvironment() {
  if (typeof globalThis.window !== "undefined") {
    throw new Error(
      "AI Gateway client secrets must be minted server-side: minting needs your Gateway credential, which must never reach the browser. Call gateway.experimental_realtime.getToken() or gateway.experimental_transcription.getToken() from your server and pass the returned token to the client."
    );
  }
}
var import_oidc, import_oidc2, GATEWAY_REALTIME_SUBPROTOCOL, GATEWAY_TRANSCRIPTION_SUBPROTOCOL, GATEWAY_AUTH_SUBPROTOCOL_PREFIX, GATEWAY_TEAM_SUBPROTOCOL_PREFIX, z, marker17, symbol18, _a20, _b18, GatewayError, name17, marker23, symbol23, _a23, _b23, GatewayAuthenticationError, name23, marker33, symbol32, _a32, _b32, GatewayInvalidRequestError, name32, marker42, symbol42, _a42, _b42, GatewayRateLimitError, name42, marker52, symbol52, modelNotFoundParamSchema, _a52, _b52, GatewayModelNotFoundError, name52, marker62, symbol62, _a62, _b62, GatewayNotFoundError, name62, marker72, symbol72, _a72, _b72, GatewayInternalServerError, name72, marker82, symbol82, _a82, _b82, GatewayFailedDependencyError, name82, marker92, symbol92, forbiddenParamSchema, _a92, _b92, GatewayForbiddenError, name92, marker102, symbol102, _a102, _b102, GatewayResponseError, gatewayErrorResponseSchema, name102, marker112, symbol112, _a112, _b112, GatewayTimeoutError, GATEWAY_AUTH_METHOD_HEADER, VERCEL_AI_GATEWAY_TEAM_HEADER, gatewayAuthMethodSchema, KNOWN_MODEL_TYPES, GatewayFetchMetadata, gatewayAvailableModelsResponseSchema, gatewayCreditsResponseSchema, GatewaySpendReport, gatewaySpendReportResponseSchema, GatewayGenerationInfoFetcher, gatewayGenerationInfoResponseSchema, GatewayBatch, gatewayBatchItemResultLineSchema, gatewayBatchErrorSchema, gatewayBatchRequestCountsSchema, gatewayBatchProviderMetadataSchema, gatewayBatchStatusFieldsSchema, gatewayBatchStartResponseSchema, gatewayBatchStatusResponseSchema, GatewayLanguageModel, GatewayEmbeddingModel, gatewayEmbeddingWarningSchema, gatewayEmbeddingResponseSchema, GatewayImageModel, providerMetadataEntrySchema, gatewayImageWarningSchema, gatewayImageUsageSchema, gatewayImageResponseSchema, GatewayVideoModel, providerMetadataEntrySchema2, gatewayVideoDataSchema, gatewayVideoWarningSchema, gatewayVideoEventSchema, gatewayVideoStartResponseSchema, gatewayVideoStatusResponseSchema, GatewayRerankingModel, gatewayRerankingWarningSchema, gatewayRerankingResponseSchema, GatewaySpeechModel, providerMetadataEntrySchema3, gatewaySpeechWarningSchema, gatewaySpeechResponseSchema, GatewayTranscriptionModel, MAX_AUDIO_FRAME_BYTES, providerMetadataEntrySchema4, gatewayTranscriptionWarningSchema, gatewayTranscriptionResponseSchema, SERVER_ERROR_STATUS_CODES, GatewayRealtimeModel, exaSearchInputSchema, exaSearchOutputSchema, exaSearchToolFactory, exaSearch, parallelSearchInputSchema, parallelSearchOutputSchema, parallelSearchToolFactory, parallelSearch, perplexitySearchInputSchema, perplexitySearchOutputSchema, perplexitySearchToolFactory, perplexitySearch, takoDataSourceInputSchema, takoWebSourceInputSchema, takoSearchInputSchema, takoDatasetCellSchema, takoResultContentSchema, takoCardSchema, takoWebResultSchema, takoSearchOutputSchema, takoSearchToolFactory, takoSearch, gatewayTools, VERSION2, AI_GATEWAY_PROTOCOL_VERSION, gatewayClientSecretResponseSchema, gateway;
var init_dist5 = __esm({
  "node_modules/@ai-sdk/gateway/dist/index.js"() {
    init_dist4();
    init_v4();
    init_dist();
    init_dist4();
    init_dist4();
    init_dist4();
    init_dist4();
    init_dist4();
    init_dist4();
    init_dist4();
    init_dist4();
    init_dist();
    init_dist4();
    init_dist4();
    init_dist4();
    init_dist4();
    init_dist();
    init_dist4();
    init_dist4();
    init_dist4();
    init_dist();
    init_dist4();
    init_dist4();
    init_dist4();
    init_dist4();
    init_dist4();
    import_oidc = __toESM(require_index_browser(), 1);
    import_oidc2 = __toESM(require_index_browser(), 1);
    GATEWAY_REALTIME_SUBPROTOCOL = "ai-gateway-realtime.v1";
    GATEWAY_TRANSCRIPTION_SUBPROTOCOL = "ai-gateway-transcription.v1";
    GATEWAY_AUTH_SUBPROTOCOL_PREFIX = "ai-gateway-auth.";
    GATEWAY_TEAM_SUBPROTOCOL_PREFIX = "ai-gateway-team.";
    __name(getGatewayRealtimeProtocols, "getGatewayRealtimeProtocols");
    __name(getGatewayTranscriptionProtocols, "getGatewayTranscriptionProtocols");
    __name(buildGatewayProtocols, "buildGatewayProtocols");
    __name(encodeSubprotocolValue, "encodeSubprotocolValue");
    z = {
      any,
      array,
      boolean: boolean2,
      discriminatedUnion,
      enum: _enum,
      literal,
      number: number2,
      object,
      record,
      string: string2,
      union,
      unknown
    };
    marker17 = "vercel.ai.gateway.error";
    symbol18 = Symbol.for(marker17);
    GatewayError = class _GatewayError extends (_b18 = Error, _a20 = symbol18, _b18) {
      static {
        __name(this, "_GatewayError");
      }
      constructor({
        message,
        statusCode = 500,
        cause,
        generationId,
        isRetryable = statusCode != null && (statusCode === 408 || // request timeout
        statusCode === 409 || // conflict
        statusCode === 429 || // too many requests
        statusCode >= 500)
        // server error
      }) {
        super(generationId ? `${message} [${generationId}]` : message);
        this[_a20] = true;
        this.statusCode = statusCode;
        this.cause = cause;
        this.generationId = generationId;
        this.isRetryable = isRetryable;
      }
      /**
       * Checks if the given error is a Gateway Error.
       * @param {unknown} error - The error to check.
       * @returns {boolean} True if the error is a Gateway Error, false otherwise.
       */
      static isInstance(error2) {
        return _GatewayError.hasMarker(error2);
      }
      static hasMarker(error2) {
        return typeof error2 === "object" && error2 !== null && symbol18 in error2 && error2[symbol18] === true;
      }
    };
    name17 = "GatewayAuthenticationError";
    marker23 = `vercel.ai.gateway.error.${name17}`;
    symbol23 = Symbol.for(marker23);
    GatewayAuthenticationError = class _GatewayAuthenticationError extends (_b23 = GatewayError, _a23 = symbol23, _b23) {
      static {
        __name(this, "_GatewayAuthenticationError");
      }
      constructor({
        message = "Authentication failed",
        statusCode = 401,
        cause,
        generationId
      } = {}) {
        super({ message, statusCode, cause, generationId });
        this[_a23] = true;
        this.name = name17;
        this.type = "authentication_error";
      }
      static isInstance(error2) {
        return GatewayError.hasMarker(error2) && symbol23 in error2;
      }
      /**
       * Creates a contextual error message when authentication fails
       */
      static createContextualError({
        apiKeyProvided,
        oidcTokenProvided,
        statusCode = 401,
        cause,
        generationId
      }) {
        let contextualMessage;
        if (apiKeyProvided) {
          contextualMessage = `AI Gateway authentication failed: Invalid API key or token.

Create a new API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys

Provide an API key or Vercel access token via 'apiKey' option or 'AI_GATEWAY_API_KEY' environment variable.`;
        } else if (oidcTokenProvided) {
          contextualMessage = `AI Gateway authentication failed: Invalid OIDC token.

Run 'npx vercel link' to link your project, then 'vc env pull' to fetch the token.

Alternatively, use an API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys
or pass a Vercel access token via the 'apiKey' option.`;
        } else {
          contextualMessage = `AI Gateway authentication failed: No authentication provided.

Option 1 - API key:
Create an API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys
Provide via 'apiKey' option or 'AI_GATEWAY_API_KEY' environment variable.

Option 2 - Vercel access token:
Pass a Vercel personal access token or Vercel app access token via the 'apiKey' option.

Option 3 - OIDC token:
Run 'npx vercel link' to link your project, then 'vc env pull' to fetch the token.`;
        }
        return new _GatewayAuthenticationError({
          message: contextualMessage,
          statusCode,
          cause,
          generationId
        });
      }
    };
    name23 = "GatewayInvalidRequestError";
    marker33 = `vercel.ai.gateway.error.${name23}`;
    symbol32 = Symbol.for(marker33);
    GatewayInvalidRequestError = class extends (_b32 = GatewayError, _a32 = symbol32, _b32) {
      static {
        __name(this, "GatewayInvalidRequestError");
      }
      constructor({
        message = "Invalid request",
        statusCode = 400,
        cause,
        generationId
      } = {}) {
        super({ message, statusCode, cause, generationId });
        this[_a32] = true;
        this.name = name23;
        this.type = "invalid_request_error";
      }
      static isInstance(error2) {
        return GatewayError.hasMarker(error2) && symbol32 in error2;
      }
    };
    name32 = "GatewayRateLimitError";
    marker42 = `vercel.ai.gateway.error.${name32}`;
    symbol42 = Symbol.for(marker42);
    GatewayRateLimitError = class extends (_b42 = GatewayError, _a42 = symbol42, _b42) {
      static {
        __name(this, "GatewayRateLimitError");
      }
      constructor({
        message = "Rate limit exceeded",
        statusCode = 429,
        cause,
        generationId
      } = {}) {
        super({ message, statusCode, cause, generationId });
        this[_a42] = true;
        this.name = name32;
        this.type = "rate_limit_exceeded";
      }
      static isInstance(error2) {
        return GatewayError.hasMarker(error2) && symbol42 in error2;
      }
    };
    name42 = "GatewayModelNotFoundError";
    marker52 = `vercel.ai.gateway.error.${name42}`;
    symbol52 = Symbol.for(marker52);
    modelNotFoundParamSchema = lazySchema(
      () => zodSchema(
        z.object({
          modelId: z.string()
        })
      )
    );
    GatewayModelNotFoundError = class extends (_b52 = GatewayError, _a52 = symbol52, _b52) {
      static {
        __name(this, "GatewayModelNotFoundError");
      }
      constructor({
        message = "Model not found",
        statusCode = 404,
        modelId,
        cause,
        generationId
      } = {}) {
        super({ message, statusCode, cause, generationId });
        this[_a52] = true;
        this.name = name42;
        this.type = "model_not_found";
        this.modelId = modelId;
      }
      static isInstance(error2) {
        return GatewayError.hasMarker(error2) && symbol52 in error2;
      }
    };
    name52 = "GatewayNotFoundError";
    marker62 = `vercel.ai.gateway.error.${name52}`;
    symbol62 = Symbol.for(marker62);
    GatewayNotFoundError = class extends (_b62 = GatewayError, _a62 = symbol62, _b62) {
      static {
        __name(this, "GatewayNotFoundError");
      }
      constructor({
        message = "Resource not found",
        statusCode = 404,
        cause,
        generationId
      } = {}) {
        super({ message, statusCode, cause, generationId });
        this[_a62] = true;
        this.name = name52;
        this.type = "not_found";
      }
      static isInstance(error2) {
        return GatewayError.hasMarker(error2) && symbol62 in error2;
      }
    };
    name62 = "GatewayInternalServerError";
    marker72 = `vercel.ai.gateway.error.${name62}`;
    symbol72 = Symbol.for(marker72);
    GatewayInternalServerError = class extends (_b72 = GatewayError, _a72 = symbol72, _b72) {
      static {
        __name(this, "GatewayInternalServerError");
      }
      constructor({
        message = "Internal server error",
        statusCode = 500,
        cause,
        generationId
      } = {}) {
        super({ message, statusCode, cause, generationId });
        this[_a72] = true;
        this.name = name62;
        this.type = "internal_server_error";
      }
      static isInstance(error2) {
        return GatewayError.hasMarker(error2) && symbol72 in error2;
      }
    };
    name72 = "GatewayFailedDependencyError";
    marker82 = `vercel.ai.gateway.error.${name72}`;
    symbol82 = Symbol.for(marker82);
    GatewayFailedDependencyError = class extends (_b82 = GatewayError, _a82 = symbol82, _b82) {
      static {
        __name(this, "GatewayFailedDependencyError");
      }
      constructor({
        message = "Failed dependency",
        statusCode = 424,
        cause,
        generationId
      } = {}) {
        super({ message, statusCode, cause, generationId });
        this[_a82] = true;
        this.name = name72;
        this.type = "failed_dependency";
      }
      static isInstance(error2) {
        return GatewayError.hasMarker(error2) && symbol82 in error2;
      }
    };
    name82 = "GatewayForbiddenError";
    marker92 = `vercel.ai.gateway.error.${name82}`;
    symbol92 = Symbol.for(marker92);
    forbiddenParamSchema = lazySchema(
      () => zodSchema(
        z.object({
          ruleId: z.string()
        })
      )
    );
    GatewayForbiddenError = class extends (_b92 = GatewayError, _a92 = symbol92, _b92) {
      static {
        __name(this, "GatewayForbiddenError");
      }
      constructor({
        message = "Forbidden",
        statusCode = 403,
        cause,
        generationId,
        ruleId
      } = {}) {
        super({ message, statusCode, cause, generationId });
        this[_a92] = true;
        this.name = name82;
        this.type = "forbidden";
        this.ruleId = ruleId;
      }
      static isInstance(error2) {
        return GatewayError.hasMarker(error2) && symbol92 in error2;
      }
    };
    name92 = "GatewayResponseError";
    marker102 = `vercel.ai.gateway.error.${name92}`;
    symbol102 = Symbol.for(marker102);
    GatewayResponseError = class extends (_b102 = GatewayError, _a102 = symbol102, _b102) {
      static {
        __name(this, "GatewayResponseError");
      }
      constructor({
        message = "Invalid response from Gateway",
        statusCode = 502,
        response,
        validationError,
        cause,
        generationId,
        isRetryable
      } = {}) {
        super({ message, statusCode, cause, generationId, isRetryable });
        this[_a102] = true;
        this.name = name92;
        this.type = "response_error";
        this.response = response;
        this.validationError = validationError;
      }
      static isInstance(error2) {
        return GatewayError.hasMarker(error2) && symbol102 in error2;
      }
    };
    __name(createGatewayErrorFromResponse, "createGatewayErrorFromResponse");
    gatewayErrorResponseSchema = lazySchema(
      () => zodSchema(
        z.object({
          error: z.object({
            message: z.string(),
            type: z.string().nullish(),
            param: z.unknown().nullish(),
            code: z.union([z.string(), z.number()]).nullish()
          }),
          generationId: z.string().nullish()
        })
      )
    );
    __name(extractApiCallResponse, "extractApiCallResponse");
    name102 = "GatewayTimeoutError";
    marker112 = `vercel.ai.gateway.error.${name102}`;
    symbol112 = Symbol.for(marker112);
    GatewayTimeoutError = class _GatewayTimeoutError extends (_b112 = GatewayError, _a112 = symbol112, _b112) {
      static {
        __name(this, "_GatewayTimeoutError");
      }
      constructor({
        message = "Request timed out",
        statusCode = 408,
        cause,
        generationId
      } = {}) {
        super({ message, statusCode, cause, generationId });
        this[_a112] = true;
        this.name = name102;
        this.type = "timeout_error";
      }
      static isInstance(error2) {
        return GatewayError.hasMarker(error2) && symbol112 in error2;
      }
      /**
       * Creates a helpful timeout error message with troubleshooting guidance
       */
      static createTimeoutError({
        originalMessage,
        statusCode = 408,
        cause,
        generationId
      }) {
        const message = `Gateway request timed out: ${originalMessage}

    This is a client-side timeout. To resolve this, increase your timeout configuration: https://vercel.com/docs/ai-gateway/capabilities/video-generation#extending-timeouts-for-node.js`;
        return new _GatewayTimeoutError({
          message,
          statusCode,
          cause,
          generationId
        });
      }
    };
    __name(isTimeoutError, "isTimeoutError");
    __name(asGatewayError, "asGatewayError");
    GATEWAY_AUTH_METHOD_HEADER = "ai-gateway-auth-method";
    VERCEL_AI_GATEWAY_TEAM_HEADER = "x-vercel-ai-gateway-team";
    __name(parseAuthMethod, "parseAuthMethod");
    gatewayAuthMethodSchema = lazySchema(
      () => zodSchema(z.union([z.literal("api-key"), z.literal("oidc")]))
    );
    KNOWN_MODEL_TYPES = [
      "embedding",
      "image",
      "language",
      "realtime",
      "reranking",
      "speech",
      "transcription",
      "video"
    ];
    GatewayFetchMetadata = class {
      static {
        __name(this, "GatewayFetchMetadata");
      }
      constructor(config2) {
        this.config = config2;
      }
      async getAvailableModels() {
        try {
          const { value } = await getFromApi({
            url: `${this.config.baseURL}/config`,
            validateUrl: false,
            headers: this.config.headers ? await resolve(this.config.headers) : void 0,
            successfulResponseHandler: createJsonResponseHandler(
              gatewayAvailableModelsResponseSchema
            ),
            failedResponseHandler: createJsonErrorResponseHandler({
              errorSchema: z.any(),
              errorToMessage: /* @__PURE__ */ __name((data) => {
                var _a123;
                return (_a123 = getErrorMessage(data)) != null ? _a123 : "unknown error";
              }, "errorToMessage")
            }),
            fetch: this.config.fetch
          });
          return value;
        } catch (error2) {
          throw await asGatewayError(error2);
        }
      }
      async getCredits() {
        try {
          const baseUrl = new URL(this.config.baseURL);
          const { value } = await getFromApi({
            url: `${baseUrl.origin}/v1/credits`,
            validateUrl: false,
            headers: this.config.headers ? await resolve(this.config.headers) : void 0,
            successfulResponseHandler: createJsonResponseHandler(
              gatewayCreditsResponseSchema
            ),
            failedResponseHandler: createJsonErrorResponseHandler({
              errorSchema: z.any(),
              errorToMessage: /* @__PURE__ */ __name((data) => {
                var _a123;
                return (_a123 = getErrorMessage(data)) != null ? _a123 : "unknown error";
              }, "errorToMessage")
            }),
            fetch: this.config.fetch
          });
          return value;
        } catch (error2) {
          throw await asGatewayError(error2);
        }
      }
    };
    gatewayAvailableModelsResponseSchema = lazySchema(
      () => zodSchema(
        z.object({
          models: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              description: z.string().nullish(),
              pricing: z.object({
                input: z.string(),
                output: z.string(),
                input_cache_read: z.string().nullish(),
                input_cache_write: z.string().nullish()
              }).transform(
                ({ input, output, input_cache_read, input_cache_write }) => ({
                  input,
                  output,
                  ...input_cache_read ? { cachedInputTokens: input_cache_read } : {},
                  ...input_cache_write ? { cacheCreationInputTokens: input_cache_write } : {}
                })
              ).nullish(),
              specification: z.object({
                specificationVersion: z.literal("v4"),
                provider: z.string(),
                modelId: z.string()
              }),
              modelType: z.string().nullish()
            })
          ).transform(
            (models) => models.filter(
              (m) => m.modelType == null || KNOWN_MODEL_TYPES.includes(m.modelType)
            )
          )
        })
      )
    );
    gatewayCreditsResponseSchema = lazySchema(
      () => zodSchema(
        z.object({
          balance: z.string(),
          total_used: z.string()
        }).transform(({ balance, total_used }) => ({
          balance,
          totalUsed: total_used
        }))
      )
    );
    GatewaySpendReport = class {
      static {
        __name(this, "GatewaySpendReport");
      }
      constructor(config2) {
        this.config = config2;
      }
      async getSpendReport(params) {
        try {
          const baseUrl = new URL(this.config.baseURL);
          const searchParams = new URLSearchParams();
          searchParams.set("start_date", params.startDate);
          searchParams.set("end_date", params.endDate);
          if (params.groupBy) {
            searchParams.set("group_by", params.groupBy);
          }
          if (params.datePart) {
            searchParams.set("date_part", params.datePart);
          }
          if (params.userId) {
            searchParams.set("user_id", params.userId);
          }
          if (params.model) {
            searchParams.set("model", params.model);
          }
          if (params.provider) {
            searchParams.set("provider", params.provider);
          }
          if (params.credentialType) {
            searchParams.set("credential_type", params.credentialType);
          }
          if (params.tags && params.tags.length > 0) {
            searchParams.set("tags", params.tags.join(","));
          }
          const { value } = await getFromApi({
            url: `${baseUrl.origin}/v1/report?${searchParams.toString()}`,
            validateUrl: false,
            headers: this.config.headers ? await resolve(this.config.headers) : void 0,
            successfulResponseHandler: createJsonResponseHandler(
              gatewaySpendReportResponseSchema
            ),
            failedResponseHandler: createJsonErrorResponseHandler({
              errorSchema: z.any(),
              errorToMessage: /* @__PURE__ */ __name((data) => {
                var _a123;
                return (_a123 = getErrorMessage(data)) != null ? _a123 : "unknown error";
              }, "errorToMessage")
            }),
            fetch: this.config.fetch
          });
          return value;
        } catch (error2) {
          throw await asGatewayError(error2);
        }
      }
    };
    gatewaySpendReportResponseSchema = lazySchema(
      () => zodSchema(
        z.object({
          results: z.array(
            z.object({
              day: z.string().optional(),
              hour: z.string().optional(),
              user: z.string().optional(),
              model: z.string().optional(),
              tag: z.string().optional(),
              provider: z.string().optional(),
              credential_type: z.enum(["byok", "system"]).optional(),
              total_cost: z.number(),
              market_cost: z.number().optional(),
              input_tokens: z.number().optional(),
              output_tokens: z.number().optional(),
              cached_input_tokens: z.number().optional(),
              cache_creation_input_tokens: z.number().optional(),
              reasoning_tokens: z.number().optional(),
              request_count: z.number().optional()
            }).transform(
              ({
                credential_type,
                total_cost,
                market_cost,
                input_tokens,
                output_tokens,
                cached_input_tokens,
                cache_creation_input_tokens,
                reasoning_tokens,
                request_count,
                ...rest
              }) => ({
                ...rest,
                ...credential_type !== void 0 ? { credentialType: credential_type } : {},
                totalCost: total_cost,
                ...market_cost !== void 0 ? { marketCost: market_cost } : {},
                ...input_tokens !== void 0 ? { inputTokens: input_tokens } : {},
                ...output_tokens !== void 0 ? { outputTokens: output_tokens } : {},
                ...cached_input_tokens !== void 0 ? { cachedInputTokens: cached_input_tokens } : {},
                ...cache_creation_input_tokens !== void 0 ? { cacheCreationInputTokens: cache_creation_input_tokens } : {},
                ...reasoning_tokens !== void 0 ? { reasoningTokens: reasoning_tokens } : {},
                ...request_count !== void 0 ? { requestCount: request_count } : {}
              })
            )
          )
        })
      )
    );
    GatewayGenerationInfoFetcher = class {
      static {
        __name(this, "GatewayGenerationInfoFetcher");
      }
      constructor(config2) {
        this.config = config2;
      }
      async getGenerationInfo(params) {
        try {
          const baseUrl = new URL(this.config.baseURL);
          const { value } = await getFromApi({
            url: `${baseUrl.origin}/v1/generation?id=${encodeURIComponent(params.id)}`,
            validateUrl: false,
            headers: this.config.headers ? await resolve(this.config.headers) : void 0,
            successfulResponseHandler: createJsonResponseHandler(
              gatewayGenerationInfoResponseSchema
            ),
            failedResponseHandler: createJsonErrorResponseHandler({
              errorSchema: z.any(),
              errorToMessage: /* @__PURE__ */ __name((data) => {
                var _a123;
                return (_a123 = getErrorMessage(data)) != null ? _a123 : "unknown error";
              }, "errorToMessage")
            }),
            fetch: this.config.fetch
          });
          return value;
        } catch (error2) {
          throw await asGatewayError(error2);
        }
      }
    };
    gatewayGenerationInfoResponseSchema = lazySchema(
      () => zodSchema(
        z.object({
          data: z.object({
            id: z.string(),
            total_cost: z.number(),
            upstream_inference_cost: z.number(),
            usage: z.number(),
            created_at: z.string(),
            model: z.string(),
            is_byok: z.boolean(),
            provider_name: z.string(),
            streamed: z.boolean(),
            finish_reason: z.string(),
            latency: z.number(),
            generation_time: z.number(),
            native_tokens_prompt: z.number(),
            native_tokens_completion: z.number(),
            native_tokens_reasoning: z.number(),
            native_tokens_cached: z.number(),
            native_tokens_cache_creation: z.number(),
            billable_web_search_calls: z.number()
          }).transform(
            ({
              total_cost,
              upstream_inference_cost,
              created_at,
              is_byok,
              provider_name,
              finish_reason,
              generation_time,
              native_tokens_prompt,
              native_tokens_completion,
              native_tokens_reasoning,
              native_tokens_cached,
              native_tokens_cache_creation,
              billable_web_search_calls,
              ...rest
            }) => ({
              ...rest,
              totalCost: total_cost,
              upstreamInferenceCost: upstream_inference_cost,
              createdAt: created_at,
              isByok: is_byok,
              providerName: provider_name,
              finishReason: finish_reason,
              generationTime: generation_time,
              promptTokens: native_tokens_prompt,
              completionTokens: native_tokens_completion,
              reasoningTokens: native_tokens_reasoning,
              cachedTokens: native_tokens_cached,
              cacheCreationTokens: native_tokens_cache_creation,
              billableWebSearchCalls: billable_web_search_calls
            })
          )
        }).transform(({ data }) => data)
      )
    );
    GatewayBatch = class {
      static {
        __name(this, "GatewayBatch");
      }
      constructor(config2) {
        this.config = config2;
        this.specificationVersion = "v4";
        this.supportedUrls = { "*/*": [/.*/] };
        this.provider = `${config2.provider}.batch`;
      }
      /**
       * Starts a durable batch of text-generation requests through the Gateway's
       * async batch surface (`POST {baseURL}/batch/start`). The returned
       * `batchId` is the Gateway job id — provider-native batch ids stay
       * server-side, so status and results always route back through the
       * Gateway job.
       */
      async doStartBatch({
        requests,
        providerOptions,
        headers,
        abortSignal,
        webhookUrl
      }) {
        var _a123;
        assertTextBatchRequests(requests);
        const modelId = validateSingleModel(requests);
        const resolvedHeaders = this.config.headers ? await resolve(this.config.headers) : void 0;
        const idempotencyKey = getGatewayBatchIdempotencyKey(providerOptions);
        const forwardedProviderOptions = omitGatewayIdempotencyKey(providerOptions);
        try {
          const { value: responseBody } = await postJsonToApi({
            url: this.getBatchUrl("start"),
            headers: combineHeaders(
              resolvedHeaders,
              headers,
              { "ai-model-id": modelId },
              await resolve(this.config.o11yHeaders),
              idempotencyKey != null ? { "idempotency-key": idempotencyKey } : void 0
            ),
            body: {
              ...webhookUrl != null && { callbackUrl: webhookUrl },
              requests: requests.map((request) => ({
                id: request.id,
                type: request.type,
                modelId: request.modelId,
                options: maybeEncodeBatchFileParts(request.options)
              })),
              ...forwardedProviderOptions != null && {
                providerOptions: forwardedProviderOptions
              }
            },
            successfulResponseHandler: createJsonResponseHandler(
              gatewayBatchStartResponseSchema
            ),
            failedResponseHandler: createJsonErrorResponseHandler({
              errorSchema: z.any(),
              errorToMessage: /* @__PURE__ */ __name((data) => {
                var _a133;
                return (_a133 = getErrorMessage(data)) != null ? _a133 : "unknown error";
              }, "errorToMessage")
            }),
            ...abortSignal && { abortSignal },
            fetch: this.config.fetch
          });
          return {
            batchId: responseBody.batchId,
            ...convertGatewayBatchStatus(responseBody),
            warnings: (_a123 = responseBody.warnings) != null ? _a123 : []
          };
        } catch (error2) {
          if (isAbortOrTimeoutError(error2)) {
            throw error2;
          }
          throw await asGatewayError(
            error2,
            await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {})
          );
        }
      }
      /**
       * Retrieves the lifecycle status of a Gateway batch job
       * (`POST {baseURL}/batch/status`).
       */
      async doGetBatchStatus({
        batchId,
        headers,
        abortSignal
      }) {
        const resolvedHeaders = this.config.headers ? await resolve(this.config.headers) : void 0;
        try {
          const { value: responseBody } = await postJsonToApi({
            url: this.getBatchUrl("status"),
            headers: combineHeaders(
              resolvedHeaders,
              headers,
              await resolve(this.config.o11yHeaders)
            ),
            body: { batchId },
            successfulResponseHandler: createJsonResponseHandler(
              gatewayBatchStatusResponseSchema
            ),
            failedResponseHandler: createJsonErrorResponseHandler({
              errorSchema: z.any(),
              errorToMessage: /* @__PURE__ */ __name((data) => {
                var _a123;
                return (_a123 = getErrorMessage(data)) != null ? _a123 : "unknown error";
              }, "errorToMessage")
            }),
            ...abortSignal && { abortSignal },
            fetch: this.config.fetch
          });
          return convertGatewayBatchStatus(responseBody);
        } catch (error2) {
          if (isAbortOrTimeoutError(error2)) {
            throw error2;
          }
          throw await asGatewayError(
            error2,
            await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {})
          );
        }
      }
      /**
       * Streams the per-request results of a terminal Gateway batch job
       * (`POST {baseURL}/batch/results`, `application/x-ndjson`: one
       * `BatchV4ItemResult` JSON object per line). Items are validated minimally
       * (id + status) and passed through — the Gateway sanitizes them
       * server-side. The route responds 400 while the batch is non-terminal.
       */
      async doGetBatchResults({
        batchId,
        headers,
        abortSignal
      }) {
        const resolvedHeaders = this.config.headers ? await resolve(this.config.headers) : void 0;
        try {
          const { value: lines } = await postJsonToApi({
            url: this.getBatchUrl("results"),
            headers: combineHeaders(
              resolvedHeaders,
              headers,
              await resolve(this.config.o11yHeaders)
            ),
            body: { batchId },
            successfulResponseHandler: createJsonLinesResponseHandler(
              gatewayBatchItemResultLineSchema
            ),
            failedResponseHandler: createJsonErrorResponseHandler({
              errorSchema: z.any(),
              errorToMessage: /* @__PURE__ */ __name((data) => {
                var _a123;
                return (_a123 = getErrorMessage(data)) != null ? _a123 : "unknown error";
              }, "errorToMessage")
            }),
            ...abortSignal && { abortSignal },
            fetch: this.config.fetch
          });
          return convertAsyncIteratorToReadableStream(
            convertGatewayBatchResultLines(lines)
          );
        } catch (error2) {
          if (isAbortOrTimeoutError(error2)) {
            throw error2;
          }
          throw await asGatewayError(
            error2,
            await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {})
          );
        }
      }
      getBatchUrl(path) {
        return `${this.config.baseURL}/batch/${path}`;
      }
    };
    __name(maybeEncodeBatchFileParts, "maybeEncodeBatchFileParts");
    __name(maybeBase64EncodeFileData, "maybeBase64EncodeFileData");
    __name(validateSingleModel, "validateSingleModel");
    __name(assertTextBatchRequests, "assertTextBatchRequests");
    __name(getGatewayBatchIdempotencyKey, "getGatewayBatchIdempotencyKey");
    __name(omitGatewayIdempotencyKey, "omitGatewayIdempotencyKey");
    __name(isAbortOrTimeoutError, "isAbortOrTimeoutError");
    __name(convertGatewayBatchStatus, "convertGatewayBatchStatus");
    __name(convertGatewayBatchResultLines, "convertGatewayBatchResultLines");
    gatewayBatchItemResultLineSchema = z.object({
      type: z.literal("text"),
      id: z.string(),
      status: z.enum(["cancelled", "expired", "failed", "succeeded"])
    }).catchall(z.unknown());
    gatewayBatchErrorSchema = z.object({
      message: z.string(),
      type: z.string().nullish(),
      code: z.string().nullish(),
      statusCode: z.number().nullish()
    });
    gatewayBatchRequestCountsSchema = z.object({
      total: z.number().nullish(),
      pending: z.number().nullish(),
      completed: z.number().nullish(),
      failed: z.number().nullish()
    });
    gatewayBatchProviderMetadataSchema = z.record(
      z.string(),
      z.record(z.string(), z.unknown())
    );
    gatewayBatchStatusFieldsSchema = z.object({
      status: z.enum(["completed", "failed", "pending"]),
      rawStatus: z.string().nullish(),
      requestCounts: gatewayBatchRequestCountsSchema.nullish(),
      error: gatewayBatchErrorSchema.nullish(),
      createdAt: z.string().nullish(),
      expiresAt: z.string().nullish(),
      providerMetadata: gatewayBatchProviderMetadataSchema.nullish()
    });
    gatewayBatchStartResponseSchema = gatewayBatchStatusFieldsSchema.extend({
      batchId: z.string(),
      warnings: z.array(
        z.object({
          requestId: z.string().nullish(),
          warning: z.unknown()
        }).catchall(z.unknown())
      ).nullish()
    });
    gatewayBatchStatusResponseSchema = gatewayBatchStatusFieldsSchema;
    GatewayLanguageModel = class _GatewayLanguageModel {
      static {
        __name(this, "_GatewayLanguageModel");
      }
      constructor(modelId, config2) {
        this.modelId = modelId;
        this.config = config2;
        this.specificationVersion = "v4";
        this.supportedUrls = { "*/*": [/.*/] };
      }
      static [WORKFLOW_SERIALIZE](model) {
        return serializeModelOptions({
          modelId: model.modelId,
          config: model.config
        });
      }
      static [WORKFLOW_DESERIALIZE](options) {
        return new _GatewayLanguageModel(options.modelId, options.config);
      }
      get provider() {
        return this.config.provider;
      }
      async getArgs(options) {
        const { abortSignal: _abortSignal, ...optionsWithoutSignal } = options;
        return {
          args: this.maybeEncodeFileParts(optionsWithoutSignal),
          warnings: []
        };
      }
      async doGenerate(options) {
        var _a123;
        const { args, warnings } = await this.getArgs(options);
        const { abortSignal } = options;
        const resolvedHeaders = this.config.headers ? await resolve(this.config.headers) : void 0;
        try {
          const {
            responseHeaders,
            value: responseBody,
            rawValue: rawResponse
          } = await postJsonToApi({
            url: this.getUrl(),
            headers: combineHeaders(
              resolvedHeaders,
              options.headers,
              this.getModelConfigHeaders(this.modelId, false),
              await resolve(this.config.o11yHeaders)
            ),
            body: args,
            successfulResponseHandler: createJsonResponseHandler(z.any()),
            failedResponseHandler: createJsonErrorResponseHandler({
              errorSchema: z.any(),
              errorToMessage: /* @__PURE__ */ __name((data) => {
                var _a133;
                return (_a133 = getErrorMessage(data)) != null ? _a133 : "unknown error";
              }, "errorToMessage")
            }),
            ...abortSignal && { abortSignal },
            fetch: this.config.fetch
          });
          return {
            ...responseBody,
            request: { body: args },
            response: { headers: responseHeaders, body: rawResponse },
            warnings: [...(_a123 = responseBody.warnings) != null ? _a123 : [], ...warnings]
          };
        } catch (error2) {
          throw await asGatewayError(
            error2,
            await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {})
          );
        }
      }
      async doStream(options) {
        const { args, warnings } = await this.getArgs(options);
        const { abortSignal } = options;
        const resolvedHeaders = this.config.headers ? await resolve(this.config.headers) : void 0;
        try {
          const { value: response, responseHeaders } = await postJsonToApi({
            url: this.getUrl(),
            headers: combineHeaders(
              resolvedHeaders,
              options.headers,
              this.getModelConfigHeaders(this.modelId, true),
              await resolve(this.config.o11yHeaders)
            ),
            body: args,
            successfulResponseHandler: createEventSourceResponseHandler(z.any()),
            failedResponseHandler: createJsonErrorResponseHandler({
              errorSchema: z.any(),
              errorToMessage: /* @__PURE__ */ __name((data) => {
                var _a123;
                return (_a123 = getErrorMessage(data)) != null ? _a123 : "unknown error";
              }, "errorToMessage")
            }),
            ...abortSignal && { abortSignal },
            fetch: this.config.fetch
          });
          return {
            stream: response.pipeThrough(
              new TransformStream({
                start(controller) {
                  if (warnings.length > 0) {
                    controller.enqueue({ type: "stream-start", warnings });
                  }
                },
                transform(chunk, controller) {
                  if (chunk.success) {
                    const streamPart = chunk.value;
                    if (streamPart.type === "raw" && !options.includeRawChunks) {
                      return;
                    }
                    if (streamPart.type === "response-metadata" && streamPart.timestamp && typeof streamPart.timestamp === "string") {
                      streamPart.timestamp = new Date(streamPart.timestamp);
                    }
                    controller.enqueue(streamPart);
                  } else {
                    controller.error(
                      chunk.error
                    );
                  }
                }
              })
            ),
            request: { body: args },
            response: { headers: responseHeaders }
          };
        } catch (error2) {
          throw await asGatewayError(
            error2,
            await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {})
          );
        }
      }
      /**
       * Encodes inline `Uint8Array` file data to a base64 string in place.
       * @param options - The options to encode.
       * @returns The options with the file data encoded.
       */
      maybeEncodeFileParts(options) {
        for (const message of options.prompt) {
          if (!Array.isArray(message.content)) {
            continue;
          }
          for (const part of message.content) {
            if (part.type === "file" || part.type === "reasoning-file") {
              part.data = maybeBase64EncodeFileData2(part.data);
            } else if (part.type === "tool-result" && part.output.type === "content") {
              for (const contentPart of part.output.value) {
                if (contentPart.type === "file") {
                  contentPart.data = maybeBase64EncodeFileData2(contentPart.data);
                }
              }
            }
          }
        }
        return options;
      }
      getUrl() {
        return `${this.config.baseURL}/language-model`;
      }
      getModelConfigHeaders(modelId, streaming) {
        return {
          "ai-language-model-specification-version": "4",
          "ai-language-model-id": modelId,
          "ai-language-model-streaming": String(streaming)
        };
      }
    };
    __name(maybeBase64EncodeFileData2, "maybeBase64EncodeFileData2");
    GatewayEmbeddingModel = class _GatewayEmbeddingModel {
      static {
        __name(this, "_GatewayEmbeddingModel");
      }
      constructor(modelId, config2) {
        this.modelId = modelId;
        this.config = config2;
        this.specificationVersion = "v4";
        this.maxEmbeddingsPerCall = 2048;
        this.supportsParallelCalls = true;
      }
      static [WORKFLOW_SERIALIZE](model) {
        return serializeModelOptions({
          modelId: model.modelId,
          config: model.config
        });
      }
      static [WORKFLOW_DESERIALIZE](options) {
        return new _GatewayEmbeddingModel(options.modelId, options.config);
      }
      get provider() {
        return this.config.provider;
      }
      async doEmbed({
        values,
        headers,
        abortSignal,
        providerOptions
      }) {
        var _a123, _b123;
        const resolvedHeaders = this.config.headers ? await resolve(this.config.headers) : void 0;
        try {
          const {
            responseHeaders,
            value: responseBody,
            rawValue
          } = await postJsonToApi({
            url: this.getUrl(),
            headers: combineHeaders(
              resolvedHeaders,
              headers != null ? headers : {},
              this.getModelConfigHeaders(),
              await resolve(this.config.o11yHeaders)
            ),
            body: {
              values,
              ...providerOptions ? { providerOptions } : {}
            },
            successfulResponseHandler: createJsonResponseHandler(
              gatewayEmbeddingResponseSchema
            ),
            failedResponseHandler: createJsonErrorResponseHandler({
              errorSchema: z.any(),
              errorToMessage: /* @__PURE__ */ __name((data) => {
                var _a133;
                return (_a133 = getErrorMessage(data)) != null ? _a133 : "unknown error";
              }, "errorToMessage")
            }),
            ...abortSignal && { abortSignal },
            fetch: this.config.fetch
          });
          return {
            embeddings: responseBody.embeddings,
            usage: (_a123 = responseBody.usage) != null ? _a123 : void 0,
            providerMetadata: responseBody.providerMetadata,
            response: { headers: responseHeaders, body: rawValue },
            warnings: (_b123 = responseBody.warnings) != null ? _b123 : []
          };
        } catch (error2) {
          throw await asGatewayError(
            error2,
            await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {})
          );
        }
      }
      getUrl() {
        return `${this.config.baseURL}/embedding-model`;
      }
      getModelConfigHeaders() {
        return {
          "ai-embedding-model-specification-version": "4",
          "ai-model-id": this.modelId
        };
      }
    };
    gatewayEmbeddingWarningSchema = z.discriminatedUnion("type", [
      z.object({
        type: z.literal("unsupported"),
        feature: z.string(),
        details: z.string().optional()
      }),
      z.object({
        type: z.literal("compatibility"),
        feature: z.string(),
        details: z.string().optional()
      }),
      z.object({
        type: z.literal("deprecated"),
        setting: z.string(),
        message: z.string()
      }),
      z.object({
        type: z.literal("other"),
        message: z.string()
      })
    ]);
    gatewayEmbeddingResponseSchema = lazySchema(
      () => zodSchema(
        z.object({
          embeddings: z.array(z.array(z.number())),
          usage: z.object({ tokens: z.number() }).nullish(),
          warnings: z.array(gatewayEmbeddingWarningSchema).optional(),
          providerMetadata: z.record(z.string(), z.record(z.string(), z.unknown())).optional()
        })
      )
    );
    GatewayImageModel = class _GatewayImageModel {
      static {
        __name(this, "_GatewayImageModel");
      }
      constructor(modelId, config2) {
        this.modelId = modelId;
        this.config = config2;
        this.specificationVersion = "v4";
        this.maxImagesPerCall = Number.MAX_SAFE_INTEGER;
      }
      static [WORKFLOW_SERIALIZE](model) {
        return serializeModelOptions({
          modelId: model.modelId,
          config: model.config
        });
      }
      static [WORKFLOW_DESERIALIZE](options) {
        return new _GatewayImageModel(options.modelId, options.config);
      }
      get provider() {
        return this.config.provider;
      }
      async doGenerate({
        prompt,
        n,
        size,
        aspectRatio,
        seed,
        files,
        mask,
        providerOptions,
        headers,
        abortSignal
      }) {
        var _a123, _b123, _c, _d;
        const resolvedHeaders = this.config.headers ? await resolve(this.config.headers) : void 0;
        try {
          const { responseHeaders, value: responseBody } = await postJsonToApi({
            url: this.getUrl(),
            headers: combineHeaders(
              resolvedHeaders,
              headers != null ? headers : {},
              this.getModelConfigHeaders(),
              await resolve(this.config.o11yHeaders)
            ),
            body: {
              prompt,
              n,
              ...size && { size },
              ...aspectRatio && { aspectRatio },
              ...seed && { seed },
              ...providerOptions && { providerOptions },
              ...files && {
                files: files.map((file) => maybeEncodeImageFile(file))
              },
              ...mask && { mask: maybeEncodeImageFile(mask) }
            },
            successfulResponseHandler: createJsonResponseHandler(
              gatewayImageResponseSchema
            ),
            failedResponseHandler: createJsonErrorResponseHandler({
              errorSchema: z.any(),
              errorToMessage: /* @__PURE__ */ __name((data) => {
                var _a133;
                return (_a133 = getErrorMessage(data)) != null ? _a133 : "unknown error";
              }, "errorToMessage")
            }),
            ...abortSignal && { abortSignal },
            fetch: this.config.fetch
          });
          return {
            images: responseBody.images,
            // Always base64 strings from server
            ...responseBody.isRetryable != null && {
              isRetryable: responseBody.isRetryable
            },
            warnings: (_a123 = responseBody.warnings) != null ? _a123 : [],
            providerMetadata: responseBody.providerMetadata,
            response: {
              timestamp: /* @__PURE__ */ new Date(),
              modelId: this.modelId,
              headers: responseHeaders
            },
            ...responseBody.usage != null && {
              usage: {
                inputTokens: (_b123 = responseBody.usage.inputTokens) != null ? _b123 : void 0,
                outputTokens: (_c = responseBody.usage.outputTokens) != null ? _c : void 0,
                totalTokens: (_d = responseBody.usage.totalTokens) != null ? _d : void 0
              }
            }
          };
        } catch (error2) {
          throw await asGatewayError(
            error2,
            await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {})
          );
        }
      }
      getUrl() {
        return `${this.config.baseURL}/image-model`;
      }
      getModelConfigHeaders() {
        return {
          "ai-image-model-specification-version": "4",
          "ai-model-id": this.modelId
        };
      }
    };
    __name(maybeEncodeImageFile, "maybeEncodeImageFile");
    providerMetadataEntrySchema = z.object({
      images: z.array(z.unknown()).optional()
    }).catchall(z.unknown());
    gatewayImageWarningSchema = z.discriminatedUnion("type", [
      z.object({
        type: z.literal("unsupported"),
        feature: z.string(),
        details: z.string().optional()
      }),
      z.object({
        type: z.literal("compatibility"),
        feature: z.string(),
        details: z.string().optional()
      }),
      z.object({
        type: z.literal("deprecated"),
        setting: z.string(),
        message: z.string()
      }),
      z.object({
        type: z.literal("other"),
        message: z.string()
      })
    ]);
    gatewayImageUsageSchema = z.object({
      inputTokens: z.number().nullish(),
      outputTokens: z.number().nullish(),
      totalTokens: z.number().nullish()
    });
    gatewayImageResponseSchema = z.object({
      images: z.array(z.string()),
      // Always base64 strings over the wire
      isRetryable: z.boolean().optional(),
      warnings: z.array(gatewayImageWarningSchema).optional(),
      providerMetadata: z.record(z.string(), providerMetadataEntrySchema).optional(),
      usage: gatewayImageUsageSchema.optional()
    });
    GatewayVideoModel = class {
      static {
        __name(this, "GatewayVideoModel");
      }
      constructor(modelId, config2) {
        this.modelId = modelId;
        this.config = config2;
        this.specificationVersion = "v4";
        this.maxVideosPerCall = Number.MAX_SAFE_INTEGER;
      }
      get provider() {
        return this.config.provider;
      }
      async doGenerate(options) {
        var _a123, _b123;
        const { headers, abortSignal } = options;
        const resolvedHeaders = this.config.headers ? await resolve(this.config.headers) : void 0;
        try {
          const { responseHeaders, value: responseBody } = await postJsonToApi({
            url: this.getUrl(),
            headers: combineHeaders(
              resolvedHeaders,
              headers != null ? headers : {},
              this.getModelConfigHeaders(),
              await resolve(this.config.o11yHeaders),
              { accept: "text/event-stream" }
            ),
            body: this.buildRequestBody(options),
            successfulResponseHandler: /* @__PURE__ */ __name(async ({
              response,
              url,
              requestBodyValues
            }) => {
              if (response.body == null) {
                throw new APICallError({
                  message: "SSE response body is empty",
                  url,
                  requestBodyValues,
                  statusCode: response.status
                });
              }
              const eventStream = parseJsonEventStream({
                stream: response.body,
                schema: gatewayVideoEventSchema
              });
              const reader = eventStream.getReader();
              const { done, value: parseResult } = await reader.read();
              reader.releaseLock();
              if (done || !parseResult) {
                throw new APICallError({
                  message: "SSE stream ended without a data event",
                  url,
                  requestBodyValues,
                  statusCode: response.status
                });
              }
              if (!parseResult.success) {
                throw new APICallError({
                  message: "Failed to parse video SSE event",
                  cause: parseResult.error,
                  url,
                  requestBodyValues,
                  statusCode: response.status
                });
              }
              const event = parseResult.value;
              if (event.type === "error") {
                throw new APICallError({
                  message: event.message,
                  statusCode: event.statusCode,
                  url,
                  requestBodyValues,
                  responseHeaders: Object.fromEntries([...response.headers]),
                  responseBody: JSON.stringify(event),
                  data: {
                    error: {
                      message: event.message,
                      type: event.errorType,
                      param: event.param
                    }
                  }
                });
              }
              return {
                value: {
                  videos: event.videos,
                  warnings: event.warnings,
                  providerMetadata: event.providerMetadata
                },
                responseHeaders: Object.fromEntries([...response.headers])
              };
            }, "successfulResponseHandler"),
            failedResponseHandler: createJsonErrorResponseHandler({
              errorSchema: z.any(),
              errorToMessage: /* @__PURE__ */ __name((data) => {
                var _a133;
                return (_a133 = getErrorMessage(data)) != null ? _a133 : "unknown error";
              }, "errorToMessage")
            }),
            ...abortSignal && { abortSignal },
            fetch: this.config.fetch
          });
          return {
            videos: responseBody.videos,
            warnings: (_a123 = responseBody.warnings) != null ? _a123 : [],
            providerMetadata: (_b123 = responseBody.providerMetadata) != null ? _b123 : void 0,
            response: {
              timestamp: /* @__PURE__ */ new Date(),
              modelId: this.modelId,
              headers: responseHeaders
            }
          };
        } catch (error2) {
          throw await asGatewayError(
            error2,
            await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {})
          );
        }
      }
      // The Gateway notifies the caller's URL on completion (`doStart` maps it to
      // `callbackUrl`), so the factory's URL and `received` pass straight through.
      async handleWebhookOption({
        webhook
      }) {
        const { url, received } = await webhook();
        return { webhookUrl: url, received };
      }
      async doStart(options) {
        var _a123, _b123;
        const { headers, abortSignal, webhookUrl } = options;
        const resolvedHeaders = this.config.headers ? await resolve(this.config.headers) : void 0;
        try {
          const { responseHeaders, value: responseBody } = await postJsonToApi({
            url: this.getStartUrl(),
            headers: combineHeaders(
              resolvedHeaders,
              headers != null ? headers : {},
              this.getModelConfigHeaders(),
              await resolve(this.config.o11yHeaders)
            ),
            body: {
              ...this.buildRequestBody(options),
              // The spec option is `webhookUrl`; the Gateway's wire contract for a
              // completion webhook is `callbackUrl`.
              ...webhookUrl && { callbackUrl: webhookUrl }
            },
            successfulResponseHandler: createJsonResponseHandler(
              gatewayVideoStartResponseSchema
            ),
            failedResponseHandler: createJsonErrorResponseHandler({
              errorSchema: z.any(),
              errorToMessage: /* @__PURE__ */ __name((data) => {
                var _a133;
                return (_a133 = getErrorMessage(data)) != null ? _a133 : "unknown error";
              }, "errorToMessage")
            }),
            ...abortSignal && { abortSignal },
            fetch: this.config.fetch
          });
          return {
            operation: responseBody.operation,
            warnings: (_a123 = responseBody.warnings) != null ? _a123 : [],
            providerMetadata: (_b123 = responseBody.providerMetadata) != null ? _b123 : void 0,
            response: {
              timestamp: /* @__PURE__ */ new Date(),
              modelId: this.modelId,
              headers: responseHeaders
            }
          };
        } catch (error2) {
          throw await asGatewayError(
            error2,
            await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {})
          );
        }
      }
      async doStatus({
        operation,
        abortSignal,
        headers
      }) {
        var _a123, _b123, _c, _d, _e, _f;
        const resolvedHeaders = this.config.headers ? await resolve(this.config.headers) : void 0;
        try {
          const { responseHeaders, value: responseBody } = await postJsonToApi({
            url: this.getStatusUrl(),
            headers: combineHeaders(
              resolvedHeaders,
              headers != null ? headers : {},
              this.getModelConfigHeaders(),
              await resolve(this.config.o11yHeaders)
            ),
            body: { operation },
            successfulResponseHandler: createJsonResponseHandler(
              gatewayVideoStatusResponseSchema
            ),
            failedResponseHandler: createJsonErrorResponseHandler({
              errorSchema: z.any(),
              errorToMessage: /* @__PURE__ */ __name((data) => {
                var _a133;
                return (_a133 = getErrorMessage(data)) != null ? _a133 : "unknown error";
              }, "errorToMessage")
            }),
            ...abortSignal && { abortSignal },
            fetch: this.config.fetch
          });
          const response = {
            timestamp: /* @__PURE__ */ new Date(),
            modelId: this.modelId,
            headers: responseHeaders
          };
          if (responseBody.status === "completed") {
            return {
              status: "completed",
              videos: responseBody.videos,
              warnings: (_a123 = responseBody.warnings) != null ? _a123 : [],
              providerMetadata: (_b123 = responseBody.providerMetadata) != null ? _b123 : void 0,
              response
            };
          }
          if (responseBody.status === "error") {
            return {
              status: "error",
              error: responseBody.error,
              providerMetadata: (_c = responseBody.providerMetadata) != null ? _c : void 0,
              response
            };
          }
          if (responseBody.status === "cancelled") {
            return {
              status: "error",
              error: "Video generation was cancelled.",
              providerMetadata: (_d = responseBody.providerMetadata) != null ? _d : void 0,
              response
            };
          }
          return {
            status: "pending",
            warnings: (_e = responseBody.warnings) != null ? _e : [],
            providerMetadata: (_f = responseBody.providerMetadata) != null ? _f : void 0,
            response
          };
        } catch (error2) {
          throw await asGatewayError(
            error2,
            await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {})
          );
        }
      }
      buildRequestBody({
        prompt,
        n,
        aspectRatio,
        resolution,
        duration: duration2,
        fps,
        seed,
        generateAudio,
        image,
        frameImages,
        inputReferences,
        providerOptions
      }) {
        return {
          prompt,
          n,
          ...aspectRatio && { aspectRatio },
          ...resolution && { resolution },
          ...duration2 && { duration: duration2 },
          ...fps && { fps },
          ...seed && { seed },
          ...generateAudio !== void 0 && { generateAudio },
          ...providerOptions && { providerOptions },
          ...image && { image: maybeEncodeVideoFile(image) },
          ...frameImages && {
            frameImages: frameImages.map((frame) => ({
              ...frame,
              image: maybeEncodeVideoFile(frame.image)
            }))
          },
          ...inputReferences && {
            inputReferences: inputReferences.map(
              (reference) => maybeEncodeVideoFile(reference)
            )
          }
        };
      }
      getUrl() {
        return `${this.config.baseURL}/video-model`;
      }
      getStartUrl() {
        return `${this.config.baseURL}/video-model/start`;
      }
      getStatusUrl() {
        return `${this.config.baseURL}/video-model/status`;
      }
      getModelConfigHeaders() {
        return {
          "ai-video-model-specification-version": "4",
          "ai-model-id": this.modelId
        };
      }
    };
    __name(maybeEncodeVideoFile, "maybeEncodeVideoFile");
    providerMetadataEntrySchema2 = z.object({
      videos: z.array(z.unknown()).optional()
    }).catchall(z.unknown());
    gatewayVideoDataSchema = z.union([
      z.object({
        type: z.literal("url"),
        url: z.string(),
        mediaType: z.string()
      }),
      z.object({
        type: z.literal("base64"),
        data: z.string(),
        mediaType: z.string()
      })
    ]);
    gatewayVideoWarningSchema = z.discriminatedUnion("type", [
      z.object({
        type: z.literal("unsupported"),
        feature: z.string(),
        details: z.string().optional()
      }),
      z.object({
        type: z.literal("compatibility"),
        feature: z.string(),
        details: z.string().optional()
      }),
      z.object({
        type: z.literal("deprecated"),
        setting: z.string(),
        message: z.string()
      }),
      z.object({
        type: z.literal("other"),
        message: z.string()
      })
    ]);
    gatewayVideoEventSchema = z.discriminatedUnion("type", [
      z.object({
        type: z.literal("result"),
        videos: z.array(gatewayVideoDataSchema),
        warnings: z.array(gatewayVideoWarningSchema).optional(),
        providerMetadata: z.record(z.string(), providerMetadataEntrySchema2).optional()
      }),
      z.object({
        type: z.literal("error"),
        message: z.string(),
        errorType: z.string(),
        statusCode: z.number(),
        param: z.unknown().nullable()
      })
    ]);
    gatewayVideoStartResponseSchema = z.object({
      operation: z.unknown(),
      warnings: z.array(gatewayVideoWarningSchema).nullish(),
      providerMetadata: z.record(z.string(), providerMetadataEntrySchema2).nullish()
    });
    gatewayVideoStatusResponseSchema = z.discriminatedUnion("status", [
      z.object({
        status: z.literal("pending"),
        warnings: z.array(gatewayVideoWarningSchema).nullish(),
        providerMetadata: z.record(z.string(), providerMetadataEntrySchema2).nullish()
      }),
      z.object({
        status: z.literal("completed"),
        videos: z.array(gatewayVideoDataSchema),
        warnings: z.array(gatewayVideoWarningSchema).nullish(),
        providerMetadata: z.record(z.string(), providerMetadataEntrySchema2).nullish()
      }),
      z.object({
        status: z.literal("error"),
        error: z.string(),
        providerMetadata: z.record(z.string(), providerMetadataEntrySchema2).nullish()
      }),
      z.object({
        status: z.literal("cancelled"),
        providerMetadata: z.record(z.string(), providerMetadataEntrySchema2).nullish()
      })
    ]);
    GatewayRerankingModel = class {
      static {
        __name(this, "GatewayRerankingModel");
      }
      constructor(modelId, config2) {
        this.modelId = modelId;
        this.config = config2;
        this.specificationVersion = "v4";
      }
      get provider() {
        return this.config.provider;
      }
      async doRerank({
        documents,
        query,
        topN,
        headers,
        abortSignal,
        providerOptions
      }) {
        var _a123;
        const resolvedHeaders = this.config.headers ? await resolve(this.config.headers) : void 0;
        try {
          const {
            responseHeaders,
            value: responseBody,
            rawValue
          } = await postJsonToApi({
            url: this.getUrl(),
            headers: combineHeaders(
              resolvedHeaders,
              headers != null ? headers : {},
              this.getModelConfigHeaders(),
              await resolve(this.config.o11yHeaders)
            ),
            body: {
              documents,
              query,
              ...topN != null ? { topN } : {},
              ...providerOptions ? { providerOptions } : {}
            },
            successfulResponseHandler: createJsonResponseHandler(
              gatewayRerankingResponseSchema
            ),
            failedResponseHandler: createJsonErrorResponseHandler({
              errorSchema: z.any(),
              errorToMessage: /* @__PURE__ */ __name((data) => {
                var _a133;
                return (_a133 = getErrorMessage(data)) != null ? _a133 : "unknown error";
              }, "errorToMessage")
            }),
            ...abortSignal && { abortSignal },
            fetch: this.config.fetch
          });
          return {
            ranking: responseBody.ranking,
            providerMetadata: responseBody.providerMetadata,
            response: { headers: responseHeaders, body: rawValue },
            warnings: (_a123 = responseBody.warnings) != null ? _a123 : []
          };
        } catch (error2) {
          throw await asGatewayError(
            error2,
            await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {})
          );
        }
      }
      getUrl() {
        return `${this.config.baseURL}/reranking-model`;
      }
      getModelConfigHeaders() {
        return {
          "ai-reranking-model-specification-version": "4",
          "ai-model-id": this.modelId
        };
      }
    };
    gatewayRerankingWarningSchema = z.discriminatedUnion("type", [
      z.object({
        type: z.literal("unsupported"),
        feature: z.string(),
        details: z.string().optional()
      }),
      z.object({
        type: z.literal("compatibility"),
        feature: z.string(),
        details: z.string().optional()
      }),
      z.object({
        type: z.literal("deprecated"),
        setting: z.string(),
        message: z.string()
      }),
      z.object({
        type: z.literal("other"),
        message: z.string()
      })
    ]);
    gatewayRerankingResponseSchema = lazySchema(
      () => zodSchema(
        z.object({
          ranking: z.array(
            z.object({
              index: z.number(),
              relevanceScore: z.number()
            })
          ),
          warnings: z.array(gatewayRerankingWarningSchema).optional(),
          providerMetadata: z.record(z.string(), z.record(z.string(), z.unknown())).optional()
        })
      )
    );
    GatewaySpeechModel = class {
      static {
        __name(this, "GatewaySpeechModel");
      }
      constructor(modelId, config2) {
        this.modelId = modelId;
        this.config = config2;
        this.specificationVersion = "v4";
      }
      get provider() {
        return this.config.provider;
      }
      async doGenerate({
        text: text2,
        voice,
        outputFormat,
        instructions,
        speed,
        language,
        providerOptions,
        headers,
        abortSignal
      }) {
        var _a123;
        const resolvedHeaders = this.config.headers ? await resolve(this.config.headers) : void 0;
        try {
          const {
            responseHeaders,
            value: responseBody,
            rawValue
          } = await postJsonToApi({
            url: this.getUrl(),
            headers: combineHeaders(
              resolvedHeaders,
              headers != null ? headers : {},
              this.getModelConfigHeaders(),
              await resolve(this.config.o11yHeaders)
            ),
            body: {
              text: text2,
              ...voice && { voice },
              ...outputFormat && { outputFormat },
              ...instructions && { instructions },
              ...speed != null && { speed },
              ...language && { language },
              ...providerOptions && { providerOptions }
            },
            successfulResponseHandler: createJsonResponseHandler(
              gatewaySpeechResponseSchema
            ),
            failedResponseHandler: createJsonErrorResponseHandler({
              errorSchema: z.any(),
              errorToMessage: /* @__PURE__ */ __name((data) => {
                var _a133;
                return (_a133 = getErrorMessage(data)) != null ? _a133 : "unknown error";
              }, "errorToMessage")
            }),
            ...abortSignal && { abortSignal },
            fetch: this.config.fetch
          });
          return {
            audio: responseBody.audio,
            warnings: (_a123 = responseBody.warnings) != null ? _a123 : [],
            providerMetadata: responseBody.providerMetadata,
            response: {
              timestamp: /* @__PURE__ */ new Date(),
              modelId: this.modelId,
              headers: responseHeaders,
              body: rawValue
            }
          };
        } catch (error2) {
          throw await asGatewayError(
            error2,
            await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {})
          );
        }
      }
      getUrl() {
        return `${this.config.baseURL}/speech-model`;
      }
      getModelConfigHeaders() {
        return {
          "ai-speech-model-specification-version": "4",
          "ai-model-id": this.modelId
        };
      }
    };
    providerMetadataEntrySchema3 = z.object({}).catchall(z.unknown());
    gatewaySpeechWarningSchema = z.discriminatedUnion("type", [
      z.object({
        type: z.literal("unsupported"),
        feature: z.string(),
        details: z.string().optional()
      }),
      z.object({
        type: z.literal("compatibility"),
        feature: z.string(),
        details: z.string().optional()
      }),
      z.object({
        type: z.literal("deprecated"),
        setting: z.string(),
        message: z.string()
      }),
      z.object({
        type: z.literal("other"),
        message: z.string()
      })
    ]);
    gatewaySpeechResponseSchema = z.object({
      audio: z.string(),
      warnings: z.array(gatewaySpeechWarningSchema).optional(),
      providerMetadata: z.record(z.string(), providerMetadataEntrySchema3).optional()
    });
    GatewayTranscriptionModel = class {
      static {
        __name(this, "GatewayTranscriptionModel");
      }
      constructor(modelId, config2) {
        this.modelId = modelId;
        this.config = config2;
        this.specificationVersion = "v4";
      }
      get provider() {
        return this.config.provider;
      }
      async doGenerate({
        audio,
        mediaType,
        providerOptions,
        headers,
        abortSignal
      }) {
        var _a123, _b123, _c, _d;
        const resolvedHeaders = this.config.headers ? await resolve(this.config.headers) : void 0;
        try {
          const {
            responseHeaders,
            value: responseBody,
            rawValue
          } = await postJsonToApi({
            url: this.getUrl(),
            headers: combineHeaders(
              resolvedHeaders,
              headers != null ? headers : {},
              this.getModelConfigHeaders(),
              await resolve(this.config.o11yHeaders)
            ),
            body: {
              audio: audio instanceof Uint8Array ? convertUint8ArrayToBase64(audio) : audio,
              mediaType,
              ...providerOptions && { providerOptions }
            },
            successfulResponseHandler: createJsonResponseHandler(
              gatewayTranscriptionResponseSchema
            ),
            failedResponseHandler: createJsonErrorResponseHandler({
              errorSchema: z.any(),
              errorToMessage: /* @__PURE__ */ __name((data) => {
                var _a133;
                return (_a133 = getErrorMessage(data)) != null ? _a133 : "unknown error";
              }, "errorToMessage")
            }),
            ...abortSignal && { abortSignal },
            fetch: this.config.fetch
          });
          return {
            text: responseBody.text,
            segments: (_a123 = responseBody.segments) != null ? _a123 : [],
            language: (_b123 = responseBody.language) != null ? _b123 : void 0,
            durationInSeconds: (_c = responseBody.durationInSeconds) != null ? _c : void 0,
            warnings: (_d = responseBody.warnings) != null ? _d : [],
            providerMetadata: responseBody.providerMetadata,
            response: {
              timestamp: /* @__PURE__ */ new Date(),
              modelId: this.modelId,
              headers: responseHeaders,
              body: rawValue
            }
          };
        } catch (error2) {
          throw await asGatewayError(
            error2,
            await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {})
          );
        }
      }
      async doStream(options) {
        var _a123, _b123, _c, _d, _e;
        const currentDate = (_c = (_b123 = (_a123 = this.config._internal) == null ? void 0 : _a123.currentDate) == null ? void 0 : _b123.call(_a123)) != null ? _c : /* @__PURE__ */ new Date();
        const headers = combineHeaders(
          await resolve((_d = this.config.headers) != null ? _d : {}),
          (_e = options.headers) != null ? _e : {},
          this.getModelConfigHeaders(),
          await resolve(this.config.o11yHeaders)
        );
        const authMethod = await parseAuthMethod(headers);
        const startFrame = {
          type: TRANSCRIPTION_STREAM_START_FRAME_TYPE,
          inputAudioFormat: options.inputAudioFormat,
          ...options.providerOptions != null && {
            providerOptions: options.providerOptions
          },
          ...options.includeRawChunks != null && {
            includeRawChunks: options.includeRawChunks
          }
        };
        return {
          stream: createGatewayTranscriptionStream({
            webSocket: this.config.webSocket,
            url: toGatewayTranscriptionUrl(this.config.baseURL, this.modelId),
            protocols: getProtocolsFromHeaders(headers),
            headers,
            startFrame,
            audio: options.audio,
            abortSignal: options.abortSignal,
            authMethod
          }),
          request: { body: startFrame },
          response: { timestamp: currentDate, modelId: this.modelId }
        };
      }
      getUrl() {
        return `${this.config.baseURL}/transcription-model`;
      }
      getModelConfigHeaders() {
        return {
          "ai-transcription-model-specification-version": "4",
          "ai-model-id": this.modelId
        };
      }
    };
    __name(toGatewayTranscriptionUrl, "toGatewayTranscriptionUrl");
    __name(getProtocolsFromHeaders, "getProtocolsFromHeaders");
    MAX_AUDIO_FRAME_BYTES = 64 * 1024;
    __name(createGatewayTranscriptionStream, "createGatewayTranscriptionStream");
    providerMetadataEntrySchema4 = z.object({}).catchall(z.unknown());
    gatewayTranscriptionWarningSchema = z.discriminatedUnion("type", [
      z.object({
        type: z.literal("unsupported"),
        feature: z.string(),
        details: z.string().optional()
      }),
      z.object({
        type: z.literal("compatibility"),
        feature: z.string(),
        details: z.string().optional()
      }),
      z.object({
        type: z.literal("deprecated"),
        setting: z.string(),
        message: z.string()
      }),
      z.object({
        type: z.literal("other"),
        message: z.string()
      })
    ]);
    gatewayTranscriptionResponseSchema = z.object({
      text: z.string(),
      segments: z.array(
        z.object({
          text: z.string(),
          startSecond: z.number(),
          endSecond: z.number()
        })
      ).optional(),
      language: z.string().nullish(),
      durationInSeconds: z.number().nullish(),
      warnings: z.array(gatewayTranscriptionWarningSchema).optional(),
      providerMetadata: z.record(z.string(), providerMetadataEntrySchema4).optional()
    });
    __name(errorControllerWithGatewayError, "errorControllerWithGatewayError");
    __name(getServerErrorMessage, "getServerErrorMessage");
    SERVER_ERROR_STATUS_CODES = {
      authentication_error: 401,
      failed_dependency: 424,
      forbidden: 403,
      internal_server_error: 500,
      invalid_request_error: 400,
      model_not_found: 404,
      rate_limit_exceeded: 429
    };
    __name(createErrorFromServerErrorPart, "createErrorFromServerErrorPart");
    GatewayRealtimeModel = class {
      static {
        __name(this, "GatewayRealtimeModel");
      }
      constructor(modelId, config2) {
        this.specificationVersion = "v4";
        this.modelId = modelId;
        this.provider = config2.provider;
        this.config = config2;
      }
      /**
       * Mints a single-use, short-lived client secret (`vcst_`) the browser uses to
       * open the realtime WebSocket without ever holding the long-lived Gateway
       * credential. The customer's server calls this (via
       * `gateway.experimental_realtime.getToken`) and hands the returned token to
       * the browser, which connects with it through the `ai-gateway-auth.<token>`
       * subprotocol. `expiresAfterSeconds` is forwarded to the mint endpoint;
       * `sessionConfig` is intentionally unused here — it is applied later via the
       * normalized `session-update` event.
       */
      async doCreateClientSecret(options) {
        const secret = await this.config.createClientSecret({
          modelId: this.modelId,
          ...(options == null ? void 0 : options.expiresAfterSeconds) != null && {
            expiresAfterSeconds: options.expiresAfterSeconds
          }
        });
        return {
          token: secret.token,
          url: toGatewayRealtimeUrl(this.config.baseURL, this.modelId),
          ...secret.expiresAt != null && { expiresAt: secret.expiresAt }
        };
      }
      getWebSocketConfig(options) {
        return {
          url: options.url,
          protocols: getGatewayRealtimeProtocols(options.token, {
            teamIdOrSlug: this.config.teamIdOrSlug
          })
        };
      }
      parseServerEvent(raw) {
        return raw;
      }
      serializeClientEvent(event) {
        return event;
      }
      buildSessionConfig(config2) {
        return config2;
      }
    };
    __name(toGatewayRealtimeUrl, "toGatewayRealtimeUrl");
    exaSearchInputSchema = lazySchema(
      () => zodSchema(
        z.object({
          query: z.string().describe("Natural-language web search query. This is required."),
          type: z.enum(["auto", "fast", "instant"]).optional().describe(
            "Search method. Use auto for the default balance of speed and quality."
          ),
          num_results: z.number().optional().describe("Maximum number of results to return (1-100, default: 10)."),
          category: z.enum([
            "company",
            "people",
            "research paper",
            "news",
            "personal site",
            "financial report"
          ]).optional().describe("Optional content category to focus results."),
          user_location: z.string().optional().describe("Two-letter ISO country code such as 'US'."),
          include_domains: z.array(z.string()).optional().describe("Only return results from these domains."),
          exclude_domains: z.array(z.string()).optional().describe("Exclude results from these domains."),
          start_published_date: z.string().optional().describe("Only return links published after this ISO 8601 date."),
          end_published_date: z.string().optional().describe("Only return links published before this ISO 8601 date."),
          contents: z.object({
            text: z.union([
              z.boolean(),
              z.object({
                max_characters: z.number().optional(),
                include_html_tags: z.boolean().optional(),
                verbosity: z.enum(["compact", "standard", "full"]).optional(),
                include_sections: z.array(
                  z.enum([
                    "header",
                    "navigation",
                    "banner",
                    "body",
                    "sidebar",
                    "footer",
                    "metadata"
                  ])
                ).optional(),
                exclude_sections: z.array(
                  z.enum([
                    "header",
                    "navigation",
                    "banner",
                    "body",
                    "sidebar",
                    "footer",
                    "metadata"
                  ])
                ).optional()
              })
            ]).optional(),
            highlights: z.union([
              z.boolean(),
              z.object({
                query: z.string().optional(),
                max_characters: z.number().optional()
              })
            ]).optional(),
            max_age_hours: z.number().optional(),
            livecrawl_timeout: z.number().optional(),
            subpages: z.number().optional(),
            subpage_target: z.union([z.string(), z.array(z.string())]).optional(),
            extras: z.object({
              links: z.number().optional(),
              image_links: z.number().optional()
            }).optional()
          }).optional().describe("Controls extracted page content and freshness.")
        })
      )
    );
    exaSearchOutputSchema = lazySchema(
      () => zodSchema(
        z.union([
          z.object({
            requestId: z.string(),
            searchType: z.string().optional(),
            resolvedSearchType: z.string().optional(),
            results: z.array(
              z.object({
                title: z.string(),
                url: z.string(),
                id: z.string(),
                publishedDate: z.string().nullable().optional(),
                author: z.string().nullable().optional(),
                image: z.string().nullable().optional(),
                favicon: z.string().nullable().optional(),
                text: z.string().optional(),
                highlights: z.array(z.string()).optional(),
                highlightScores: z.array(z.number()).optional(),
                summary: z.string().optional(),
                subpages: z.array(z.any()).optional(),
                extras: z.object({
                  links: z.array(z.string()).optional(),
                  imageLinks: z.array(z.string()).optional()
                }).optional()
              })
            ),
            costDollars: z.object({
              total: z.number().optional(),
              search: z.record(z.string(), z.number()).optional()
            }).optional()
          }),
          z.object({
            error: z.enum([
              "api_error",
              "rate_limit",
              "timeout",
              "invalid_input",
              "configuration_error",
              "execution_error",
              "unknown"
            ]),
            statusCode: z.number().optional(),
            message: z.string()
          })
        ])
      )
    );
    exaSearchToolFactory = createProviderExecutedToolFactory({
      id: "gateway.exa_search",
      inputSchema: exaSearchInputSchema,
      outputSchema: exaSearchOutputSchema
    });
    exaSearch = /* @__PURE__ */ __name((config2 = {}) => exaSearchToolFactory(config2), "exaSearch");
    parallelSearchInputSchema = lazySchema(
      () => zodSchema(
        z.object({
          objective: z.string().describe(
            "Natural-language description of the web research goal, including source or freshness guidance and broader context from the task. Maximum 5000 characters."
          ),
          search_queries: z.array(z.string()).optional().describe(
            "Optional search queries to supplement the objective. Maximum 200 characters per query."
          ),
          mode: z.enum(["one-shot", "agentic"]).optional().describe(
            'Mode preset: "one-shot" for comprehensive results with longer excerpts (default), "agentic" for concise, token-efficient results for multi-step workflows.'
          ),
          max_results: z.number().optional().describe(
            "Maximum number of results to return (1-20). Defaults to 10 if not specified."
          ),
          source_policy: z.object({
            include_domains: z.array(z.string()).optional().describe(
              "Limit results to these domains. Use plain domain names only \u2014 e.g. example.com or sub.example.gov, or a bare extension like .edu. Do not include a scheme, path, or port (e.g. not https://example.com/page)."
            ),
            exclude_domains: z.array(z.string()).optional().describe(
              "Exclude results from these domains. Use plain domain names only \u2014 e.g. example.com or sub.example.gov, or a bare extension like .edu. Do not include a scheme, path, or port (e.g. not https://example.com/page)."
            ),
            after_date: z.string().optional().describe(
              "Only include results published after this date. Use an ISO 8601 calendar date formatted YYYY-MM-DD (e.g. 2025-01-01); do not include a time."
            )
          }).optional().describe(
            "Source policy for controlling which domains to include/exclude and freshness."
          ),
          excerpts: z.object({
            max_chars_per_result: z.number().optional().describe("Maximum characters per result."),
            max_chars_total: z.number().optional().describe("Maximum total characters across all results.")
          }).optional().describe("Excerpt configuration for controlling result length."),
          fetch_policy: z.object({
            max_age_seconds: z.number().optional().describe(
              "Maximum age in seconds for cached content. Set to 0 to always fetch fresh content."
            )
          }).optional().describe("Fetch policy for controlling content freshness.")
        })
      )
    );
    parallelSearchOutputSchema = lazySchema(
      () => zodSchema(
        z.union([
          // Success response
          z.object({
            searchId: z.string(),
            results: z.array(
              z.object({
                url: z.string(),
                title: z.string(),
                excerpt: z.string(),
                publishDate: z.string().nullable().optional(),
                relevanceScore: z.number().optional()
              })
            )
          }),
          // Error response
          z.object({
            error: z.enum([
              "api_error",
              "rate_limit",
              "timeout",
              "invalid_input",
              "configuration_error",
              "unknown"
            ]),
            statusCode: z.number().optional(),
            message: z.string()
          })
        ])
      )
    );
    parallelSearchToolFactory = createProviderExecutedToolFactory({
      id: "gateway.parallel_search",
      inputSchema: parallelSearchInputSchema,
      outputSchema: parallelSearchOutputSchema
    });
    parallelSearch = /* @__PURE__ */ __name((config2 = {}) => parallelSearchToolFactory(config2), "parallelSearch");
    perplexitySearchInputSchema = lazySchema(
      () => zodSchema(
        z.object({
          query: z.union([z.string(), z.array(z.string())]).describe(
            "Search query (string) or multiple queries (array of up to 5 strings). Multi-query searches return combined results from all queries."
          ),
          max_results: z.number().optional().describe(
            "Maximum number of search results to return (1-20, default: 10)"
          ),
          max_tokens_per_page: z.number().optional().describe(
            "Maximum number of tokens to extract per search result page (256-2048, default: 2048)"
          ),
          max_tokens: z.number().optional().describe(
            "Maximum total tokens across all search results (default: 25000, max: 1000000)"
          ),
          country: z.string().optional().describe(
            "Two-letter ISO 3166-1 alpha-2 country code for regional search results (e.g., 'US', 'GB', 'FR')"
          ),
          search_domain_filter: z.array(z.string()).optional().describe(
            "List of domains to include or exclude from search results (max 20). To include: ['nature.com', 'science.org']. To exclude: ['-example.com', '-spam.net']"
          ),
          search_language_filter: z.array(z.string()).optional().describe(
            "List of ISO 639-1 language codes to filter results (max 10, lowercase). Examples: ['en', 'fr', 'de']"
          ),
          search_after_date: z.string().optional().describe(
            "Include only results published after this date. Format: 'MM/DD/YYYY' (e.g., '3/1/2025'). Cannot be used with search_recency_filter."
          ),
          search_before_date: z.string().optional().describe(
            "Include only results published before this date. Format: 'MM/DD/YYYY' (e.g., '3/15/2025'). Cannot be used with search_recency_filter."
          ),
          last_updated_after_filter: z.string().optional().describe(
            "Include only results last updated after this date. Format: 'MM/DD/YYYY' (e.g., '3/1/2025'). Cannot be used with search_recency_filter."
          ),
          last_updated_before_filter: z.string().optional().describe(
            "Include only results last updated before this date. Format: 'MM/DD/YYYY' (e.g., '3/15/2025'). Cannot be used with search_recency_filter."
          ),
          search_recency_filter: z.enum(["day", "week", "month", "year"]).optional().describe(
            "Filter results by relative time period. Cannot be used with search_after_date or search_before_date."
          )
        })
      )
    );
    perplexitySearchOutputSchema = lazySchema(
      () => zodSchema(
        z.union([
          // Success response
          z.object({
            results: z.array(
              z.object({
                title: z.string(),
                url: z.string(),
                snippet: z.string(),
                date: z.string().optional(),
                lastUpdated: z.string().optional()
              })
            ),
            id: z.string()
          }),
          // Error response
          z.object({
            error: z.enum([
              "api_error",
              "rate_limit",
              "timeout",
              "invalid_input",
              "unknown"
            ]),
            statusCode: z.number().optional(),
            message: z.string()
          })
        ])
      )
    );
    perplexitySearchToolFactory = createProviderExecutedToolFactory({
      id: "gateway.perplexity_search",
      inputSchema: perplexitySearchInputSchema,
      outputSchema: perplexitySearchOutputSchema
    });
    perplexitySearch = /* @__PURE__ */ __name((config2 = {}) => perplexitySearchToolFactory(config2), "perplexitySearch");
    takoDataSourceInputSchema = z.object({
      count: z.number().optional().describe(
        "Maximum number of data results to return (1-20). When include_contents is true, each additional result adds its own data surcharge."
      ),
      include_contents: z.boolean().optional().describe(
        "Inline rows for each data result. This adds a data surcharge based on row count and dataset source. To estimate cost, search with include_contents disabled and inspect cards.content.export_pricing. This applies to every returned card; limit sources.data.count and sources.data.max_rows to control cost."
      ),
      mode: z.enum(["inline", "url"]).optional().describe(
        "Requested data delivery mode. Search card data is always inline."
      ),
      content_format: z.enum(["card_json", "csv", "json_compact", "json_records"]).optional().describe("Serialization for inlined card data."),
      max_rows: z.number().optional().describe(
        "Maximum rows to inline per result. Omit to use the allowance in cards.content.export_pricing. A data surcharge applies per 1,000 exported rows; lower values reduce cost."
      ),
      node_ids: z.array(z.string()).optional().describe("Data Graph node IDs to prioritize. Maximum 20."),
      strict: z.boolean().optional().describe(
        "Only return cards matching node_ids. Requires a non-empty node_ids."
      )
    });
    takoWebSourceInputSchema = z.object({
      count: z.number().optional().describe("Maximum number of web results to return (1-20)."),
      include_contents: z.boolean().optional().describe("Inline extracted web page text. This can add a data charge."),
      category: z.enum(["finance", "news", "sports"]).optional().describe("Optional web-result category filter."),
      include_domains: z.array(z.string()).optional().describe("Only return results from these bare domains."),
      exclude_domains: z.array(z.string()).optional().describe("Exclude results from these bare domains."),
      snippet_max_chars: z.number().optional().describe("Maximum characters in each web-result snippet."),
      highlights: z.boolean().optional().describe(
        "Include highlighted passages in web results. Defaults to true in AI Gateway."
      ),
      article_content_max_chars: z.number().optional().describe(
        "Maximum extracted characters per web page when including contents."
      ),
      published_after: z.string().optional().describe("Keep results published on or after this ISO date (YYYY-MM-DD)."),
      published_before: z.string().optional().describe(
        "Keep results published on or before this ISO date (YYYY-MM-DD)."
      )
    });
    takoSearchInputSchema = lazySchema(
      () => zodSchema(
        z.object({
          query: z.string().describe(
            'Natural-language search query. Include the entity, metric, and time period. Quote a phrase to force it to one entity, for example "Tesla":PRODUCT price.'
          ),
          effort: z.enum(["deep", "fast", "instant"]).optional().describe(
            "Search effort. fast is the balanced default, instant favors cached results and low latency, and deep broadens retrieval with reranking at higher cost and latency."
          ),
          sources: z.object({
            data: takoDataSourceInputSchema.optional(),
            web: takoWebSourceInputSchema.optional()
          }).optional().describe(
            "Sources to search. Omit to search both curated data and the web. When provided, only keys present are searched."
          ),
          location: z.object({
            latitude: z.number().describe("Latitude between -90 and 90."),
            longitude: z.number().describe("Longitude between -180 and 180.")
          }).optional().describe("End-user coordinates for localized results."),
          country_code: z.string().optional().describe("Two-letter ISO 3166-1 country code, such as 'US'."),
          locale: z.string().optional().describe("BCP-47 locale, such as 'en-US'."),
          timezone: z.string().optional().describe("IANA timezone, such as 'America/New_York'."),
          output_settings: z.object({
            image_dark_mode: z.boolean().optional().describe("Render card preview images in dark mode."),
            force_refresh: z.boolean().optional().describe(
              "Instant-effort only. Request a refreshed instant result."
            )
          }).optional().describe("Controls card rendering in the search response."),
          include_related: z.number().optional().describe("Maximum related search suggestions to include (1-20).")
        })
      )
    );
    takoDatasetCellSchema = z.union([z.boolean(), z.number(), z.string()]).nullable();
    takoResultContentSchema = z.object({
      content_format: z.enum(["card_json", "csv", "json_compact", "json_records"]).nullish(),
      cost: z.number().optional(),
      data: z.string().nullish(),
      records: z.array(z.record(z.string(), takoDatasetCellSchema)).nullish(),
      dataset: z.object({
        columns: z.array(
          z.object({
            name: z.string(),
            type: z.enum(["boolean", "date", "datetime", "number", "string"]),
            unit: z.string().nullish()
          })
        ),
        rows: z.array(z.array(takoDatasetCellSchema)),
        total_rows: z.number(),
        truncated: z.boolean(),
        ref: z.string(),
        sources: z.array(
          z.object({
            name: z.string(),
            index: z.enum(["data", "web"]).optional()
          })
        ),
        provenance: z.enum(["query", "web_extraction"]).optional()
      }).nullish(),
      card_data: z.object({}).passthrough().nullish(),
      card_data_schema: z.object({}).passthrough().nullish(),
      url: z.string().nullish(),
      expires_at: z.string().nullish(),
      total_rows: z.number().nullish(),
      truncated: z.boolean().optional(),
      export_pricing: z.object({
        baseline_usd: z.number(),
        free_rows: z.number(),
        max_rows_ceiling: z.number(),
        row_cpm_usd: z.number()
      }).nullish(),
      manifest: z.array(
        z.object({
          dtype: z.enum(["boolean", "date", "datetime", "number", "string"]).nullish(),
          entity: z.string().nullish(),
          metric: z.string().nullish(),
          name: z.string().nullish(),
          unit: z.string().nullish()
        })
      ).nullish()
    }).passthrough();
    takoCardSchema = z.object({
      card_id: z.string().nullish(),
      title: z.string().nullish(),
      description: z.string().nullish(),
      semantic_description: z.string().nullish(),
      webpage_url: z.string().nullish(),
      image_url: z.string().nullish(),
      embed_url: z.string().nullish(),
      sources: z.array(
        z.object({
          source_name: z.string().nullish(),
          source_description: z.string().nullish(),
          source_index: z.enum(["data", "web"]),
          source_text: z.string().nullish(),
          url: z.string().nullish()
        })
      ).nullish(),
      methodologies: z.array(
        z.object({
          methodology_name: z.string().nullable(),
          methodology_description: z.string().nullable()
        })
      ).nullish(),
      source_indexes: z.array(z.enum(["data", "web"])).nullish(),
      card_type: z.string().nullish(),
      relevance: z.enum(["High", "Low", "Medium"]).nullish(),
      content: takoResultContentSchema.nullish(),
      exportable: z.boolean().optional(),
      nodes: z.array(
        z.object({
          id: z.string(),
          type: z.enum(["entity", "metric"]),
          name: z.string(),
          description: z.string().nullish()
        })
      ).nullish(),
      metric_definitions: z.array(z.object({ name: z.string(), definition: z.string() })).nullish(),
      data_freshness: z.object({
        coverage_end: z.string().nullish(),
        data_as_of: z.string().nullish(),
        last_updated: z.string().nullish()
      }).nullish()
    }).passthrough();
    takoWebResultSchema = z.object({
      title: z.string(),
      url: z.string(),
      snippet: z.string().nullish(),
      source_name: z.string().nullish(),
      publish_date: z.string().nullish(),
      content: takoResultContentSchema.nullish()
    }).passthrough();
    takoSearchOutputSchema = lazySchema(
      () => zodSchema(
        z.union([
          z.object({
            request_id: z.string(),
            cards: z.array(takoCardSchema).optional(),
            web_results: z.array(takoWebResultSchema).optional(),
            usage: z.object({
              total_cost_usd: z.number(),
              compute: z.object({ cost_usd: z.number() }).nullish(),
              data: z.object({ cost_usd: z.number(), datasets: z.number() }).nullish()
            }).nullish(),
            related: z.array(z.object({}).passthrough()).nullish()
          }).passthrough(),
          z.object({
            error: z.enum([
              "api_error",
              "configuration_error",
              "execution_error",
              "invalid_input",
              "rate_limit",
              "timeout",
              "unknown_tool"
            ]),
            statusCode: z.number().optional(),
            message: z.string()
          })
        ])
      )
    );
    takoSearchToolFactory = createProviderExecutedToolFactory({
      id: "gateway.tako_search",
      inputSchema: takoSearchInputSchema,
      outputSchema: takoSearchOutputSchema
    });
    takoSearch = /* @__PURE__ */ __name((config2 = {}) => takoSearchToolFactory(config2), "takoSearch");
    gatewayTools = {
      /**
       * Search the web using Exa for current information and token-efficient
       * excerpts optimized for agent workflows.
       *
       * Supports search type, category, domain, date, location, and content
       * extraction controls.
       */
      exaSearch,
      /**
       * Search the web using Parallel AI's Search API for LLM-optimized excerpts.
       *
       * Takes a natural language objective and returns relevant excerpts,
       * replacing multiple keyword searches with a single call for broad
       * or complex queries. Supports different search types for depth vs
       * breadth tradeoffs.
       */
      parallelSearch,
      /**
       * Search the web using Perplexity's Search API for real-time information,
       * news, research papers, and articles.
       *
       * Provides ranked search results with advanced filtering options including
       * domain, language, date range, and recency filters.
       */
      perplexitySearch,
      /**
       * Search the web and Tako's curated knowledge graph in one call for
       * token-efficient web excerpts and structured data results grounded in
       * premium sources, each with an embed-ready visualization.
       *
       * Supports effort, per-source web and data controls, localization, and inline
       * contents for agents that need to reason over underlying data.
       */
      takoSearch
    };
    __name(getVercelRequestId, "getVercelRequestId");
    VERSION2 = true ? "4.0.83" : "0.0.0-test";
    AI_GATEWAY_PROTOCOL_VERSION = "0.0.1";
    gatewayClientSecretResponseSchema = z.object({
      token: z.string(),
      expiresAt: z.number().nullish()
    });
    __name(createGateway, "createGateway");
    gateway = createGateway();
    __name(getGatewayAuthToken, "getGatewayAuthToken");
    __name(assertGatewayClientSecretServerEnvironment, "assertGatewayClientSecretServerEnvironment");
  }
});

// node_modules/ai/dist/index.js
function isRetryableStatusCode(statusCode) {
  return statusCode != null && (statusCode === 408 || statusCode === 409 || statusCode === 429 || statusCode >= 500);
}
function formatWarning({
  warning,
  provider,
  model
}) {
  const scope = provider != null && model != null ? ` (${provider} / ${model})` : "";
  const prefix = `AI SDK Warning${scope}:`;
  switch (warning.type) {
    case "unsupported": {
      let message = `${prefix} The feature "${warning.feature}" is not supported.`;
      if (warning.details) {
        message += ` ${warning.details}`;
      }
      return message;
    }
    case "compatibility": {
      let message = `${prefix} The feature "${warning.feature}" is used in a compatibility mode.`;
      if (warning.details) {
        message += ` ${warning.details}`;
      }
      return message;
    }
    case "deprecated": {
      return `${prefix} Deprecated: "${warning.setting}". ${warning.message}`;
    }
    case "other": {
      return `${prefix} ${warning.message}`;
    }
    default: {
      return `${prefix} ${JSON.stringify(warning, null, 2)}`;
    }
  }
}
function emitWarning({
  message,
  type
}) {
  if (typeof process !== "undefined" && typeof process.emitWarning === "function") {
    process.emitWarning(message, { type });
  } else {
    console.warn(message);
  }
}
function getRetryDelayInMs({
  error: error2,
  exponentialBackoffDelay
}) {
  const headers = APICallError.isInstance(error2) ? error2.responseHeaders : APICallError.isInstance(error2.cause) ? error2.cause.responseHeaders : void 0;
  if (!headers) return exponentialBackoffDelay;
  let ms;
  const retryAfterMs = headers["retry-after-ms"];
  if (retryAfterMs) {
    const timeoutMs = parseFloat(retryAfterMs);
    if (!Number.isNaN(timeoutMs)) {
      ms = timeoutMs;
    }
  }
  const retryAfter = headers["retry-after"];
  if (retryAfter && ms === void 0) {
    const timeoutSeconds = parseFloat(retryAfter);
    if (!Number.isNaN(timeoutSeconds)) {
      ms = timeoutSeconds * 1e3;
    } else {
      ms = Date.parse(retryAfter) - Date.now();
    }
  }
  if (ms != null && !Number.isNaN(ms) && 0 <= ms && (ms < 60 * 1e3 || ms < exponentialBackoffDelay)) {
    return ms;
  }
  return exponentialBackoffDelay;
}
function prepareRetries({
  maxRetries,
  abortSignal,
  additionalRetryableError,
  parameter = "maxRetries",
  defaultMaxRetries = 2
}) {
  if (maxRetries != null) {
    if (!Number.isInteger(maxRetries)) {
      throw new InvalidArgumentError2({
        parameter,
        value: maxRetries,
        message: `${parameter} must be an integer`
      });
    }
    if (maxRetries < 0) {
      throw new InvalidArgumentError2({
        parameter,
        value: maxRetries,
        message: `${parameter} must be >= 0`
      });
    }
  }
  const maxRetriesResult = maxRetries != null ? maxRetries : defaultMaxRetries;
  return {
    maxRetries: maxRetriesResult,
    retry: retryWithExponentialBackoffRespectingRetryHeaders({
      maxRetries: maxRetriesResult,
      abortSignal,
      additionalRetryableError
    })
  };
}
function fixJson(input) {
  const stack = ["ROOT"];
  let lastValidIndex = -1;
  let literalStart = null;
  let unicodeEscapeDigits = 0;
  function isHexDigit(char) {
    return char >= "0" && char <= "9" || char >= "A" && char <= "F" || char >= "a" && char <= "f";
  }
  __name(isHexDigit, "isHexDigit");
  function processValueStart(char, i, swapState) {
    {
      switch (char) {
        case '"': {
          lastValidIndex = i;
          stack.pop();
          stack.push(swapState);
          stack.push("INSIDE_STRING");
          break;
        }
        case "f":
        case "t":
        case "n": {
          lastValidIndex = i;
          literalStart = i;
          stack.pop();
          stack.push(swapState);
          stack.push("INSIDE_LITERAL");
          break;
        }
        case "-": {
          stack.pop();
          stack.push(swapState);
          stack.push("INSIDE_NUMBER");
          break;
        }
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9": {
          lastValidIndex = i;
          stack.pop();
          stack.push(swapState);
          stack.push("INSIDE_NUMBER");
          break;
        }
        case "{": {
          lastValidIndex = i;
          stack.pop();
          stack.push(swapState);
          stack.push("INSIDE_OBJECT_START");
          break;
        }
        case "[": {
          lastValidIndex = i;
          stack.pop();
          stack.push(swapState);
          stack.push("INSIDE_ARRAY_START");
          break;
        }
      }
    }
  }
  __name(processValueStart, "processValueStart");
  function processAfterObjectValue(char, i) {
    switch (char) {
      case ",": {
        stack.pop();
        stack.push("INSIDE_OBJECT_AFTER_COMMA");
        break;
      }
      case "}": {
        lastValidIndex = i;
        stack.pop();
        break;
      }
    }
  }
  __name(processAfterObjectValue, "processAfterObjectValue");
  function processAfterArrayValue(char, i) {
    switch (char) {
      case ",": {
        stack.pop();
        stack.push("INSIDE_ARRAY_AFTER_COMMA");
        break;
      }
      case "]": {
        lastValidIndex = i;
        stack.pop();
        break;
      }
    }
  }
  __name(processAfterArrayValue, "processAfterArrayValue");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const currentState = stack[stack.length - 1];
    switch (currentState) {
      case "ROOT":
        processValueStart(char, i, "FINISH");
        break;
      case "INSIDE_OBJECT_START": {
        switch (char) {
          case '"': {
            stack.pop();
            stack.push("INSIDE_OBJECT_KEY");
            break;
          }
          case "}": {
            lastValidIndex = i;
            stack.pop();
            break;
          }
        }
        break;
      }
      case "INSIDE_OBJECT_AFTER_COMMA": {
        switch (char) {
          case '"': {
            stack.pop();
            stack.push("INSIDE_OBJECT_KEY");
            break;
          }
        }
        break;
      }
      case "INSIDE_OBJECT_KEY": {
        switch (char) {
          case '"': {
            stack.pop();
            stack.push("INSIDE_OBJECT_AFTER_KEY");
            break;
          }
        }
        break;
      }
      case "INSIDE_OBJECT_AFTER_KEY": {
        switch (char) {
          case ":": {
            stack.pop();
            stack.push("INSIDE_OBJECT_BEFORE_VALUE");
            break;
          }
        }
        break;
      }
      case "INSIDE_OBJECT_BEFORE_VALUE": {
        processValueStart(char, i, "INSIDE_OBJECT_AFTER_VALUE");
        break;
      }
      case "INSIDE_OBJECT_AFTER_VALUE": {
        processAfterObjectValue(char, i);
        break;
      }
      case "INSIDE_STRING": {
        switch (char) {
          case '"': {
            stack.pop();
            lastValidIndex = i;
            break;
          }
          case "\\": {
            stack.push("INSIDE_STRING_ESCAPE");
            break;
          }
          default: {
            lastValidIndex = i;
          }
        }
        break;
      }
      case "INSIDE_ARRAY_START": {
        switch (char) {
          case "]": {
            lastValidIndex = i;
            stack.pop();
            break;
          }
          default: {
            lastValidIndex = i;
            processValueStart(char, i, "INSIDE_ARRAY_AFTER_VALUE");
            break;
          }
        }
        break;
      }
      case "INSIDE_ARRAY_AFTER_VALUE": {
        switch (char) {
          case ",": {
            stack.pop();
            stack.push("INSIDE_ARRAY_AFTER_COMMA");
            break;
          }
          case "]": {
            lastValidIndex = i;
            stack.pop();
            break;
          }
          default: {
            lastValidIndex = i;
            break;
          }
        }
        break;
      }
      case "INSIDE_ARRAY_AFTER_COMMA": {
        processValueStart(char, i, "INSIDE_ARRAY_AFTER_VALUE");
        break;
      }
      case "INSIDE_STRING_ESCAPE": {
        stack.pop();
        if (char === "u") {
          unicodeEscapeDigits = 0;
          stack.push("INSIDE_STRING_UNICODE_ESCAPE");
        } else {
          lastValidIndex = i;
        }
        break;
      }
      case "INSIDE_STRING_UNICODE_ESCAPE": {
        if (isHexDigit(char)) {
          unicodeEscapeDigits++;
          if (unicodeEscapeDigits === 4) {
            stack.pop();
            lastValidIndex = i;
          }
        }
        break;
      }
      case "INSIDE_NUMBER": {
        switch (char) {
          case "0":
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7":
          case "8":
          case "9": {
            lastValidIndex = i;
            break;
          }
          case "e":
          case "E":
          case "-":
          case ".": {
            break;
          }
          case ",": {
            stack.pop();
            if (stack[stack.length - 1] === "INSIDE_ARRAY_AFTER_VALUE") {
              processAfterArrayValue(char, i);
            }
            if (stack[stack.length - 1] === "INSIDE_OBJECT_AFTER_VALUE") {
              processAfterObjectValue(char, i);
            }
            break;
          }
          case "}": {
            stack.pop();
            if (stack[stack.length - 1] === "INSIDE_OBJECT_AFTER_VALUE") {
              processAfterObjectValue(char, i);
            }
            break;
          }
          case "]": {
            stack.pop();
            if (stack[stack.length - 1] === "INSIDE_ARRAY_AFTER_VALUE") {
              processAfterArrayValue(char, i);
            }
            break;
          }
          default: {
            stack.pop();
            break;
          }
        }
        break;
      }
      case "INSIDE_LITERAL": {
        const partialLiteral = input.substring(literalStart, i + 1);
        if (!"false".startsWith(partialLiteral) && !"true".startsWith(partialLiteral) && !"null".startsWith(partialLiteral)) {
          stack.pop();
          if (stack[stack.length - 1] === "INSIDE_OBJECT_AFTER_VALUE") {
            processAfterObjectValue(char, i);
          } else if (stack[stack.length - 1] === "INSIDE_ARRAY_AFTER_VALUE") {
            processAfterArrayValue(char, i);
          }
        } else {
          lastValidIndex = i;
        }
        break;
      }
    }
  }
  let result = input.slice(0, lastValidIndex + 1);
  for (let i = stack.length - 1; i >= 0; i--) {
    const state = stack[i];
    switch (state) {
      case "INSIDE_STRING": {
        result += '"';
        break;
      }
      case "INSIDE_OBJECT_KEY":
      case "INSIDE_OBJECT_AFTER_KEY":
      case "INSIDE_OBJECT_AFTER_COMMA":
      case "INSIDE_OBJECT_START":
      case "INSIDE_OBJECT_BEFORE_VALUE":
      case "INSIDE_OBJECT_AFTER_VALUE": {
        result += "}";
        break;
      }
      case "INSIDE_ARRAY_START":
      case "INSIDE_ARRAY_AFTER_COMMA":
      case "INSIDE_ARRAY_AFTER_VALUE": {
        result += "]";
        break;
      }
      case "INSIDE_LITERAL": {
        const partialLiteral = input.substring(literalStart, input.length);
        if ("true".startsWith(partialLiteral)) {
          result += "true".slice(partialLiteral.length);
        } else if ("false".startsWith(partialLiteral)) {
          result += "false".slice(partialLiteral.length);
        } else if ("null".startsWith(partialLiteral)) {
          result += "null".slice(partialLiteral.length);
        }
      }
    }
  }
  return result;
}
async function parsePartialJson(jsonText) {
  if (jsonText === void 0) {
    return { value: void 0, state: "undefined-input" };
  }
  let result = await safeParseJSON({ text: jsonText });
  if (result.success) {
    return { value: result.value, state: "successful-parse" };
  }
  result = await safeParseJSON({ text: fixJson(jsonText) });
  if (result.success) {
    return { value: result.value, state: "repaired-parse" };
  }
  return { value: void 0, state: "failed-parse" };
}
function validateArrayBound({
  name: name25,
  value
}) {
  if (value == null) {
    return;
  }
  if (!Number.isInteger(value)) {
    throw new InvalidArgumentError2({
      parameter: name25,
      value,
      message: `${name25} must be an integer`
    });
  }
  if (value < 0) {
    throw new InvalidArgumentError2({
      parameter: name25,
      value,
      message: `${name25} must be greater than or equal to 0`
    });
  }
}
function getArrayLengthValidationError({
  value,
  minItems,
  maxItems
}) {
  if (minItems != null && value.length < minItems) {
    return new TypeValidationError({
      value,
      cause: `elements array must contain at least ${minItems} items`
    });
  }
  if (maxItems != null && value.length > maxItems) {
    return new TypeValidationError({
      value,
      cause: `elements array must contain at most ${maxItems} items`
    });
  }
  return void 0;
}
function isRecord2(value) {
  if (value == null || typeof value !== "object" || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function isJSON(value, ancestors = /* @__PURE__ */ new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || !Array.isArray(value) && !isRecord2(value))
    return false;
  if (ancestors.has(value)) return false;
  ancestors.add(value);
  const valid = Object.getOwnPropertySymbols(value).length === 0 && (Array.isArray(value) ? Array.from(value).every((item) => isJSON(item, ancestors)) : Object.values(value).every((item) => isJSON(item, ancestors)));
  ancestors.delete(value);
  return valid;
}
function isInput(value) {
  return (typeof value === "string" || Array.isArray(value) || isRecord2(value)) && isJSON(value);
}
function invalidInput(parameter, value, message) {
  throw new InvalidArgumentError2({ parameter, value, message });
}
function validateEvaluationInput({
  state,
  questions
}) {
  if (!isInput(state)) {
    invalidInput(
      "state",
      state,
      "must be a JSON-compatible string, object, or array"
    );
  }
  if (!isRecord2(questions) || Object.keys(questions).length === 0) {
    invalidInput("questions", questions, "must be a nonempty question map");
  }
  for (const [id, question] of Object.entries(questions)) {
    const parameter = `questions.${id}`;
    if (!isRecord2(question) || !isInput(question.instructions)) {
      invalidInput(
        parameter,
        question,
        "instructions must be a JSON-compatible string, object, or array"
      );
    }
    const criteria = question.criteria;
    switch (question.type) {
      case "choice":
        if (!isRecord2(criteria) || Object.keys(criteria).length === 0) {
          invalidInput(
            parameter,
            question,
            "choice criteria must be a nonempty option map"
          );
        }
        break;
      case "score":
        if (!Array.isArray(criteria) || criteria.length < 2) {
          invalidInput(
            parameter,
            question,
            "score criteria must contain at least two ordered levels"
          );
        }
        break;
      case "boolean":
        if (criteria === void 0) continue;
        if (!isRecord2(criteria) || Object.keys(criteria).some((key) => key !== "true" && key !== "false")) {
          invalidInput(
            parameter,
            question,
            "boolean criteria may only describe true and false"
          );
        }
        break;
      default:
        invalidInput(
          parameter,
          question,
          "question type must be choice, score, or boolean"
        );
    }
    if (!isJSON(criteria) || Object.values(criteria).some((value) => value !== null && !isInput(value))) {
      invalidInput(
        parameter,
        question,
        "criteria descriptions must be JSON-compatible strings, objects, arrays, or null"
      );
    }
  }
}
function invalidAnswer(answers, message) {
  throw new InvalidResponseDataError({ data: answers, message });
}
function isProbability(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}
function hasExactKeys(value, keys) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
function validateDistribution(value, keys, answers, id, roundingError) {
  if (!isRecord2(value) || !hasExactKeys(value, keys) || !Object.values(value).every(isProbability)) {
    invalidAnswer(
      answers,
      `Question "${id}" must have a complete distribution of finite probabilities in [0, 1].`
    );
  }
  const sum = Object.values(value).reduce(
    (total, probability) => total + probability,
    0
  );
  if (Math.abs(sum - 1) > tolerance + keys.length * roundingError) {
    invalidAnswer(
      answers,
      `Question "${id}" probabilities must sum to 1 within the declared rounding precision.`
    );
  }
}
function validateEvaluationAnswers({
  questions,
  answers,
  rounding
}) {
  function roundingError(decimals) {
    if (decimals === void 0) return 0;
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 15) {
      invalidAnswer(
        answers,
        "Evaluation rounding decimals must be integers between 0 and 15."
      );
    }
    return 0.5 * 10 ** -decimals;
  }
  __name(roundingError, "roundingError");
  const probabilityError = roundingError(rounding == null ? void 0 : rounding.probabilityDecimals);
  const scoreError = roundingError(rounding == null ? void 0 : rounding.scoreDecimals);
  if (!isRecord2(answers) || !hasExactKeys(answers, Object.keys(questions))) {
    invalidAnswer(
      answers,
      "Evaluation must return exactly one answer for every question."
    );
  }
  for (const [id, question] of Object.entries(questions)) {
    const answer = answers[id];
    if (!isRecord2(answer) || answer.type !== question.type) {
      invalidAnswer(
        answers,
        `Question "${id}" returned an answer with the wrong type.`
      );
    }
    switch (question.type) {
      case "choice": {
        if (typeof answer.choice !== "string" || !Object.hasOwn(question.criteria, answer.choice)) {
          invalidAnswer(
            answers,
            `Question "${id}" selected an unknown option.`
          );
        }
        if (answer.probabilities !== void 0) {
          validateDistribution(
            answer.probabilities,
            Object.keys(question.criteria),
            answers,
            id,
            probabilityError
          );
          const selected = answer.probabilities[answer.choice];
          if (Object.values(answer.probabilities).some(
            (probability) => probability > selected + tolerance
          )) {
            invalidAnswer(
              answers,
              `Question "${id}" did not select a highest-probability option.`
            );
          }
        }
        break;
      }
      case "score": {
        if (typeof answer.score !== "number" || !Number.isFinite(answer.score) || answer.score < 0 || answer.score > question.criteria.length - 1) {
          invalidAnswer(
            answers,
            `Question "${id}" score must be in [0, ${question.criteria.length - 1}].`
          );
        }
        if (answer.probabilities !== void 0) {
          const keys = question.criteria.map((_, index) => String(index));
          validateDistribution(
            answer.probabilities,
            keys,
            answers,
            id,
            probabilityError
          );
          const mean = Object.entries(answer.probabilities).reduce(
            (total, [index, probability]) => total + Number(index) * probability,
            0
          );
          const meanRoundingError = keys.reduce(
            (total, index) => total + Number(index) * probabilityError,
            0
          );
          if (Math.abs(mean - answer.score) > tolerance + meanRoundingError + scoreError) {
            invalidAnswer(
              answers,
              `Question "${id}" score must equal the probability-weighted mean within the declared rounding precision.`
            );
          }
        }
        break;
      }
      case "boolean":
        if (!isProbability(answer.probability)) {
          invalidAnswer(
            answers,
            `Question "${id}" must return P(true) as a finite probability in [0, 1].`
          );
        }
        break;
    }
  }
}
async function evaluate({
  model,
  state,
  questions,
  maxRetries,
  abortSignal,
  headers,
  providerOptions = {}
}) {
  var _a25, _b25, _c, _d, _e, _f;
  if (model.specificationVersion !== "v4") {
    throw new UnsupportedModelVersionError({
      version: model.specificationVersion,
      provider: model.provider,
      modelId: model.modelId
    });
  }
  validateEvaluationInput({ state, questions });
  for (const [questionId, question] of Object.entries(questions)) {
    if (!model.supportedQuestionTypes.includes(question.type)) {
      throw new EvaluationUnsupportedQuestionTypeError({
        questionId,
        questionType: question.type,
        provider: model.provider,
        modelId: model.modelId
      });
    }
  }
  const { retry } = prepareRetries({ maxRetries, abortSignal });
  const result = await retry(() => {
    abortSignal == null ? void 0 : abortSignal.throwIfAborted();
    return model.doEvaluate({
      state,
      questions,
      abortSignal,
      headers: withUserAgentSuffix(headers != null ? headers : {}, `ai/${VERSION3}`),
      providerOptions
    });
  });
  abortSignal == null ? void 0 : abortSignal.throwIfAborted();
  validateEvaluationAnswers({
    questions,
    answers: result.answers,
    rounding: result.rounding
  });
  logWarnings({
    warnings: result.warnings,
    provider: model.provider,
    model: model.modelId
  });
  const inputTokens = (_a25 = result.usage) == null ? void 0 : _a25.inputTokens;
  const outputTokens = (_b25 = result.usage) == null ? void 0 : _b25.outputTokens;
  return {
    answers: result.answers,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens != null && outputTokens != null ? inputTokens + outputTokens : void 0
    },
    warnings: result.warnings,
    rounding: result.rounding,
    providerMetadata: result.providerMetadata,
    response: {
      ...result.response,
      timestamp: (_d = (_c = result.response) == null ? void 0 : _c.timestamp) != null ? _d : /* @__PURE__ */ new Date(),
      modelId: (_f = (_e = result.response) == null ? void 0 : _e.modelId) != null ? _f : model.modelId
    }
  };
}
function createDownload(options) {
  return ({ url, abortSignal }) => download({ url, maxBytes: options == null ? void 0 : options.maxBytes, abortSignal });
}
var __defProp2, __export2, name18, marker18, symbol19, _a21, _b19, InvalidArgumentError2, name24, marker24, symbol24, _a24, _b24, InvalidStreamPartError, name33, marker34, symbol33, _a33, _b33, InvalidToolApprovalError, name43, marker43, symbol43, _a43, _b43, InvalidToolApprovalSignatureError, name53, marker53, symbol53, _a53, _b53, InvalidToolInputError, name63, marker63, symbol63, _a63, _b63, ToolCallNotFoundForApprovalError, name73, marker73, symbol73, _a73, _b73, MissingToolResultsError, name83, marker83, symbol83, _a83, _b83, NoImageGeneratedError, name93, marker93, symbol93, _a93, _b93, NoObjectGeneratedError, name103, marker103, symbol103, _a103, _b103, NoOutputGeneratedError, name112, marker113, symbol113, _a113, _b113, NoSpeechGeneratedError, name122, marker122, symbol122, _a122, _b122, NoTranscriptGeneratedError, name132, marker132, symbol132, _a132, _b132, NoTranslationGeneratedError, name142, marker142, symbol142, _a142, _b142, NoVideoGeneratedError, name152, marker152, symbol152, _a152, _b152, NoSuchToolError, name162, marker162, symbol162, _a162, _b162, StreamProviderError, name172, marker172, symbol172, _a172, _b172, ToolCallRepairError, name182, marker182, symbol182, _a182, _b182, ToolChoiceViolationError, UnsupportedModelVersionError, name19, marker19, symbol192, _a192, _b192, UIMessageStreamError, name20, marker20, symbol20, _a202, _b20, InvalidDataContentError, name21, marker21, symbol21, _a212, _b21, InvalidMessageRoleError, name222, marker222, symbol222, _a222, _b222, MessageConversionError, name232, marker232, symbol232, _a232, _b232, RetryError, FIRST_WARNING_INFO_MESSAGE, hasLoggedBefore, logWarnings, VERSION3, download, z2, jsonValueSchema, providerMetadataSchema, fileInlineDataSchema, providerReferenceSchema, textPartSchema, imagePartSchema, taggedFileDataSchema, taggedReasoningFileDataSchema, filePartSchema, reasoningPartSchema, customPartSchema, reasoningFilePartSchema, toolCallPartSchema, outputSchema, toolResultPartSchema, toolApprovalRequestSchema, toolApprovalResponseSchema, systemModelMessageSchema, userModelMessageSchema, assistantModelMessageSchema, toolModelMessageSchema, modelMessageSchema, retryWithExponentialBackoffRespectingRetryHeaders, output_exports, text, object2, array2, choice, json2, encoder, encoder2, originalGenerateId, originalGenerateCallId, JsonToSseTransformStream, toolMetadataSchema, uiMessageChunkSchema, originalGenerateId2, originalGenerateCallId2, originalGenerateId3, originalGenerateCallId3, toolMetadataSchema2, providerReferenceSchema2, uiMessagesSchema, originalGenerateCallId4, originalGenerateCallId5, textEncoder, tolerance, originalGenerateId4, atob22, originalGenerateId5, defaultDownload, REALTIME_MAX_FRAME_BYTES, REALTIME_MAX_BUFFERED_BYTES, MAX_SESSION_ANSWER_BYTES, setupSchema, name242, marker242, symbol242, _a242, _b242, NoSuchProviderError, originalGenerateCallId6, defaultDownload2;
var init_dist6 = __esm({
  "node_modules/ai/dist/index.js"() {
    init_dist4();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    init_dist4();
    init_v4();
    init_dist4();
    init_dist();
    init_dist5();
    init_dist4();
    init_dist();
    init_dist4();
    init_dist4();
    init_dist4();
    init_dist4();
    init_dist4();
    init_dist4();
    init_dist4();
    init_dist4();
    init_dist();
    init_dist4();
    init_dist();
    init_dist4();
    init_dist4();
    init_dist();
    init_dist4();
    __defProp2 = Object.defineProperty;
    __export2 = /* @__PURE__ */ __name((target, all) => {
      for (var name25 in all)
        __defProp2(target, name25, { get: all[name25], enumerable: true });
    }, "__export");
    name18 = "AI_InvalidArgumentError";
    marker18 = `vercel.ai.error.${name18}`;
    symbol19 = Symbol.for(marker18);
    InvalidArgumentError2 = class extends (_b19 = AISDKError, _a21 = symbol19, _b19) {
      static {
        __name(this, "InvalidArgumentError");
      }
      constructor({
        parameter,
        value,
        message
      }) {
        super({
          name: name18,
          message: `Invalid argument for parameter ${parameter}: ${message}`
        });
        this[_a21] = true;
        this.parameter = parameter;
        this.value = value;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker18);
      }
    };
    name24 = "AI_InvalidStreamPartError";
    marker24 = `vercel.ai.error.${name24}`;
    symbol24 = Symbol.for(marker24);
    InvalidStreamPartError = class extends (_b24 = AISDKError, _a24 = symbol24, _b24) {
      static {
        __name(this, "InvalidStreamPartError");
      }
      constructor({
        chunk,
        message
      }) {
        super({ name: name24, message });
        this[_a24] = true;
        this.chunk = chunk;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker24);
      }
    };
    name33 = "AI_InvalidToolApprovalError";
    marker34 = `vercel.ai.error.${name33}`;
    symbol33 = Symbol.for(marker34);
    InvalidToolApprovalError = class extends (_b33 = AISDKError, _a33 = symbol33, _b33) {
      static {
        __name(this, "InvalidToolApprovalError");
      }
      constructor({ approvalId }) {
        super({
          name: name33,
          message: `Tool approval response references unknown approvalId: "${approvalId}". No matching tool-approval-request found in message history.`
        });
        this[_a33] = true;
        this.approvalId = approvalId;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker34);
      }
    };
    name43 = "AI_InvalidToolApprovalSignatureError";
    marker43 = `vercel.ai.error.${name43}`;
    symbol43 = Symbol.for(marker43);
    InvalidToolApprovalSignatureError = class extends (_b43 = AISDKError, _a43 = symbol43, _b43) {
      static {
        __name(this, "InvalidToolApprovalSignatureError");
      }
      constructor({
        approvalId,
        toolCallId,
        reason
      }) {
        super({
          name: name43,
          message: `Tool approval signature verification failed for approval "${approvalId}" (tool call "${toolCallId}"): ${reason}`
        });
        this[_a43] = true;
        this.approvalId = approvalId;
        this.toolCallId = toolCallId;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker43);
      }
    };
    name53 = "AI_InvalidToolInputError";
    marker53 = `vercel.ai.error.${name53}`;
    symbol53 = Symbol.for(marker53);
    InvalidToolInputError = class extends (_b53 = AISDKError, _a53 = symbol53, _b53) {
      static {
        __name(this, "InvalidToolInputError");
      }
      constructor({
        toolInput,
        toolName,
        cause,
        message = `Invalid input for tool ${toolName}: ${getErrorMessage(cause)}`
      }) {
        super({ name: name53, message, cause });
        this[_a53] = true;
        this.toolInput = toolInput;
        this.toolName = toolName;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker53);
      }
    };
    name63 = "AI_ToolCallNotFoundForApprovalError";
    marker63 = `vercel.ai.error.${name63}`;
    symbol63 = Symbol.for(marker63);
    ToolCallNotFoundForApprovalError = class extends (_b63 = AISDKError, _a63 = symbol63, _b63) {
      static {
        __name(this, "ToolCallNotFoundForApprovalError");
      }
      constructor({
        toolCallId,
        approvalId
      }) {
        super({
          name: name63,
          message: `Tool call "${toolCallId}" not found for approval request "${approvalId}".`
        });
        this[_a63] = true;
        this.toolCallId = toolCallId;
        this.approvalId = approvalId;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker63);
      }
    };
    name73 = "AI_MissingToolResultsError";
    marker73 = `vercel.ai.error.${name73}`;
    symbol73 = Symbol.for(marker73);
    MissingToolResultsError = class extends (_b73 = AISDKError, _a73 = symbol73, _b73) {
      static {
        __name(this, "MissingToolResultsError");
      }
      constructor({ toolCallIds }) {
        super({
          name: name73,
          message: `Tool result${toolCallIds.length > 1 ? "s are" : " is"} missing for tool call${toolCallIds.length > 1 ? "s" : ""} ${toolCallIds.join(
            ", "
          )}.`
        });
        this[_a73] = true;
        this.toolCallIds = toolCallIds;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker73);
      }
    };
    name83 = "AI_NoImageGeneratedError";
    marker83 = `vercel.ai.error.${name83}`;
    symbol83 = Symbol.for(marker83);
    NoImageGeneratedError = class extends (_b83 = AISDKError, _a83 = symbol83, _b83) {
      static {
        __name(this, "NoImageGeneratedError");
      }
      constructor({
        message = "No image generated.",
        cause,
        calls,
        responses
      }) {
        super({ name: name83, message, cause });
        this[_a83] = true;
        this.calls = calls;
        this.responses = responses;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker83);
      }
    };
    name93 = "AI_NoObjectGeneratedError";
    marker93 = `vercel.ai.error.${name93}`;
    symbol93 = Symbol.for(marker93);
    NoObjectGeneratedError = class extends (_b93 = AISDKError, _a93 = symbol93, _b93) {
      static {
        __name(this, "NoObjectGeneratedError");
      }
      constructor({
        message = "No object generated.",
        cause,
        text: text2,
        response,
        usage,
        finishReason
      }) {
        super({ name: name93, message, cause });
        this[_a93] = true;
        this.text = text2;
        this.response = response;
        this.usage = usage;
        this.finishReason = finishReason;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker93);
      }
    };
    name103 = "AI_NoOutputGeneratedError";
    marker103 = `vercel.ai.error.${name103}`;
    symbol103 = Symbol.for(marker103);
    NoOutputGeneratedError = class extends (_b103 = AISDKError, _a103 = symbol103, _b103) {
      static {
        __name(this, "NoOutputGeneratedError");
      }
      // used in isInstance
      constructor({
        message = "No output generated.",
        cause
      } = {}) {
        super({ name: name103, message, cause });
        this[_a103] = true;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker103);
      }
    };
    name112 = "AI_NoSpeechGeneratedError";
    marker113 = `vercel.ai.error.${name112}`;
    symbol113 = Symbol.for(marker113);
    NoSpeechGeneratedError = class extends (_b113 = AISDKError, _a113 = symbol113, _b113) {
      static {
        __name(this, "NoSpeechGeneratedError");
      }
      constructor(options) {
        super({
          name: name112,
          message: "No speech audio generated."
        });
        this[_a113] = true;
        this.responses = options.responses;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker113);
      }
    };
    name122 = "AI_NoTranscriptGeneratedError";
    marker122 = `vercel.ai.error.${name122}`;
    symbol122 = Symbol.for(marker122);
    NoTranscriptGeneratedError = class extends (_b122 = AISDKError, _a122 = symbol122, _b122) {
      static {
        __name(this, "NoTranscriptGeneratedError");
      }
      constructor(options) {
        super({
          name: name122,
          message: "No transcript generated."
        });
        this[_a122] = true;
        this.responses = options.responses;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker122);
      }
    };
    name132 = "AI_NoTranslationGeneratedError";
    marker132 = `vercel.ai.error.${name132}`;
    symbol132 = Symbol.for(marker132);
    NoTranslationGeneratedError = class extends (_b132 = AISDKError, _a132 = symbol132, _b132) {
      static {
        __name(this, "NoTranslationGeneratedError");
      }
      constructor(options) {
        super({
          name: name132,
          message: "No translation generated."
        });
        this[_a132] = true;
        this.response = options.response;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker132);
      }
    };
    name142 = "AI_NoVideoGeneratedError";
    marker142 = `vercel.ai.error.${name142}`;
    symbol142 = Symbol.for(marker142);
    NoVideoGeneratedError = class extends (_b142 = AISDKError, _a142 = symbol142, _b142) {
      static {
        __name(this, "NoVideoGeneratedError");
      }
      constructor({
        message = "No video generated.",
        cause,
        responses
      }) {
        super({ name: name142, message, cause });
        this[_a142] = true;
        this.responses = responses;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker142);
      }
      /**
       * @deprecated use `isInstance` instead
       */
      static isNoVideoGeneratedError(error2) {
        return error2 instanceof Error && error2.name === name142 && typeof error2.responses !== "undefined" ? true : false;
      }
      /**
       * @deprecated Do not use this method. It will be removed in the next major version.
       */
      toJSON() {
        return {
          name: this.name,
          message: this.message,
          stack: this.stack,
          cause: this.cause,
          responses: this.responses
        };
      }
    };
    name152 = "AI_NoSuchToolError";
    marker152 = `vercel.ai.error.${name152}`;
    symbol152 = Symbol.for(marker152);
    NoSuchToolError = class extends (_b152 = AISDKError, _a152 = symbol152, _b152) {
      static {
        __name(this, "NoSuchToolError");
      }
      constructor({
        toolName,
        availableTools = void 0,
        message = `Model tried to call unavailable tool '${toolName}'. ${availableTools === void 0 ? "No tools are available." : `Available tools: ${availableTools.join(", ")}.`}`
      }) {
        super({ name: name152, message });
        this[_a152] = true;
        this.toolName = toolName;
        this.availableTools = availableTools;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker152);
      }
    };
    name162 = "AI_StreamProviderError";
    marker162 = `vercel.ai.error.${name162}`;
    symbol162 = Symbol.for(marker162);
    StreamProviderError = class extends (_b162 = AISDKError, _a162 = symbol162, _b162) {
      static {
        __name(this, "StreamProviderError");
      }
      constructor({
        message,
        type,
        code,
        statusCode,
        isRetryable = isRetryableStatusCode(statusCode),
        data,
        cause
      }) {
        super({ name: name162, message, cause });
        this[_a162] = true;
        this.type = type;
        this.code = code;
        this.statusCode = statusCode;
        this.isRetryable = isRetryable;
        this.data = data;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker162);
      }
    };
    __name(isRetryableStatusCode, "isRetryableStatusCode");
    name172 = "AI_ToolCallRepairError";
    marker172 = `vercel.ai.error.${name172}`;
    symbol172 = Symbol.for(marker172);
    ToolCallRepairError = class extends (_b172 = AISDKError, _a172 = symbol172, _b172) {
      static {
        __name(this, "ToolCallRepairError");
      }
      constructor({
        cause,
        originalError,
        message = `Error repairing tool call: ${getErrorMessage(cause)}`
      }) {
        super({ name: name172, message, cause });
        this[_a172] = true;
        this.originalError = originalError;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker172);
      }
    };
    name182 = "AI_ToolChoiceViolationError";
    marker182 = `vercel.ai.error.${name182}`;
    symbol182 = Symbol.for(marker182);
    ToolChoiceViolationError = class extends (_b182 = AISDKError, _a182 = symbol182, _b182) {
      static {
        __name(this, "ToolChoiceViolationError");
      }
      constructor({
        toolChoice,
        finishReason,
        provider,
        modelId,
        content,
        message = toolChoice.type === "required" ? "Model response did not contain a tool call even though tool choice was required." : `Model response did not contain a call to the required tool '${toolChoice.toolName}'.`
      }) {
        super({ name: name182, message });
        this[_a182] = true;
        this.toolChoice = toolChoice;
        this.finishReason = finishReason;
        this.provider = provider;
        this.modelId = modelId;
        this.content = content;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker182);
      }
    };
    UnsupportedModelVersionError = class extends AISDKError {
      static {
        __name(this, "UnsupportedModelVersionError");
      }
      constructor(options) {
        super({
          name: "AI_UnsupportedModelVersionError",
          message: `Unsupported model version ${options.version} for provider "${options.provider}" and model "${options.modelId}". AI SDK 5 only supports models that implement specification version "v2".`
        });
        this.version = options.version;
        this.provider = options.provider;
        this.modelId = options.modelId;
      }
    };
    name19 = "AI_UIMessageStreamError";
    marker19 = `vercel.ai.error.${name19}`;
    symbol192 = Symbol.for(marker19);
    UIMessageStreamError = class extends (_b192 = AISDKError, _a192 = symbol192, _b192) {
      static {
        __name(this, "UIMessageStreamError");
      }
      constructor({
        chunkType,
        chunkId,
        message
      }) {
        super({ name: name19, message });
        this[_a192] = true;
        this.chunkType = chunkType;
        this.chunkId = chunkId;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker19);
      }
    };
    name20 = "AI_InvalidDataContentError";
    marker20 = `vercel.ai.error.${name20}`;
    symbol20 = Symbol.for(marker20);
    InvalidDataContentError = class extends (_b20 = AISDKError, _a202 = symbol20, _b20) {
      static {
        __name(this, "InvalidDataContentError");
      }
      constructor({
        content,
        cause,
        message = `Invalid data content. Expected a base64 string, Uint8Array, ArrayBuffer, or Buffer, but got ${typeof content}.`
      }) {
        super({ name: name20, message, cause });
        this[_a202] = true;
        this.content = content;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker20);
      }
    };
    name21 = "AI_InvalidMessageRoleError";
    marker21 = `vercel.ai.error.${name21}`;
    symbol21 = Symbol.for(marker21);
    InvalidMessageRoleError = class extends (_b21 = AISDKError, _a212 = symbol21, _b21) {
      static {
        __name(this, "InvalidMessageRoleError");
      }
      constructor({
        role,
        message = `Invalid message role: '${role}'. Must be one of: "system", "user", "assistant", "tool".`
      }) {
        super({ name: name21, message });
        this[_a212] = true;
        this.role = role;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker21);
      }
    };
    name222 = "AI_MessageConversionError";
    marker222 = `vercel.ai.error.${name222}`;
    symbol222 = Symbol.for(marker222);
    MessageConversionError = class extends (_b222 = AISDKError, _a222 = symbol222, _b222) {
      static {
        __name(this, "MessageConversionError");
      }
      constructor({
        originalMessage,
        message
      }) {
        super({ name: name222, message });
        this[_a222] = true;
        this.originalMessage = originalMessage;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker222);
      }
    };
    name232 = "AI_RetryError";
    marker232 = `vercel.ai.error.${name232}`;
    symbol232 = Symbol.for(marker232);
    RetryError = class extends (_b232 = AISDKError, _a232 = symbol232, _b232) {
      static {
        __name(this, "RetryError");
      }
      constructor({
        message,
        reason,
        errors
      }) {
        super({ name: name232, message });
        this[_a232] = true;
        this.reason = reason;
        this.errors = errors;
        this.lastError = errors[errors.length - 1];
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker232);
      }
    };
    __name(formatWarning, "formatWarning");
    FIRST_WARNING_INFO_MESSAGE = "AI SDK Warning System: To turn off warning logging, set the AI_SDK_LOG_WARNINGS global to false.";
    hasLoggedBefore = false;
    __name(emitWarning, "emitWarning");
    logWarnings = /* @__PURE__ */ __name((options) => {
      if (options.warnings.length === 0) {
        return;
      }
      const logger = globalThis.AI_SDK_LOG_WARNINGS;
      if (logger === false) {
        return;
      }
      if (typeof logger === "function") {
        logger(options);
        return;
      }
      if (!hasLoggedBefore) {
        hasLoggedBefore = true;
        emitWarning({
          message: FIRST_WARNING_INFO_MESSAGE,
          type: "Warning"
        });
      }
      for (const warning of options.warnings) {
        const message = formatWarning({
          warning,
          provider: options.provider,
          model: options.model
        });
        emitWarning({
          message,
          type: warning.type === "deprecated" ? "DeprecationWarning" : "Warning"
        });
      }
    }, "logWarnings");
    VERSION3 = true ? "7.0.103" : "0.0.0-test";
    download = /* @__PURE__ */ __name(async ({
      url,
      maxBytes,
      abortSignal
    }) => {
      var _a25;
      const urlText = url.toString();
      try {
        const headers = withUserAgentSuffix(
          {},
          `ai-sdk/${VERSION3}`,
          getRuntimeEnvironmentUserAgent()
        );
        const response = await fetchWithValidatedRedirects({
          url: urlText,
          headers,
          abortSignal
        });
        if (!response.ok) {
          await cancelResponseBody(response);
          throw new DownloadError({
            url: urlText,
            statusCode: response.status,
            statusText: response.statusText
          });
        }
        const data = await readResponseWithSizeLimit({
          response,
          url: urlText,
          maxBytes: maxBytes != null ? maxBytes : DEFAULT_MAX_DOWNLOAD_SIZE
        });
        return {
          data,
          mediaType: (_a25 = response.headers.get("content-type")) != null ? _a25 : void 0
        };
      } catch (error2) {
        if (DownloadError.isInstance(error2)) {
          throw error2;
        }
        throw new DownloadError({ url: urlText, cause: error2 });
      }
    }, "download");
    z2 = {
      array,
      boolean: boolean2,
      custom,
      discriminatedUnion,
      enum: _enum,
      instanceof: _instanceof,
      lazy,
      literal,
      looseObject,
      never,
      null: _null3,
      number: number2,
      object,
      record,
      string: string2,
      union,
      unknown
    };
    jsonValueSchema = z2.lazy(
      () => z2.union([
        z2.null(),
        z2.string(),
        z2.number(),
        z2.boolean(),
        z2.record(z2.string(), jsonValueSchema.optional()),
        z2.array(jsonValueSchema)
      ])
    );
    providerMetadataSchema = z2.record(
      z2.string(),
      z2.record(z2.string(), jsonValueSchema.optional())
    );
    fileInlineDataSchema = z2.union([
      z2.string(),
      z2.instanceof(Uint8Array),
      z2.instanceof(ArrayBuffer),
      z2.custom(isBuffer, { message: "Must be a Buffer" })
    ]);
    providerReferenceSchema = z2.record(z2.string(), z2.string());
    textPartSchema = z2.object({
      type: z2.literal("text"),
      text: z2.string(),
      providerOptions: providerMetadataSchema.optional()
    });
    imagePartSchema = z2.object({
      type: z2.literal("image"),
      image: z2.union([
        fileInlineDataSchema,
        z2.instanceof(URL),
        providerReferenceSchema
      ]),
      mediaType: z2.string().optional(),
      providerOptions: providerMetadataSchema.optional()
    });
    taggedFileDataSchema = z2.discriminatedUnion("type", [
      z2.object({ type: z2.literal("data"), data: fileInlineDataSchema }),
      z2.object({ type: z2.literal("url"), url: z2.instanceof(URL) }),
      z2.object({
        type: z2.literal("reference"),
        reference: providerReferenceSchema
      }),
      z2.object({ type: z2.literal("text"), text: z2.string() })
    ]);
    taggedReasoningFileDataSchema = z2.discriminatedUnion("type", [
      z2.object({ type: z2.literal("data"), data: fileInlineDataSchema }),
      z2.object({ type: z2.literal("url"), url: z2.instanceof(URL) })
    ]);
    filePartSchema = z2.object({
      type: z2.literal("file"),
      data: z2.union([
        taggedFileDataSchema,
        fileInlineDataSchema,
        z2.instanceof(URL),
        providerReferenceSchema
      ]),
      filename: z2.string().optional(),
      mediaType: z2.string(),
      providerOptions: providerMetadataSchema.optional()
    });
    reasoningPartSchema = z2.object({
      type: z2.literal("reasoning"),
      text: z2.string(),
      providerOptions: providerMetadataSchema.optional()
    });
    customPartSchema = z2.object({
      type: z2.literal("custom"),
      kind: z2.string().transform((value) => value),
      providerOptions: providerMetadataSchema.optional()
    });
    reasoningFilePartSchema = z2.object({
      type: z2.literal("reasoning-file"),
      data: z2.union([
        taggedReasoningFileDataSchema,
        fileInlineDataSchema,
        z2.instanceof(URL)
      ]),
      mediaType: z2.string(),
      providerOptions: providerMetadataSchema.optional()
    });
    toolCallPartSchema = z2.object({
      type: z2.literal("tool-call"),
      toolCallId: z2.string(),
      toolName: z2.string(),
      input: z2.unknown(),
      providerOptions: providerMetadataSchema.optional(),
      providerExecuted: z2.boolean().optional()
    });
    outputSchema = z2.discriminatedUnion(
      "type",
      [
        z2.object({
          type: z2.literal("text"),
          value: z2.string(),
          providerOptions: providerMetadataSchema.optional()
        }),
        z2.object({
          type: z2.literal("json"),
          value: jsonValueSchema,
          providerOptions: providerMetadataSchema.optional()
        }),
        z2.object({
          type: z2.literal("execution-denied"),
          reason: z2.string().optional(),
          providerOptions: providerMetadataSchema.optional()
        }),
        z2.object({
          type: z2.literal("error-text"),
          value: z2.string(),
          providerOptions: providerMetadataSchema.optional()
        }),
        z2.object({
          type: z2.literal("error-json"),
          value: jsonValueSchema,
          providerOptions: providerMetadataSchema.optional()
        }),
        z2.object({
          type: z2.literal("content"),
          value: z2.array(
            z2.union([
              z2.object({
                type: z2.literal("text"),
                text: z2.string(),
                providerOptions: providerMetadataSchema.optional()
              }),
              z2.object({
                type: z2.literal("file"),
                data: taggedFileDataSchema,
                mediaType: z2.string(),
                filename: z2.string().optional(),
                providerOptions: providerMetadataSchema.optional()
              }),
              z2.object({
                // Deprecated.
                type: z2.literal("file-data"),
                data: z2.string(),
                mediaType: z2.string(),
                filename: z2.string().optional(),
                providerOptions: providerMetadataSchema.optional()
              }),
              z2.object({
                // Deprecated.
                type: z2.literal("file-url"),
                url: z2.string(),
                mediaType: z2.string().optional(),
                providerOptions: providerMetadataSchema.optional()
              }),
              z2.object({
                // Deprecated.
                type: z2.literal("file-id"),
                fileId: z2.union([z2.string(), z2.record(z2.string(), z2.string())]),
                providerOptions: providerMetadataSchema.optional()
              }),
              z2.object({
                // Deprecated.
                type: z2.literal("file-reference"),
                providerReference: z2.record(z2.string(), z2.string()),
                providerOptions: providerMetadataSchema.optional()
              }),
              z2.object({
                // Deprecated.
                type: z2.literal("image-data"),
                data: z2.string(),
                mediaType: z2.string(),
                providerOptions: providerMetadataSchema.optional()
              }),
              z2.object({
                // Deprecated.
                type: z2.literal("image-url"),
                url: z2.string(),
                providerOptions: providerMetadataSchema.optional()
              }),
              z2.object({
                // Deprecated.
                type: z2.literal("image-file-id"),
                fileId: z2.union([z2.string(), z2.record(z2.string(), z2.string())]),
                providerOptions: providerMetadataSchema.optional()
              }),
              z2.object({
                // Deprecated.
                type: z2.literal("image-file-reference"),
                providerReference: z2.record(z2.string(), z2.string()),
                providerOptions: providerMetadataSchema.optional()
              }),
              z2.object({
                type: z2.literal("custom"),
                providerOptions: providerMetadataSchema.optional()
              })
            ])
          )
        })
      ]
    );
    toolResultPartSchema = z2.object({
      type: z2.literal("tool-result"),
      toolCallId: z2.string(),
      toolName: z2.string(),
      output: outputSchema,
      providerOptions: providerMetadataSchema.optional()
    });
    toolApprovalRequestSchema = z2.object(
      {
        type: z2.literal("tool-approval-request"),
        approvalId: z2.string(),
        toolCallId: z2.string(),
        reason: z2.string().optional()
      }
    );
    toolApprovalResponseSchema = z2.object({
      type: z2.literal("tool-approval-response"),
      approvalId: z2.string(),
      approved: z2.boolean(),
      reason: z2.string().optional()
    });
    systemModelMessageSchema = z2.object({
      role: z2.literal("system"),
      content: z2.string(),
      providerOptions: providerMetadataSchema.optional()
    });
    userModelMessageSchema = z2.object({
      role: z2.literal("user"),
      content: z2.union([
        z2.string(),
        z2.array(z2.union([textPartSchema, imagePartSchema, filePartSchema]))
      ]),
      providerOptions: providerMetadataSchema.optional()
    });
    assistantModelMessageSchema = z2.object({
      role: z2.literal("assistant"),
      content: z2.union([
        z2.string(),
        z2.array(
          z2.union([
            textPartSchema,
            customPartSchema,
            filePartSchema,
            reasoningPartSchema,
            reasoningFilePartSchema,
            toolCallPartSchema,
            toolResultPartSchema,
            toolApprovalRequestSchema
          ])
        )
      ]),
      providerOptions: providerMetadataSchema.optional()
    });
    toolModelMessageSchema = z2.object({
      role: z2.literal("tool"),
      content: z2.array(z2.union([toolResultPartSchema, toolApprovalResponseSchema])),
      providerOptions: providerMetadataSchema.optional()
    });
    modelMessageSchema = z2.union([
      systemModelMessageSchema,
      userModelMessageSchema,
      assistantModelMessageSchema,
      toolModelMessageSchema
    ]);
    __name(getRetryDelayInMs, "getRetryDelayInMs");
    retryWithExponentialBackoffRespectingRetryHeaders = /* @__PURE__ */ __name(({
      maxRetries = 2,
      initialDelayInMs = 2e3,
      backoffFactor = 2,
      abortSignal,
      additionalRetryableError
    } = {}) => retryWithExponentialBackoff({
      maxRetries,
      initialDelayInMs,
      backoffFactor,
      abortSignal,
      shouldRetry: /* @__PURE__ */ __name(async (error2) => error2 instanceof Error && (APICallError.isInstance(error2) && error2.isRetryable === true || GatewayError.isInstance(error2) && error2.isRetryable === true) || additionalRetryableError != null && await additionalRetryableError(error2), "shouldRetry"),
      getDelayInMs: /* @__PURE__ */ __name(({ error: error2, exponentialBackoffDelay }) => getRetryDelayInMs({
        error: error2,
        exponentialBackoffDelay
      }), "getDelayInMs"),
      createRetryError: /* @__PURE__ */ __name(({ message, reason, errors }) => new RetryError({ message, reason, errors }), "createRetryError")
    }), "retryWithExponentialBackoffRespectingRetryHeaders");
    __name(prepareRetries, "prepareRetries");
    output_exports = {};
    __export2(output_exports, {
      array: /* @__PURE__ */ __name(() => array2, "array"),
      choice: /* @__PURE__ */ __name(() => choice, "choice"),
      json: /* @__PURE__ */ __name(() => json2, "json"),
      object: /* @__PURE__ */ __name(() => object2, "object"),
      text: /* @__PURE__ */ __name(() => text, "text")
    });
    __name(fixJson, "fixJson");
    __name(parsePartialJson, "parsePartialJson");
    text = /* @__PURE__ */ __name(() => ({
      name: "text",
      responseFormat: Promise.resolve({ type: "text" }),
      async parseCompleteOutput({ text: text2 }) {
        return text2;
      },
      async parsePartialOutput({ text: text2 }) {
        return { partial: text2 };
      },
      createElementStreamTransform() {
        return void 0;
      }
    }), "text");
    object2 = /* @__PURE__ */ __name(({
      schema: inputSchema,
      name: name25,
      description
    }) => {
      const schema = asSchema(inputSchema);
      return {
        name: "object",
        responseFormat: resolve(schema.jsonSchema).then((jsonSchema2) => ({
          type: "json",
          schema: jsonSchema2,
          ...name25 != null && { name: name25 },
          ...description != null && { description }
        })),
        async parseCompleteOutput({ text: text2 }, context) {
          const parseResult = await safeParseJSON({ text: text2 });
          if (!parseResult.success) {
            throw new NoObjectGeneratedError({
              message: "No object generated: could not parse the response.",
              cause: parseResult.error,
              text: text2,
              response: context.response,
              usage: context.usage,
              finishReason: context.finishReason
            });
          }
          const validationResult = await safeValidateTypes({
            value: parseResult.value,
            schema
          });
          if (!validationResult.success) {
            throw new NoObjectGeneratedError({
              message: "No object generated: response did not match schema.",
              cause: validationResult.error,
              text: text2,
              response: context.response,
              usage: context.usage,
              finishReason: context.finishReason
            });
          }
          return validationResult.value;
        },
        async parsePartialOutput({ text: text2 }) {
          const result = await parsePartialJson(text2);
          switch (result.state) {
            case "failed-parse":
            case "undefined-input": {
              return void 0;
            }
            case "repaired-parse":
            case "successful-parse": {
              return {
                // Note: currently no validation of partial results:
                partial: result.value
              };
            }
          }
        },
        createElementStreamTransform() {
          return void 0;
        }
      };
    }, "object2");
    array2 = /* @__PURE__ */ __name(({
      element: inputElementSchema,
      minItems,
      maxItems,
      name: name25,
      description
    }) => {
      validateArrayBound({ name: "minItems", value: minItems });
      validateArrayBound({ name: "maxItems", value: maxItems });
      if (minItems != null && maxItems != null && minItems > maxItems) {
        throw new InvalidArgumentError2({
          parameter: "minItems",
          value: minItems,
          message: "minItems must be less than or equal to maxItems"
        });
      }
      const elementSchema = asSchema(inputElementSchema);
      return {
        name: "array",
        // JSON schema that describes an array of elements:
        responseFormat: resolve(elementSchema.jsonSchema).then((jsonSchema2) => {
          const {
            $schema: _$schema,
            definitions,
            $defs,
            ...itemSchema
          } = jsonSchema2;
          return {
            type: "json",
            schema: {
              $schema: "http://json-schema.org/draft-07/schema#",
              ...definitions != null && { definitions },
              ...$defs != null && { $defs },
              type: "object",
              properties: {
                elements: {
                  type: "array",
                  items: itemSchema,
                  ...minItems != null && { minItems },
                  ...maxItems != null && { maxItems }
                }
              },
              required: ["elements"],
              additionalProperties: false
            },
            ...name25 != null && { name: name25 },
            ...description != null && { description }
          };
        }),
        async parseCompleteOutput({ text: text2 }, context) {
          const parseResult = await safeParseJSON({ text: text2 });
          if (!parseResult.success) {
            throw new NoObjectGeneratedError({
              message: "No object generated: could not parse the response.",
              cause: parseResult.error,
              text: text2,
              response: context.response,
              usage: context.usage,
              finishReason: context.finishReason
            });
          }
          const outerValue = parseResult.value;
          if (outerValue == null || typeof outerValue !== "object" || !("elements" in outerValue) || !Array.isArray(outerValue.elements)) {
            throw new NoObjectGeneratedError({
              message: "No object generated: response did not match schema.",
              cause: new TypeValidationError({
                value: outerValue,
                cause: "response must be an object with an elements array"
              }),
              text: text2,
              response: context.response,
              usage: context.usage,
              finishReason: context.finishReason
            });
          }
          const lengthValidationError = getArrayLengthValidationError({
            value: outerValue.elements,
            minItems,
            maxItems
          });
          if (lengthValidationError != null) {
            throw new NoObjectGeneratedError({
              message: "No object generated: response did not match schema.",
              cause: lengthValidationError,
              text: text2,
              response: context.response,
              usage: context.usage,
              finishReason: context.finishReason
            });
          }
          const validatedElements = [];
          for (const element of outerValue.elements) {
            const validationResult = await safeValidateTypes({
              value: element,
              schema: elementSchema
            });
            if (!validationResult.success) {
              throw new NoObjectGeneratedError({
                message: "No object generated: response did not match schema.",
                cause: validationResult.error,
                text: text2,
                response: context.response,
                usage: context.usage,
                finishReason: context.finishReason
              });
            }
            validatedElements.push(validationResult.value);
          }
          return validatedElements;
        },
        async parsePartialOutput({ text: text2 }) {
          const result = await parsePartialJson(text2);
          switch (result.state) {
            case "failed-parse":
            case "undefined-input": {
              return void 0;
            }
            case "repaired-parse":
            case "successful-parse": {
              const outerValue = result.value;
              if (outerValue == null || typeof outerValue !== "object" || !("elements" in outerValue) || !Array.isArray(outerValue.elements)) {
                return void 0;
              }
              const rawElements = result.state === "repaired-parse" && outerValue.elements.length > 0 ? outerValue.elements.slice(0, -1) : outerValue.elements;
              const parsedElements = [];
              for (const rawElement of rawElements) {
                const validationResult = await safeValidateTypes({
                  value: rawElement,
                  schema: elementSchema
                });
                if (validationResult.success) {
                  parsedElements.push(validationResult.value);
                }
              }
              return { partial: parsedElements };
            }
          }
        },
        createElementStreamTransform() {
          let publishedElements = 0;
          return new TransformStream({
            transform({ partialOutput }, controller) {
              if (partialOutput != null) {
                for (; publishedElements < partialOutput.length; publishedElements++) {
                  if (maxItems != null && publishedElements >= maxItems) {
                    controller.error(
                      getArrayLengthValidationError({
                        value: partialOutput,
                        maxItems
                      })
                    );
                    return;
                  }
                  controller.enqueue(partialOutput[publishedElements]);
                }
              }
            }
          });
        }
      };
    }, "array2");
    __name(validateArrayBound, "validateArrayBound");
    __name(getArrayLengthValidationError, "getArrayLengthValidationError");
    choice = /* @__PURE__ */ __name(({
      options: choiceOptions,
      name: name25,
      description
    }) => {
      return {
        name: "choice",
        // JSON schema that describes an enumeration:
        responseFormat: Promise.resolve({
          type: "json",
          schema: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              result: { type: "string", enum: choiceOptions }
            },
            required: ["result"],
            additionalProperties: false
          },
          ...name25 != null && { name: name25 },
          ...description != null && { description }
        }),
        async parseCompleteOutput({ text: text2 }, context) {
          const parseResult = await safeParseJSON({ text: text2 });
          if (!parseResult.success) {
            throw new NoObjectGeneratedError({
              message: "No object generated: could not parse the response.",
              cause: parseResult.error,
              text: text2,
              response: context.response,
              usage: context.usage,
              finishReason: context.finishReason
            });
          }
          const outerValue = parseResult.value;
          if (outerValue == null || typeof outerValue !== "object" || !("result" in outerValue) || typeof outerValue.result !== "string" || !choiceOptions.includes(outerValue.result)) {
            throw new NoObjectGeneratedError({
              message: "No object generated: response did not match schema.",
              cause: new TypeValidationError({
                value: outerValue,
                cause: "response must be an object that contains a choice value."
              }),
              text: text2,
              response: context.response,
              usage: context.usage,
              finishReason: context.finishReason
            });
          }
          return outerValue.result;
        },
        async parsePartialOutput({ text: text2 }) {
          const result = await parsePartialJson(text2);
          switch (result.state) {
            case "failed-parse":
            case "undefined-input": {
              return void 0;
            }
            case "repaired-parse":
            case "successful-parse": {
              const outerValue = result.value;
              if (outerValue == null || typeof outerValue !== "object" || !("result" in outerValue) || typeof outerValue.result !== "string") {
                return void 0;
              }
              const potentialMatches = choiceOptions.filter(
                (choiceOption) => choiceOption.startsWith(outerValue.result)
              );
              if (result.state === "successful-parse") {
                return potentialMatches.includes(outerValue.result) ? { partial: outerValue.result } : void 0;
              } else {
                return potentialMatches.length === 1 ? { partial: potentialMatches[0] } : void 0;
              }
            }
          }
        },
        createElementStreamTransform() {
          return void 0;
        }
      };
    }, "choice");
    json2 = /* @__PURE__ */ __name(({
      name: name25,
      description
    } = {}) => {
      return {
        name: "json",
        responseFormat: Promise.resolve({
          type: "json",
          ...name25 != null && { name: name25 },
          ...description != null && { description }
        }),
        async parseCompleteOutput({ text: text2 }, context) {
          const parseResult = await safeParseJSON({ text: text2 });
          if (!parseResult.success) {
            throw new NoObjectGeneratedError({
              message: "No object generated: could not parse the response.",
              cause: parseResult.error,
              text: text2,
              response: context.response,
              usage: context.usage,
              finishReason: context.finishReason
            });
          }
          return parseResult.value;
        },
        async parsePartialOutput({ text: text2 }) {
          const result = await parsePartialJson(text2);
          switch (result.state) {
            case "failed-parse":
            case "undefined-input": {
              return void 0;
            }
            case "repaired-parse":
            case "successful-parse": {
              return result.value === void 0 ? void 0 : { partial: result.value };
            }
          }
        },
        createElementStreamTransform() {
          return void 0;
        }
      };
    }, "json");
    encoder = new TextEncoder();
    encoder2 = new TextEncoder();
    originalGenerateId = createIdGenerator({
      prefix: "aitxt",
      size: 24
    });
    originalGenerateCallId = createIdGenerator({
      prefix: "call",
      size: 24
    });
    JsonToSseTransformStream = class extends TransformStream {
      static {
        __name(this, "JsonToSseTransformStream");
      }
      constructor() {
        super({
          transform(part, controller) {
            controller.enqueue(`data: ${JSON.stringify(part)}

`);
          },
          flush(controller) {
            controller.enqueue("data: [DONE]\n\n");
          }
        });
      }
    };
    toolMetadataSchema = z2.record(
      z2.string(),
      jsonValueSchema.optional()
    );
    uiMessageChunkSchema = lazySchema(
      () => zodSchema(
        z2.union([
          z2.looseObject({
            type: z2.literal("text-start"),
            id: z2.string(),
            providerMetadata: providerMetadataSchema.optional()
          }),
          z2.looseObject({
            type: z2.literal("text-delta"),
            id: z2.string(),
            delta: z2.string(),
            providerMetadata: providerMetadataSchema.optional()
          }),
          z2.looseObject({
            type: z2.literal("text-end"),
            id: z2.string(),
            providerMetadata: providerMetadataSchema.optional()
          }),
          z2.looseObject({
            type: z2.literal("error"),
            errorText: z2.string()
          }),
          z2.looseObject({
            type: z2.literal("tool-input-start"),
            toolCallId: z2.string(),
            toolName: z2.string(),
            providerExecuted: z2.boolean().optional(),
            providerMetadata: providerMetadataSchema.optional(),
            toolMetadata: toolMetadataSchema.optional(),
            dynamic: z2.boolean().optional(),
            title: z2.string().optional()
          }),
          z2.looseObject({
            type: z2.literal("tool-input-delta"),
            toolCallId: z2.string(),
            inputTextDelta: z2.string()
          }),
          z2.looseObject({
            type: z2.literal("tool-input-available"),
            toolCallId: z2.string(),
            toolName: z2.string(),
            input: z2.unknown(),
            providerExecuted: z2.boolean().optional(),
            providerMetadata: providerMetadataSchema.optional(),
            toolMetadata: toolMetadataSchema.optional(),
            dynamic: z2.boolean().optional(),
            title: z2.string().optional()
          }),
          z2.looseObject({
            type: z2.literal("tool-input-error"),
            toolCallId: z2.string(),
            toolName: z2.string(),
            input: z2.unknown(),
            providerExecuted: z2.boolean().optional(),
            providerMetadata: providerMetadataSchema.optional(),
            toolMetadata: toolMetadataSchema.optional(),
            dynamic: z2.boolean().optional(),
            errorText: z2.string(),
            title: z2.string().optional()
          }),
          z2.looseObject({
            type: z2.literal("tool-approval-request"),
            approvalId: z2.string(),
            toolCallId: z2.string(),
            approvalDescriptor: z2.unknown().optional(),
            reason: z2.string().optional(),
            isAutomatic: z2.boolean().optional(),
            signature: z2.string().optional()
          }),
          z2.looseObject({
            type: z2.literal("tool-approval-response"),
            approvalId: z2.string(),
            approved: z2.boolean(),
            reason: z2.string().optional(),
            providerExecuted: z2.boolean().optional(),
            providerMetadata: providerMetadataSchema.optional()
          }),
          z2.looseObject({
            type: z2.literal("tool-output-available"),
            toolCallId: z2.string(),
            output: z2.unknown(),
            providerExecuted: z2.boolean().optional(),
            providerMetadata: providerMetadataSchema.optional(),
            toolMetadata: toolMetadataSchema.optional(),
            dynamic: z2.boolean().optional(),
            preliminary: z2.boolean().optional()
          }),
          z2.looseObject({
            type: z2.literal("tool-output-error"),
            toolCallId: z2.string(),
            errorText: z2.string(),
            providerExecuted: z2.boolean().optional(),
            providerMetadata: providerMetadataSchema.optional(),
            toolMetadata: toolMetadataSchema.optional(),
            dynamic: z2.boolean().optional()
          }),
          z2.looseObject({
            type: z2.literal("tool-output-denied"),
            toolCallId: z2.string()
          }),
          z2.looseObject({
            type: z2.literal("reasoning-start"),
            id: z2.string(),
            providerMetadata: providerMetadataSchema.optional()
          }),
          z2.looseObject({
            type: z2.literal("reasoning-delta"),
            id: z2.string(),
            delta: z2.string(),
            providerMetadata: providerMetadataSchema.optional()
          }),
          z2.looseObject({
            type: z2.literal("reasoning-end"),
            id: z2.string(),
            providerMetadata: providerMetadataSchema.optional()
          }),
          z2.looseObject({
            type: z2.literal("custom"),
            kind: z2.string().transform((value) => value),
            providerMetadata: providerMetadataSchema.optional()
          }),
          z2.looseObject({
            type: z2.literal("source-url"),
            sourceId: z2.string(),
            url: z2.string(),
            title: z2.string().optional(),
            providerMetadata: providerMetadataSchema.optional()
          }),
          z2.looseObject({
            type: z2.literal("source-document"),
            sourceId: z2.string(),
            mediaType: z2.string(),
            title: z2.string(),
            filename: z2.string().optional(),
            providerMetadata: providerMetadataSchema.optional()
          }),
          z2.looseObject({
            type: z2.literal("file"),
            url: z2.string(),
            mediaType: z2.string(),
            providerMetadata: providerMetadataSchema.optional()
          }),
          z2.looseObject({
            type: z2.literal("reasoning-file"),
            url: z2.string(),
            mediaType: z2.string(),
            providerMetadata: providerMetadataSchema.optional()
          }),
          z2.looseObject({
            type: z2.custom(
              (value) => typeof value === "string" && value.startsWith("data-"),
              { message: 'Type must start with "data-"' }
            ),
            id: z2.string().optional(),
            data: z2.unknown(),
            transient: z2.boolean().optional()
          }),
          z2.looseObject({
            type: z2.literal("start-step")
          }),
          z2.looseObject({
            type: z2.literal("finish-step")
          }),
          z2.looseObject({
            type: z2.literal("reset-step")
          }),
          z2.looseObject({
            type: z2.literal("start"),
            messageId: z2.string().optional(),
            messageMetadata: z2.unknown().optional()
          }),
          z2.looseObject({
            type: z2.literal("finish"),
            finishReason: z2.enum([
              "stop",
              "length",
              "content-filter",
              "tool-calls",
              "error",
              "other"
            ]).optional(),
            messageMetadata: z2.unknown().optional()
          }),
          z2.looseObject({
            type: z2.literal("abort"),
            reason: z2.string().optional()
          }),
          z2.looseObject({
            type: z2.literal("message-metadata"),
            messageMetadata: z2.unknown()
          })
        ])
      )
    );
    originalGenerateId2 = createIdGenerator({
      prefix: "aitxt",
      size: 24
    });
    originalGenerateCallId2 = createIdGenerator({
      prefix: "call",
      size: 24
    });
    originalGenerateId3 = createIdGenerator({
      prefix: "aitxt",
      size: 24
    });
    originalGenerateCallId3 = createIdGenerator({
      prefix: "call",
      size: 24
    });
    toolMetadataSchema2 = z2.record(
      z2.string(),
      jsonValueSchema.optional()
    );
    providerReferenceSchema2 = z2.record(z2.string(), z2.string());
    uiMessagesSchema = lazySchema(
      () => zodSchema(
        z2.array(
          z2.object({
            id: z2.string(),
            role: z2.enum(["system", "user", "assistant"]),
            metadata: z2.unknown().optional(),
            parts: z2.array(
              z2.union([
                z2.object({
                  type: z2.literal("text"),
                  text: z2.string(),
                  state: z2.enum(["streaming", "done"]).optional(),
                  providerMetadata: providerMetadataSchema.optional()
                }),
                z2.object({
                  type: z2.literal("reasoning"),
                  id: z2.string().optional(),
                  text: z2.string(),
                  state: z2.enum(["streaming", "done"]).optional(),
                  providerMetadata: providerMetadataSchema.optional()
                }),
                z2.object({
                  type: z2.literal("custom"),
                  kind: z2.string(),
                  providerMetadata: providerMetadataSchema.optional()
                }),
                z2.object({
                  type: z2.literal("source-url"),
                  sourceId: z2.string(),
                  url: z2.string(),
                  title: z2.string().optional(),
                  providerMetadata: providerMetadataSchema.optional()
                }),
                z2.object({
                  type: z2.literal("source-document"),
                  sourceId: z2.string(),
                  mediaType: z2.string(),
                  title: z2.string(),
                  filename: z2.string().optional(),
                  providerMetadata: providerMetadataSchema.optional()
                }),
                z2.object({
                  type: z2.literal("file"),
                  mediaType: z2.string(),
                  filename: z2.string().optional(),
                  url: z2.string(),
                  providerReference: providerReferenceSchema2.optional(),
                  providerMetadata: providerMetadataSchema.optional()
                }),
                z2.object({
                  type: z2.literal("reasoning-file"),
                  mediaType: z2.string(),
                  url: z2.string(),
                  providerMetadata: providerMetadataSchema.optional()
                }),
                z2.object({
                  type: z2.literal("step-start")
                }),
                z2.object({
                  type: z2.string().startsWith("data-"),
                  id: z2.string().optional(),
                  data: z2.unknown()
                }),
                z2.object({
                  type: z2.literal("dynamic-tool"),
                  toolName: z2.string(),
                  toolCallId: z2.string(),
                  title: z2.string().optional(),
                  toolMetadata: toolMetadataSchema2.optional(),
                  state: z2.literal("input-streaming"),
                  input: z2.unknown().optional(),
                  providerExecuted: z2.boolean().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  output: z2.never().optional(),
                  errorText: z2.never().optional(),
                  approval: z2.never().optional()
                }),
                z2.object({
                  type: z2.literal("dynamic-tool"),
                  toolName: z2.string(),
                  toolCallId: z2.string(),
                  title: z2.string().optional(),
                  toolMetadata: toolMetadataSchema2.optional(),
                  state: z2.literal("input-available"),
                  input: z2.unknown(),
                  providerExecuted: z2.boolean().optional(),
                  output: z2.never().optional(),
                  errorText: z2.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  approval: z2.never().optional()
                }),
                z2.object({
                  type: z2.literal("dynamic-tool"),
                  toolName: z2.string(),
                  toolCallId: z2.string(),
                  title: z2.string().optional(),
                  toolMetadata: toolMetadataSchema2.optional(),
                  state: z2.literal("approval-requested"),
                  input: z2.unknown(),
                  providerExecuted: z2.boolean().optional(),
                  output: z2.never().optional(),
                  errorText: z2.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  approval: z2.object({
                    id: z2.string(),
                    approved: z2.never().optional(),
                    descriptor: z2.unknown().optional(),
                    requestReason: z2.string().optional(),
                    reason: z2.never().optional(),
                    isAutomatic: z2.boolean().optional(),
                    signature: z2.string().optional()
                  })
                }),
                z2.object({
                  type: z2.literal("dynamic-tool"),
                  toolName: z2.string(),
                  toolCallId: z2.string(),
                  title: z2.string().optional(),
                  toolMetadata: toolMetadataSchema2.optional(),
                  state: z2.literal("approval-responded"),
                  input: z2.unknown(),
                  providerExecuted: z2.boolean().optional(),
                  output: z2.never().optional(),
                  errorText: z2.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  approval: z2.object({
                    id: z2.string(),
                    approved: z2.boolean(),
                    descriptor: z2.unknown().optional(),
                    requestReason: z2.string().optional(),
                    reason: z2.string().optional(),
                    isAutomatic: z2.boolean().optional(),
                    signature: z2.string().optional()
                  })
                }),
                z2.object({
                  type: z2.literal("dynamic-tool"),
                  toolName: z2.string(),
                  toolCallId: z2.string(),
                  title: z2.string().optional(),
                  toolMetadata: toolMetadataSchema2.optional(),
                  state: z2.literal("output-available"),
                  input: z2.unknown(),
                  providerExecuted: z2.boolean().optional(),
                  output: z2.unknown(),
                  errorText: z2.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  resultProviderMetadata: providerMetadataSchema.optional(),
                  preliminary: z2.boolean().optional(),
                  approval: z2.object({
                    id: z2.string(),
                    approved: z2.literal(true),
                    descriptor: z2.unknown().optional(),
                    requestReason: z2.string().optional(),
                    reason: z2.string().optional(),
                    isAutomatic: z2.boolean().optional(),
                    signature: z2.string().optional()
                  }).optional()
                }),
                z2.object({
                  type: z2.literal("dynamic-tool"),
                  toolName: z2.string(),
                  toolCallId: z2.string(),
                  title: z2.string().optional(),
                  toolMetadata: toolMetadataSchema2.optional(),
                  state: z2.literal("output-error"),
                  input: z2.unknown().optional(),
                  rawInput: z2.unknown().optional(),
                  providerExecuted: z2.boolean().optional(),
                  output: z2.never().optional(),
                  errorText: z2.string(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  resultProviderMetadata: providerMetadataSchema.optional(),
                  approval: z2.object({
                    id: z2.string(),
                    approved: z2.literal(true),
                    descriptor: z2.unknown().optional(),
                    requestReason: z2.string().optional(),
                    reason: z2.string().optional(),
                    isAutomatic: z2.boolean().optional(),
                    signature: z2.string().optional()
                  }).optional()
                }),
                z2.object({
                  type: z2.literal("dynamic-tool"),
                  toolName: z2.string(),
                  toolCallId: z2.string(),
                  title: z2.string().optional(),
                  toolMetadata: toolMetadataSchema2.optional(),
                  state: z2.literal("output-denied"),
                  input: z2.unknown(),
                  providerExecuted: z2.boolean().optional(),
                  output: z2.never().optional(),
                  errorText: z2.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  approval: z2.object({
                    id: z2.string(),
                    approved: z2.literal(false),
                    descriptor: z2.unknown().optional(),
                    requestReason: z2.string().optional(),
                    reason: z2.string().optional(),
                    isAutomatic: z2.boolean().optional(),
                    signature: z2.string().optional()
                  })
                }),
                z2.object({
                  type: z2.string().startsWith("tool-"),
                  toolCallId: z2.string(),
                  title: z2.string().optional(),
                  toolMetadata: toolMetadataSchema2.optional(),
                  state: z2.literal("input-streaming"),
                  providerExecuted: z2.boolean().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  input: z2.unknown().optional(),
                  output: z2.never().optional(),
                  errorText: z2.never().optional(),
                  approval: z2.never().optional()
                }),
                z2.object({
                  type: z2.string().startsWith("tool-"),
                  toolCallId: z2.string(),
                  title: z2.string().optional(),
                  toolMetadata: toolMetadataSchema2.optional(),
                  state: z2.literal("input-available"),
                  providerExecuted: z2.boolean().optional(),
                  input: z2.unknown(),
                  output: z2.never().optional(),
                  errorText: z2.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  approval: z2.never().optional()
                }),
                z2.object({
                  type: z2.string().startsWith("tool-"),
                  toolCallId: z2.string(),
                  title: z2.string().optional(),
                  toolMetadata: toolMetadataSchema2.optional(),
                  state: z2.literal("approval-requested"),
                  input: z2.unknown(),
                  providerExecuted: z2.boolean().optional(),
                  output: z2.never().optional(),
                  errorText: z2.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  approval: z2.object({
                    id: z2.string(),
                    approved: z2.never().optional(),
                    descriptor: z2.unknown().optional(),
                    requestReason: z2.string().optional(),
                    reason: z2.never().optional(),
                    isAutomatic: z2.boolean().optional(),
                    signature: z2.string().optional()
                  })
                }),
                z2.object({
                  type: z2.string().startsWith("tool-"),
                  toolCallId: z2.string(),
                  title: z2.string().optional(),
                  toolMetadata: toolMetadataSchema2.optional(),
                  state: z2.literal("approval-responded"),
                  input: z2.unknown(),
                  providerExecuted: z2.boolean().optional(),
                  output: z2.never().optional(),
                  errorText: z2.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  approval: z2.object({
                    id: z2.string(),
                    approved: z2.boolean(),
                    descriptor: z2.unknown().optional(),
                    requestReason: z2.string().optional(),
                    reason: z2.string().optional(),
                    isAutomatic: z2.boolean().optional(),
                    signature: z2.string().optional()
                  })
                }),
                z2.object({
                  type: z2.string().startsWith("tool-"),
                  toolCallId: z2.string(),
                  title: z2.string().optional(),
                  toolMetadata: toolMetadataSchema2.optional(),
                  state: z2.literal("output-available"),
                  providerExecuted: z2.boolean().optional(),
                  input: z2.unknown(),
                  output: z2.unknown(),
                  errorText: z2.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  resultProviderMetadata: providerMetadataSchema.optional(),
                  preliminary: z2.boolean().optional(),
                  approval: z2.object({
                    id: z2.string(),
                    approved: z2.literal(true),
                    descriptor: z2.unknown().optional(),
                    requestReason: z2.string().optional(),
                    reason: z2.string().optional(),
                    isAutomatic: z2.boolean().optional(),
                    signature: z2.string().optional()
                  }).optional()
                }),
                z2.object({
                  type: z2.string().startsWith("tool-"),
                  toolCallId: z2.string(),
                  title: z2.string().optional(),
                  toolMetadata: toolMetadataSchema2.optional(),
                  state: z2.literal("output-error"),
                  providerExecuted: z2.boolean().optional(),
                  input: z2.unknown().optional(),
                  rawInput: z2.unknown().optional(),
                  output: z2.never().optional(),
                  errorText: z2.string(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  resultProviderMetadata: providerMetadataSchema.optional(),
                  approval: z2.object({
                    id: z2.string(),
                    approved: z2.literal(true),
                    descriptor: z2.unknown().optional(),
                    requestReason: z2.string().optional(),
                    reason: z2.string().optional(),
                    isAutomatic: z2.boolean().optional(),
                    signature: z2.string().optional()
                  }).optional()
                }),
                z2.object({
                  type: z2.string().startsWith("tool-"),
                  toolCallId: z2.string(),
                  title: z2.string().optional(),
                  toolMetadata: toolMetadataSchema2.optional(),
                  state: z2.literal("output-denied"),
                  providerExecuted: z2.boolean().optional(),
                  input: z2.unknown(),
                  output: z2.never().optional(),
                  errorText: z2.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  approval: z2.object({
                    id: z2.string(),
                    approved: z2.literal(false),
                    descriptor: z2.unknown().optional(),
                    requestReason: z2.string().optional(),
                    reason: z2.string().optional(),
                    isAutomatic: z2.boolean().optional(),
                    signature: z2.string().optional()
                  })
                })
              ])
            )
          }).superRefine((message, context) => {
            if (message.role !== "assistant" && message.parts.length === 0) {
              context.addIssue({
                origin: "array",
                code: "too_small",
                minimum: 1,
                inclusive: true,
                input: message.parts,
                path: ["parts"],
                message: "Message must contain at least one part"
              });
            }
          })
        ).nonempty("Messages array must not be empty")
      )
    );
    originalGenerateCallId4 = createIdGenerator({
      prefix: "call",
      size: 24
    });
    originalGenerateCallId5 = createIdGenerator({
      prefix: "call",
      size: 24
    });
    textEncoder = new TextEncoder();
    tolerance = 1e-6;
    __name(isRecord2, "isRecord");
    __name(isJSON, "isJSON");
    __name(isInput, "isInput");
    __name(invalidInput, "invalidInput");
    __name(validateEvaluationInput, "validateEvaluationInput");
    __name(invalidAnswer, "invalidAnswer");
    __name(isProbability, "isProbability");
    __name(hasExactKeys, "hasExactKeys");
    __name(validateDistribution, "validateDistribution");
    __name(validateEvaluationAnswers, "validateEvaluationAnswers");
    __name(evaluate, "evaluate");
    originalGenerateId4 = createIdGenerator({ prefix: "aiobj", size: 24 });
    __name(createDownload, "createDownload");
    ({ atob: atob22 } = globalThis);
    originalGenerateId5 = createIdGenerator({ prefix: "aiobj", size: 24 });
    defaultDownload = createDownload();
    REALTIME_MAX_FRAME_BYTES = 128 * 1024;
    REALTIME_MAX_BUFFERED_BYTES = 128 * 1024;
    MAX_SESSION_ANSWER_BYTES = 1024 * 1024;
    setupSchema = z2.object({
      token: z2.string().refine((value) => value.trim().length > 0),
      url: z2.string().refine((value) => {
        try {
          const url = new URL(value);
          return (url.protocol === "ws:" || url.protocol === "wss:") && url.hostname !== "";
        } catch (e) {
          return false;
        }
      }),
      expiresAt: z2.number().positive().max(Number.MAX_SAFE_INTEGER).optional(),
      tools: z2.array(
        z2.object({
          type: z2.literal("function"),
          name: z2.string().min(1),
          description: z2.string().optional(),
          parameters: z2.record(z2.string(), z2.unknown())
        })
      ).optional()
    });
    name242 = "AI_NoSuchProviderError";
    marker242 = `vercel.ai.error.${name242}`;
    symbol242 = Symbol.for(marker242);
    NoSuchProviderError = class extends (_b242 = NoSuchModelError, _a242 = symbol242, _b242) {
      static {
        __name(this, "NoSuchProviderError");
      }
      constructor({
        modelId,
        modelType,
        providerId,
        availableProviders,
        message = `No such provider: ${providerId} (available providers: ${availableProviders.join()})`
      }) {
        super({ errorName: name242, modelId, modelType, message });
        this[_a242] = true;
        this.providerId = providerId;
        this.availableProviders = availableProviders;
      }
      static isInstance(error2) {
        return AISDKError.hasMarker(error2, marker242);
      }
    };
    originalGenerateCallId6 = createIdGenerator({
      prefix: "call",
      size: 24
    });
    defaultDownload2 = createDownload();
  }
});

// node_modules/@ai-sdk/typesafe-ai/dist/index.js
function createTypeSafeAi(options = {}) {
  var _a25;
  const baseURL = (_a25 = withoutTrailingSlash(options.baseURL)) != null ? _a25 : "https://api.typesafe.ai/v1";
  const headers = /* @__PURE__ */ __name(() => withUserAgentSuffix(
    {
      Authorization: `Bearer ${loadApiKey({ apiKey: options.apiKey, environmentVariableName: "TYPESAFE_AI_API_KEY", description: "TypeSafe" })}`,
      ...options.headers
    },
    `ai-sdk/typesafe-ai/${VERSION4}`
  ), "headers");
  return {
    specificationVersion: "v4",
    evaluationModel: /* @__PURE__ */ __name((modelId) => new EvaluationTypeSafeAiModel(modelId, {
      provider: "typesafe.evaluation",
      baseURL,
      headers,
      fetch: options.fetch
    }), "evaluationModel"),
    languageModel: /* @__PURE__ */ __name((modelId) => {
      throw new NoSuchModelError({ modelId, modelType: "languageModel" });
    }, "languageModel"),
    embeddingModel: /* @__PURE__ */ __name((modelId) => {
      throw new NoSuchModelError({ modelId, modelType: "embeddingModel" });
    }, "embeddingModel"),
    imageModel: /* @__PURE__ */ __name((modelId) => {
      throw new NoSuchModelError({ modelId, modelType: "imageModel" });
    }, "imageModel")
  };
}
var typesafeEvaluationResponseSchema, typesafeFailedResponseHandler, VERSION4, EvaluationTypeSafeAiModel, typeSafeAi;
var init_dist7 = __esm({
  "node_modules/@ai-sdk/typesafe-ai/dist/index.js"() {
    init_dist();
    init_dist4();
    init_dist();
    init_dist4();
    init_dist4();
    init_v4();
    typesafeEvaluationResponseSchema = object({
      model: string2().nullish(),
      answers: record(
        string2(),
        discriminatedUnion("type", [
          object({
            type: literal("choice"),
            choice: string2(),
            probabilities: record(string2(), number2()),
            confidence: number2().nullish()
          }),
          object({
            type: literal("score"),
            score: number2(),
            probabilities: record(string2(), number2()),
            confidence: number2().nullish()
          }),
          object({ type: literal("noul"), noul: number2() })
        ])
      ),
      usage: object({
        input_tokens: number2().nullish(),
        output_tokens: number2().nullish()
      }).nullish()
    });
    typesafeFailedResponseHandler = createJsonErrorResponseHandler({
      errorSchema: object({
        message: string2().nullish(),
        detail: unknown().nullish(),
        error: union([string2(), object({ message: string2().nullish() })]).nullish()
      }),
      errorToMessage: /* @__PURE__ */ __name((error2) => {
        var _a25, _b25, _c, _d;
        return (_d = (_c = (_b25 = error2.message) != null ? _b25 : typeof error2.error === "string" ? error2.error : (_a25 = error2.error) == null ? void 0 : _a25.message) != null ? _c : typeof error2.detail === "string" ? error2.detail : JSON.stringify(error2.detail)) != null ? _d : "TypeSafe request failed";
      }, "errorToMessage")
    });
    VERSION4 = true ? "3.0.0" : "0.0.0-test";
    EvaluationTypeSafeAiModel = class _EvaluationTypeSafeAiModel {
      static {
        __name(this, "_EvaluationTypeSafeAiModel");
      }
      constructor(modelId, config2) {
        this.modelId = modelId;
        this.config = config2;
        this.specificationVersion = "v4";
        this.supportedQuestionTypes = ["choice", "score", "boolean"];
      }
      get provider() {
        return this.config.provider;
      }
      static [WORKFLOW_SERIALIZE](model) {
        return serializeModelOptions({
          modelId: model.modelId,
          config: model.config
        });
      }
      static [WORKFLOW_DESERIALIZE](options) {
        return new _EvaluationTypeSafeAiModel(options.modelId, options.config);
      }
      async doEvaluate({
        state,
        questions,
        headers,
        abortSignal,
        providerOptions
      }) {
        var _a25, _b25, _c, _d, _e, _f;
        for (const [id, question] of Object.entries(questions)) {
          if (question.type === "choice" && Object.keys(question.criteria).length > 255) {
            throw new InvalidArgumentError({
              argument: `questions.${id}.criteria`,
              message: "TypeSafe Choice questions support at most 255 options."
            });
          }
          if (question.type === "score" && question.criteria.length > 10) {
            throw new InvalidArgumentError({
              argument: `questions.${id}.criteria`,
              message: "TypeSafe Score questions support at most 10 levels."
            });
          }
        }
        const warnings = Object.keys(
          (_a25 = providerOptions == null ? void 0 : providerOptions.typesafe) != null ? _a25 : {}
        ).map((option) => ({
          type: "unsupported",
          feature: `providerOptions.typesafe.${option}`
        }));
        const modelHeaders = this.config.headers === void 0 ? withUserAgentSuffix(
          {
            Authorization: `Bearer ${loadApiKey({ apiKey: void 0, environmentVariableName: "TYPESAFE_AI_API_KEY", description: "TypeSafe" })}`
          },
          `ai-sdk/typesafe-ai/${VERSION4}`
        ) : await resolve(this.config.headers);
        const {
          value: response,
          rawValue,
          responseHeaders
        } = await postJsonToApi({
          url: `${this.config.baseURL}/systemone`,
          headers: combineHeaders(modelHeaders, headers),
          body: {
            model: this.modelId,
            state,
            questions: Object.fromEntries(
              Object.entries(questions).map(([id, question]) => [
                id,
                question.type === "boolean" ? { ...question, type: "noul" } : question
              ])
            )
          },
          abortSignal,
          fetch: this.config.fetch,
          failedResponseHandler: typesafeFailedResponseHandler,
          successfulResponseHandler: createJsonResponseHandler(
            typesafeEvaluationResponseSchema
          )
        });
        const confidence = Object.fromEntries(
          Object.entries(response.answers).flatMap(
            ([id, answer]) => answer.type !== "noul" && answer.confidence != null ? [[id, answer.confidence]] : []
          )
        );
        return {
          answers: Object.fromEntries(
            Object.entries(response.answers).map(
              ([id, answer]) => {
                switch (answer.type) {
                  case "noul":
                    return [id, { type: "boolean", probability: answer.noul }];
                  case "choice":
                    return [
                      id,
                      {
                        type: "choice",
                        choice: answer.choice,
                        probabilities: answer.probabilities
                      }
                    ];
                  case "score":
                    return [
                      id,
                      {
                        type: "score",
                        score: answer.score,
                        probabilities: answer.probabilities
                      }
                    ];
                }
              }
            )
          ),
          usage: {
            inputTokens: (_c = (_b25 = response.usage) == null ? void 0 : _b25.input_tokens) != null ? _c : void 0,
            outputTokens: (_e = (_d = response.usage) == null ? void 0 : _d.output_tokens) != null ? _e : void 0
          },
          // The API rounds displayed probabilities and scores to two decimal places.
          rounding: { probabilityDecimals: 2, scoreDecimals: 2 },
          warnings,
          providerMetadata: { typesafe: { confidence } },
          response: {
            modelId: (_f = response.model) != null ? _f : this.modelId,
            headers: responseHeaders,
            body: rawValue
          }
        };
      }
    };
    __name(createTypeSafeAi, "createTypeSafeAi");
    typeSafeAi = createTypeSafeAi();
  }
});

// src/gold/sleep.ts
function sleep(ms) {
  const sched = globalThis.scheduler;
  if (typeof sched?.wait === "function") return sched.wait(ms);
  const bun = globalThis.Bun;
  if (typeof bun?.sleep === "function") return bun.sleep(ms);
  return new Promise((resolve2) => {
    setTimeout(resolve2, ms);
  });
}
var init_sleep = __esm({
  "src/gold/sleep.ts"() {
    "use strict";
    __name(sleep, "sleep");
  }
});

// src/gold/model-mock.ts
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

// src/gold/model.ts
var model_exports = {};
__export(model_exports, {
  GOLD_QUESTIONS: () => GOLD_QUESTIONS,
  GoldJevModel: () => GoldJevModel,
  GoldMockModel: () => GoldMockModel,
  createGoldModel: () => createGoldModel,
  goldDecisionFromEvaluate: () => goldDecisionFromEvaluate,
  goldModelKind: () => goldModelKind
});
function goldDecisionFromEvaluate(choice2, probabilities, latencyMs, inputTokens) {
  const p = probabilities ?? { buy: 0, sell: 0, [choice2]: 1 };
  const buy = p.buy ?? 0;
  const sell = p.sell ?? 0;
  const action = choice2 === "sell" ? "sell" : choice2 === "hold" ? "hold" : "buy";
  return {
    action,
    probabilities: { buy, sell, hold: action === "hold" ? 1 : 0 },
    latencyMs,
    inputTokens
  };
}
function goldModelKind(env2 = process.env) {
  const raw = env2.GOLD_MODEL ?? env2.MODEL ?? goldConfig.model;
  return raw === "jev" ? "jev" : "mock";
}
var GOLD_QUESTIONS, GoldJevModel, createGoldModel;
var init_model = __esm({
  "src/gold/model.ts"() {
    "use strict";
    init_dist6();
    init_dist7();
    init_config();
    init_model_mock();
    GOLD_QUESTIONS = {
      direction: {
        type: "choice",
        instructions: {
          question: "Will XAUUSD print a small move higher or lower than the current mid within `horizonMs` milliseconds?",
          goal: "Scalp XAUUSD gold vs USD on a forex broker. Take lots of small in and out buys and sells. Aim for a short move that beats the spread (`spreadPips`) plus typical commission. Do not hold for a large trend. Ticks arrive continuously. A decision is made about once per `intervalMs`. An opposite signal closes and flips.",
          timing: "The order executes as a market order on the next poll from the leader Expert Advisor, usually within a few hundred milliseconds. Tight stop loss and take profit sit on every fill so the scalp can exit without waiting for a big swing.",
          inputs: "`returnsPips` and `recentMids` show the short path over the scalp horizon. `spreadPips` is the current bid-ask width in pips. `volume` is tick volume on the last print. If `allowed.buy` is false the trade will not buy, and vice versa."
        },
        criteria: {
          buy: "Buy gold now for a small scalp: mid more likely to be a little higher after `horizonMs`, by more than the spread and commission. Do not wait for a large uptrend.",
          sell: "Sell gold now for a small scalp: mid more likely to be a little lower after `horizonMs`, by more than the spread and commission. Do not wait for a large downtrend."
        }
      }
    };
    __name(goldDecisionFromEvaluate, "goldDecisionFromEvaluate");
    GoldJevModel = class {
      static {
        __name(this, "GoldJevModel");
      }
      name = process.env.JEV_MODEL_ID || goldConfig.jevModelId;
      model = typeSafeAi.evaluationModel(this.name);
      async decide(state) {
        const t0 = performance.now();
        const r = await evaluate({ model: this.model, state, questions: GOLD_QUESTIONS, maxRetries: 0 });
        const a = r.answers.direction;
        return goldDecisionFromEvaluate(
          a.choice,
          a.probabilities,
          performance.now() - t0,
          r.usage?.inputTokens ?? 0
        );
      }
    };
    __name(goldModelKind, "goldModelKind");
    createGoldModel = /* @__PURE__ */ __name(() => goldModelKind() === "jev" ? new GoldJevModel() : new GoldMockModel(), "createGoldModel");
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
  "GOLD_MIN_REVERSE_POINTS",
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
async function handleGoldHttp(request, trader, meta2, hub) {
  const { pathname } = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
  if ((pathname === "/status" || pathname === "/api") && request.method === "GET") {
    return json({ ...trader.snapshot(), ...meta2 });
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
    return hub.subscribe(() => ({ ...trader.snapshot(), ...meta2, history: trader.history }));
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
  refreshMs = 1e3;
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
    const { goldConfig: goldConfig2 } = await Promise.resolve().then(() => (init_config(), config_exports));
    const { GoldTrader: GoldTrader2 } = await Promise.resolve().then(() => (init_trader(), trader_exports));
    const { createGoldModel: createGoldModel2 } = await Promise.resolve().then(() => (init_model(), model_exports));
    const model = createGoldModel2();
    const trader = new GoldTrader2(model);
    this.intervalMs = goldConfig2.intervalMs > 0 ? goldConfig2.intervalMs : 1e3;
    this.refreshMs = goldConfig2.spotRefreshMs > 0 ? goldConfig2.spotRefreshMs : 1e3;
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
var GOLD_PAGES = { "/": { "body": '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />\n    <meta name="theme-color" content="#F0EEE9" />\n    <meta name="mobile-web-app-capable" content="yes" />\n    <title>Jev Gold</title>\n    <link rel="stylesheet" href="./demo.css" />\n  </head>\n  <body>\n    <div class="card">\n      <header class="header">\n        <div class="brand-row">\n          <span class="brand">Jev Gold</span>\n          <span class="pair">XAUUSD</span>\n          <span class="seq" id="seq">seq -</span>\n        </div>\n        <span class="offline" id="offline"></span>\n        <div class="pills">\n          <span class="pill" id="feed">live</span>\n          <span class="badge jev" id="model">jev-latest</span>\n        </div>\n      </header>\n\n      <section class="pnl-band" id="pnlBand">\n        <div class="pnl-label">\n          <span class="section-label">DUMMY MT5 P AND L</span>\n          <span class="sim-tag">simulated</span>\n        </div>\n        <div class="pnl-grid">\n          <div class="pnl-card">\n            <div class="pnl-k">REALIZED</div>\n            <div class="pnl-v" id="pnlRealized">$0.00</div>\n          </div>\n          <div class="pnl-card">\n            <div class="pnl-k">OPEN</div>\n            <div class="pnl-v" id="pnlOpen">$0.00</div>\n          </div>\n          <div class="pnl-card">\n            <div class="pnl-k">TOTAL</div>\n            <div class="pnl-v" id="pnlTotal">$0.00</div>\n          </div>\n        </div>\n        <div class="last-ticket" id="lastTicket">no dummy result yet</div>\n      </section>\n\n      <div class="stats" id="stats"></div>\n\n      <div class="main">\n        <div class="left">\n          <div class="price-row">\n            <div>\n              <div class="price-label">MID</div>\n              <div class="price" id="mid">-</div>\n            </div>\n            <div class="pos" id="pos">flat</div>\n          </div>\n          <canvas id="chart" width="900" height="280"></canvas>\n        </div>\n        <div class="right">\n          <section class="panel">\n            <div class="section-label">STANDING ORDER</div>\n            <p class="order">scalp XAUUSD with small in and out buys and sells from the live gold spot. the model answers about once a second. no abstaining.</p>\n          </section>\n          <section class="panel">\n            <div class="section-label">WHICH SIDE THIS TICK?</div>\n            <div class="headline" id="headline">WAIT</div>\n            <div class="bar-row">\n              <span class="bar-label buy">buy</span>\n              <div class="track"><div class="fill buy" id="buyFill"></div></div>\n              <span class="bar-pct" id="buyPct">-</span>\n            </div>\n            <div class="bar-row">\n              <span class="bar-label sell">sell</span>\n              <div class="track"><div class="fill sell" id="sellFill"></div></div>\n              <span class="bar-pct" id="sellPct">-</span>\n            </div>\n            <div class="latency" id="latency"></div>\n          </section>\n          <section class="tape-wrap">\n            <div class="section-label">DECISIONS</div>\n            <div class="tape" id="tape"></div>\n          </section>\n        </div>\n      </div>\n\n      <section class="dummy" id="dummyPanel">\n        <div class="dummy-head">\n          <div>\n            <div class="section-label">DUMMY TRADE TAPE</div>\n            <p class="dummy-note" id="dummyNote">Simulated tickets. Not a live broker. Holds the open ticket while the live mid is unchanged so a flip does not scratch at the same price.</p>\n          </div>\n          <div class="dummy-record" id="dummyRecord">W 0  L 0</div>\n        </div>\n        <div class="dummy-open" id="dummyOpen">waiting for first ticket</div>\n        <div class="tape dummy-tape" id="dummyTape"></div>\n      </section>\n\n      <p class="foot">Experimental gold scalp demo. Jev (or the stand-in) decides small in and out buys or sells from the live XAUUSD spot. The MT5 dummy tape is simulated so you can see opens and closes without a broker. Live broker fills only happen if you attach the MT5 EAs. Not financial advice.</p>\n    </div>\n    <script type="module" src="./demo.js"><\/script>\n  </body>\n</html>\n', "type": "text/html;charset=utf-8" }, "/demo.css": { "body": ':root {\n  --bg: #ffffff;\n  --panel: #f5f4f1;\n  --border: #ececea;\n  --border-2: #e5e4df;\n  --track: #f1f0ec;\n  --ink: #0a0a0a;\n  --ink-2: #3c3c38;\n  --muted: #77776f;\n  --muted-2: #98968e;\n  --buy: #0fa968;\n  --buy-ink: #0b7a48;\n  --buy-bar: #34c382;\n  --buy-bar-dim: #d9eee3;\n  --sell: #e4573d;\n  --sell-ink: #c2402f;\n  --sell-bar: #f07860;\n  --sell-bar-dim: #f9ded6;\n  --late-ink: #a16207;\n  --badge-jev-bg: #ebe7fc;\n  --badge-jev-fg: #4c3ebb;\n  --badge-standin-bg: #fbeed3;\n  --badge-standin-fg: #8a5b0e;\n  --page-bg: #f0eee9;\n  --font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;\n  --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;\n}\n\n*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n\nhtml,\nbody {\n  margin: 0;\n  padding: 0;\n  overflow-x: hidden;\n}\n\nbody {\n  background: var(--page-bg);\n  color: var(--ink);\n  font-family: var(--font-sans);\n  font-size: 14px;\n  line-height: 1.4;\n  -webkit-text-size-adjust: 100%;\n}\n\n.card {\n  background: var(--bg);\n  border: 1px solid var(--border);\n  border-radius: 18px;\n  max-width: min(1400px, calc(100% - 32px));\n  margin: 16px auto;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  padding-bottom: 16px;\n}\n\n.header {\n  display: flex;\n  align-items: center;\n  gap: 12px 16px;\n  padding: 16px 24px;\n}\n\n.brand-row {\n  display: flex;\n  align-items: baseline;\n  flex-wrap: wrap;\n  gap: 8px 12px;\n  min-width: 0;\n}\n\n.brand {\n  font-weight: 600;\n  font-size: 16px;\n}\n\n.pills {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 8px;\n  margin-left: auto;\n}\n\n.pair,\n.seq,\n.offline {\n  color: var(--muted);\n  font-variant-numeric: tabular-nums;\n}\n\n.spacer {\n  flex: 1;\n}\n\n.pill,\n.badge {\n  border-radius: 999px;\n  padding: 7px 12px;\n  font-size: 12px;\n  font-weight: 500;\n  border: 1px solid var(--border-2);\n}\n\n.badge.jev {\n  background: var(--badge-jev-bg);\n  color: var(--badge-jev-fg);\n  border-color: transparent;\n}\n\n.badge.standin {\n  background: var(--badge-standin-bg);\n  color: var(--badge-standin-fg);\n  border-color: transparent;\n}\n\n.pnl-band {\n  padding: 0 24px 16px;\n}\n\n.pnl-label {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  margin-bottom: 8px;\n}\n\n.sim-tag {\n  font-size: 11px;\n  letter-spacing: 0.08em;\n  color: var(--muted);\n  border: 1px solid var(--border-2);\n  border-radius: 999px;\n  padding: 3px 8px;\n}\n\n.pnl-grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 12px;\n}\n\n.pnl-card {\n  background: var(--panel);\n  border-radius: 14px;\n  padding: 14px 16px;\n}\n\n.pnl-k {\n  font-size: 11px;\n  letter-spacing: 0.08em;\n  color: var(--muted-2);\n}\n\n.pnl-v {\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n  font-size: 36px;\n  letter-spacing: -0.03em;\n  margin-top: 4px;\n}\n\n.pnl-v.up {\n  color: var(--buy-ink);\n}\n\n.pnl-v.down {\n  color: var(--sell-ink);\n}\n\n.last-ticket {\n  margin-top: 10px;\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n  font-size: 15px;\n  color: var(--ink-2);\n  overflow-wrap: anywhere;\n}\n\n.last-ticket.up {\n  color: var(--buy-ink);\n}\n\n.last-ticket.down {\n  color: var(--sell-ink);\n}\n\n.stats {\n  display: grid;\n  grid-template-columns: repeat(6, 1fr);\n  gap: 10px;\n  padding: 0 24px 16px;\n}\n\n.stat {\n  background: var(--panel);\n  border-radius: 12px;\n  padding: 10px 12px;\n}\n\n.stat .k {\n  font-size: 11px;\n  letter-spacing: 0.08em;\n  color: var(--muted-2);\n}\n\n.stat .v {\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n  font-size: 16px;\n  margin-top: 4px;\n}\n\n.main {\n  display: flex;\n  gap: 16px;\n  padding: 0 24px;\n  align-items: stretch;\n}\n\n.left {\n  flex: 1;\n  min-width: 0;\n}\n\n.price-row {\n  display: flex;\n  align-items: baseline;\n  justify-content: space-between;\n  margin-bottom: 8px;\n}\n\n.price-label {\n  font-size: 11px;\n  letter-spacing: 0.1em;\n  color: var(--muted-2);\n}\n\n.price {\n  font-family: var(--font-mono);\n  font-size: 36px;\n  font-variant-numeric: tabular-nums;\n  letter-spacing: -0.03em;\n}\n\n.pos {\n  font-family: var(--font-mono);\n  font-size: 13px;\n  padding: 6px 10px;\n  border-radius: 999px;\n  background: var(--panel);\n}\n\n.pos.buy {\n  color: var(--buy-ink);\n}\n\n.pos.sell {\n  color: var(--sell-ink);\n}\n\n#chart {\n  width: 100%;\n  height: 280px;\n  display: block;\n}\n\n.right {\n  width: 420px;\n  flex: none;\n  border: 1px solid var(--border);\n  border-radius: 20px;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n}\n\n.panel {\n  padding: 18px;\n  border-bottom: 1px solid var(--border);\n}\n\n.section-label {\n  font-size: 11px;\n  letter-spacing: 0.1em;\n  color: var(--muted-2);\n  font-weight: 500;\n}\n\n.order {\n  margin: 6px 0 0;\n  font-family: var(--font-mono);\n  font-size: 12.5px;\n  color: var(--ink-2);\n}\n\n.headline {\n  margin: 10px 0 14px;\n  font-size: 28px;\n  font-weight: 600;\n}\n\n.headline.buy {\n  color: var(--buy-ink);\n}\n\n.headline.sell {\n  color: var(--sell-ink);\n}\n\n.headline.late {\n  color: var(--late-ink);\n}\n\n.bar-row {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 4px 0;\n}\n\n.bar-label {\n  width: 44px;\n}\n\n.bar-label.buy {\n  color: var(--buy-ink);\n}\n\n.bar-label.sell {\n  color: var(--sell-ink);\n}\n\n.track {\n  flex: 1;\n  height: 16px;\n  border-radius: 99px;\n  background: var(--track);\n  overflow: hidden;\n}\n\n.fill {\n  height: 100%;\n  width: 0;\n  border-radius: 99px;\n}\n\n.fill.buy {\n  background: var(--buy-bar);\n}\n\n.fill.sell {\n  background: var(--sell-bar);\n}\n\n.bar-pct {\n  width: 46px;\n  text-align: right;\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n}\n\n.latency {\n  margin-top: 10px;\n  color: var(--muted);\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n  font-size: 12px;\n}\n\n.tape-wrap {\n  padding: 14px 18px 18px;\n  flex: 1;\n  min-height: 160px;\n}\n\n.tape {\n  margin-top: 8px;\n  font-family: var(--font-mono);\n  font-size: 12px;\n  font-variant-numeric: tabular-nums;\n}\n\n.tape .row {\n  display: grid;\n  grid-template-columns: 52px 48px 1fr 52px;\n  gap: 8px;\n  padding: 5px 0;\n  border-bottom: 1px solid var(--border);\n}\n\n.tape .buy {\n  color: var(--buy-ink);\n}\n\n.tape .sell {\n  color: var(--sell-ink);\n}\n\n.dummy {\n  margin: 16px 24px 0;\n  border: 1px solid var(--border);\n  border-radius: 16px;\n  padding: 16px 18px 12px;\n  background: var(--panel);\n}\n\n.dummy-head {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 16px;\n}\n\n.dummy-note {\n  margin: 6px 0 0;\n  color: var(--ink-2);\n  font-size: 12.5px;\n  max-width: 52rem;\n}\n\n.dummy-record {\n  font-family: var(--font-mono);\n  font-variant-numeric: tabular-nums;\n  font-size: 16px;\n  color: var(--ink-2);\n  white-space: nowrap;\n  flex: none;\n}\n\n.dummy-open {\n  margin: 12px 0 8px;\n  font-family: var(--font-mono);\n  font-size: 13px;\n  font-variant-numeric: tabular-nums;\n  color: var(--ink-2);\n}\n\n.dummy-open .buy {\n  color: var(--buy-ink);\n}\n\n.dummy-open .sell {\n  color: var(--sell-ink);\n}\n\n.dummy-tape {\n  margin-top: 4px;\n}\n\n.dummy-tape .row {\n  grid-template-columns: 56px 72px 72px 1fr 72px;\n}\n\n.dummy-tape .sl,\n.dummy-tape .close {\n  color: var(--sell-ink);\n}\n\n.dummy-tape .tp {\n  color: var(--buy-ink);\n}\n\n.dummy-tape .signal {\n  color: var(--ink-2);\n}\n\n.dummy-tape .up {\n  color: var(--buy-ink);\n}\n\n.dummy-tape .down {\n  color: var(--sell-ink);\n}\n\n.foot {\n  margin: 16px 24px 0;\n  color: var(--muted);\n  font-size: 12px;\n}\n\n@media (max-width: 899px) {\n  .card {\n    max-width: calc(100% - 16px);\n    margin: 8px auto;\n    border-radius: 14px;\n  }\n\n  .header,\n  .pnl-band,\n  .stats,\n  .main,\n  .dummy,\n  .foot {\n    padding-left: 14px;\n    padding-right: 14px;\n  }\n\n  .header {\n    flex-wrap: wrap;\n    gap: 8px 10px;\n    padding-top: 12px;\n    padding-bottom: 12px;\n  }\n\n  .pills {\n    margin-left: 0;\n  }\n\n  .main {\n    flex-direction: column;\n  }\n\n  .right,\n  .stats {\n    width: 100%;\n  }\n\n  .stats {\n    grid-template-columns: repeat(3, 1fr);\n  }\n\n  .dummy-head {\n    flex-direction: column;\n    align-items: flex-start;\n  }\n\n  .dummy-record {\n    white-space: normal;\n  }\n\n  .dummy-open {\n    white-space: normal;\n    overflow-wrap: anywhere;\n  }\n\n  .pnl-grid {\n    grid-template-columns: 1fr;\n  }\n\n  .pnl-v {\n    font-size: 28px;\n  }\n\n  #chart {\n    height: 200px;\n  }\n\n  .dummy-tape .row {\n    grid-template-columns: 44px 1fr auto;\n    grid-template-areas:\n      "id side pnl"\n      "open close close";\n    row-gap: 2px;\n  }\n\n  .dummy-tape .t-id { grid-area: id; }\n  .dummy-tape .t-side { grid-area: side; }\n  .dummy-tape .t-open { grid-area: open; }\n  .dummy-tape .t-close { grid-area: close; }\n  .dummy-tape .t-pnl { grid-area: pnl; }\n\n  .dummy-tape .row.empty {\n    display: block;\n    grid-template-columns: none;\n    grid-template-areas: none;\n  }\n}\n\n@media (max-width: 520px) {\n  .card {\n    max-width: 100%;\n    margin: 0;\n    border-radius: 0;\n    border-left: 0;\n    border-right: 0;\n    padding-bottom: max(16px, env(safe-area-inset-bottom));\n  }\n\n  .header,\n  .pnl-band,\n  .stats,\n  .main,\n  .dummy,\n  .foot {\n    padding-left: max(12px, env(safe-area-inset-left));\n    padding-right: max(12px, env(safe-area-inset-right));\n  }\n\n  .dummy,\n  .foot {\n    margin-left: max(12px, env(safe-area-inset-left));\n    margin-right: max(12px, env(safe-area-inset-right));\n  }\n\n  .stats {\n    grid-template-columns: repeat(2, 1fr);\n    gap: 8px;\n  }\n\n  .stat {\n    padding: 8px 10px;\n  }\n\n  .price-row {\n    flex-wrap: wrap;\n    gap: 8px 12px;\n  }\n\n  .price {\n    font-size: 28px;\n  }\n\n  .headline {\n    font-size: 22px;\n  }\n\n  .pnl-card {\n    padding: 12px 14px;\n  }\n\n  .pnl-v {\n    font-size: 26px;\n  }\n\n  .last-ticket,\n  .dummy-open,\n  .order,\n  .dummy-note,\n  .foot {\n    overflow-wrap: anywhere;\n  }\n\n  .tape .row {\n    grid-template-columns: 36px 40px 1fr 40px;\n    font-size: 11px;\n  }\n\n  .pill,\n  .badge {\n    padding: 6px 10px;\n  }\n\n  #chart {\n    height: 168px;\n  }\n\n  .right {\n    border-radius: 14px;\n  }\n\n  .panel,\n  .tape-wrap {\n    padding-left: 14px;\n    padding-right: 14px;\n  }\n}\n', "type": "text/css;charset=utf-8" }, "/demo.js": { "body": 'var l=(e)=>document.getElementById(e),u=[],b=[],m=[],P=new Set,M=null,C=null,g=0,x=!0,a=null,p=null,r={realized:0,floating:0,wins:0,losses:0},f={ticks:0,decisions:0,lateTicks:0,fills:0,jevUsd:0};function E(e){return`${Math.round(e*100)}%`}function A(e){let s=l("model");if(s){s.textContent=e.model;let n=e.model.toLowerCase().startsWith("jev");s.className=`badge ${n?"jev":"standin"}`}let i=l("feed");if(i)i.textContent=e.feed??"live";if(typeof e.horizonMs==="number"&&e.horizonMs>0)C=e.horizonMs;if(e.totals)f=e.totals;if(x=e.dummyMt5!==!1,e.openTicket!==void 0)a=e.openTicket;if(e.dummyTrades){m.length=0,m.push(...e.dummyTrades),p=m.at(-1)??null,P.clear();for(let n of m)P.add(`${n.ticket}|close|${n.closePrice}|${n.reason}|${n.closeTs}`)}if(e.lastTicket!==void 0)p=e.lastTicket;if(e.dummyPnl||typeof e.realizedUsd==="number")r={realized:e.dummyPnl?.realized??e.dummyPnl?.realizedUsd??e.realizedUsd??e.totals?.realizedUsd??0,floating:e.dummyPnl?.floating??e.dummyPnl?.unrealizedUsd??e.unrealizedUsd??e.totals?.unrealizedUsd??0,wins:e.dummyPnl?.wins??e.wins??e.totals?.wins??m.filter((n)=>n.pnl>0).length,losses:e.dummyPnl?.losses??e.losses??e.totals?.losses??m.filter((n)=>n.pnl<0).length};if(e.history){for(let n of e.history)if(u.push(n.mid),g=n.mid,n.decision&&!n.late&&!n.fill)b.push(n.decision);if(u.length>240)u.splice(0,u.length-240);if(b.length>12)b.splice(0,b.length-12)}if(e.latest)g=e.latest.mid,U(e.latest);let t=l("offline");if(t)t.textContent=e.error?e.error:"";w(),S(),F()}function U(e){M=e;let s=l("mid");if(s)s.textContent=e.mid.toFixed(2);let i=l("seq");if(i)i.textContent=`seq ${e.seq}`;let t=l("pos");if(t)t.textContent=e.position,t.className=`pos ${e.position}`;let n=e.late||e.action==="hold"?null:e.action,o=l("headline");if(o)o.textContent=n?`${n.toUpperCase()} ${E(e.probabilities[n])}`:"LATE",o.className=`headline ${n??"late"}`;let d=l("buyFill"),c=l("sellFill"),y=l("buyPct"),T=l("sellPct");if(d)d.style.width=`${Math.max(0,Math.min(1,e.probabilities.buy))*100}%`;if(c)c.style.width=`${Math.max(0,Math.min(1,e.probabilities.sell))*100}%`;if(y)y.textContent=n?E(e.probabilities.buy):"-";if(T)T.textContent=n?E(e.probabilities.sell):"-";let v=l("latency");if(v)v.textContent=e.late?"late  held":`${e.latencyMs.toFixed(0)} ms${e.sim?"  sim":""}`}function w(){let e=l("stats");if(!e)return;let s=[["TICKS",String(f.ticks)],["DECISIONS",String(f.decisions)],["LATE",String(f.lateTicks)],["FILLS",String(f.fills)],["JEV USD",f.jevUsd.toFixed(4)],["HORIZON",C?`${C/1000}s`:"-"],["SPREAD",M?`${M.spreadPips.toFixed(1)} pips`:"-"],["WINS",String(r.wins)],["LOSSES",String(r.losses)]];e.innerHTML=s.map(([i,t])=>`<div class="stat"><div class="k">${i}</div><div class="v">${t}</div></div>`).join("")}function h(e){let s=Math.abs(e).toFixed(2);if(e>0)return`+$${s}`;if(e<0)return`-$${s}`;return"$0.00"}function k(e){return e>0?"up":e<0?"down":""}function G(e){switch(e){case"sl":return"SL";case"tp":return"TP";case"signal":return"CLOSE";default:return e}}function O(e){r.realized=e.realizedUsd,r.floating=e.unrealizedUsd,r.wins=e.wins,r.losses=e.losses}function H(){let e=l("pnlBand");if(e)e.style.display=x?"":"none";let s=r.realized,i=r.floating,t=s+i,n=l("pnlRealized");if(n)n.textContent=h(s),n.className=`pnl-v ${k(s)}`;let o=l("pnlOpen");if(o)o.textContent=h(i),o.className=`pnl-v ${k(i)}`;let d=l("pnlTotal");if(d)d.textContent=h(t),d.className=`pnl-v ${k(t)}`;let c=l("lastTicket");if(c)if(p)c.textContent=`last ticket #${p.ticket} ${p.side.toUpperCase()} ${G(p.reason)} ${h(p.pnl)}`,c.className=`last-ticket ${k(p.pnl)}`;else if(a)c.textContent=`open ticket #${a.ticket} ${a.side.toUpperCase()} ${h(r.floating)}`,c.className=`last-ticket ${k(r.floating)}`;else c.textContent="no dummy result yet",c.className="last-ticket"}function S(){let e=l("dummyPanel");if(e)e.style.display=x?"":"none";let s=l("dummyNote");if(s)s.textContent=x?"Simulated tickets. Not a live broker. Holds the open ticket while the live mid is unchanged so a flip does not scratch at the same price.":"Dummy MT5 is off. Attach the real EAs to see broker fills.";let i=l("dummyRecord");if(i)i.textContent=`W ${r.wins}  L ${r.losses}`;let t=l("dummyOpen");if(t)if(!a)t.textContent=m.length?"no open ticket":"waiting for first ticket",t.className="dummy-open";else{let o=a;t.innerHTML=`<span class="${o.side}">${o.side.toUpperCase()} in</span> #${o.ticket}  ${o.lots} lot @ ${o.openPrice.toFixed(2)}  SL ${o.sl.toFixed(2)}  TP ${o.tp.toFixed(2)}  open ${h(r.floating)}`,t.className=`dummy-open ${o.side}`}let n=l("dummyTape");if(n){let o=[...m].reverse().slice(0,16).map((d)=>{let c=G(d.reason);return`<div class="row"><span class="t-id">#${d.ticket}</span><span class="t-side ${d.side}">${d.side.toUpperCase()} in</span><span class="t-open">${d.openPrice.toFixed(2)}</span><span class="t-close ${d.reason}">${c} ${d.closePrice.toFixed(2)}</span><span class="t-pnl ${k(d.pnl)}">${h(d.pnl)}</span></div>`});n.innerHTML=o.join("")||\'<div class="row empty"><span class="t-open">no dummy trades yet</span></div>\'}H()}function R(e){return`${e.ticket}|${e.kind??""}|${e.price}|${e.reason??""}|${e.ts??""}`}function z(e){let s=R(e);if(P.has(s))return;if(P.add(s),f.fills+=1,e.kind==="open")a={ticket:typeof e.ticket==="number"?e.ticket:Number(e.ticket),side:e.side,lots:e.lots,openPrice:e.openPrice??e.price,sl:e.sl??0,tp:e.tp??0,openTs:e.ts??Date.now()};else if(e.kind==="close"||e.reason){let i={ticket:typeof e.ticket==="number"?e.ticket:Number(e.ticket),side:e.side,lots:e.lots,openPrice:e.openPrice??a?.openPrice??e.price,sl:e.sl??a?.sl??0,tp:e.tp??a?.tp??0,closePrice:e.closePrice??e.price,reason:e.reason??"signal",pnl:e.pnl??0,openTs:a?.openTs??e.ts??Date.now(),closeTs:e.ts??Date.now()};if(m.push(i),m.length>40)m.shift();r.realized=m.reduce((t,n)=>t+n.pnl,0),r.wins=m.filter((t)=>t.pnl>0).length,r.losses=m.filter((t)=>t.pnl<0).length,r.floating=0,p=i,a=null}if(a&&g){let i=a.side==="buy"?1:-1;r.floating=(g-a.openPrice)*i*100*a.lots}S(),w()}function j(){let e=l("tape");if(!e)return;let s=[...b].reverse().slice(0,12);e.innerHTML=s.map((i)=>`<div class="row"><span>${i.seq}</span><span class="${i.action}">${i.action}</span><span>${i.mid.toFixed(2)}</span><span>${i.latencyMs.toFixed(0)}ms</span></div>`).join("")}function F(){let e=l("chart");if(!e||u.length<2)return;let s=window.devicePixelRatio||1,{clientWidth:i,clientHeight:t}=e;if(e.width!==Math.floor(i*s)||e.height!==Math.floor(t*s))e.width=Math.floor(i*s),e.height=Math.floor(t*s);let n=e.getContext("2d");if(!n)return;n.setTransform(s,0,0,s,0,0),n.clearRect(0,0,i,t);let o=Math.min(...u),d=Math.max(...u),c=Math.max(0.2,d-o),y=12;n.strokeStyle="#0a0a0a",n.lineWidth=1.5,n.beginPath(),u.forEach((T,v)=>{let L=y+v/(u.length-1)*(i-y*2),D=y+(1-(T-o)/c)*(t-y*2);if(v===0)n.moveTo(L,D);else n.lineTo(L,D)}),n.stroke()}function N(e){if(u.push(e.mid),g=e.mid,u.length>240)u.shift();if(!e.fill)f.ticks+=1;if(e.late)f.lateTicks+=1;if(e.decision&&!e.late&&!e.fill){if(f.decisions+=1,b.push(e.decision),b.length>24)b.shift();U(e.decision),j()}if(e.fill)z(e.fill);else if(e.pnl){if(O(e.pnl),e.lastTicket!==void 0)p=e.lastTicket;S()}else if(a){let i=a.side==="buy"?1:-1;r.floating=(e.mid-a.openPrice)*i*100*a.lots,S()}let s=l("mid");if(s&&!e.decision)s.textContent=e.mid.toFixed(2);w(),F()}function I(){let e=new EventSource("/events"),s=l("offline");e.addEventListener("snapshot",(i)=>{if(s)s.textContent="";A(JSON.parse(i.data)),j()}),e.addEventListener("tick",(i)=>N(JSON.parse(i.data))),e.addEventListener("late",(i)=>N(JSON.parse(i.data))),e.addEventListener("fill",(i)=>{let t=JSON.parse(i.data);if(t&&typeof t==="object"&&"fill"in t&&t.fill){if(g=typeof t.mid==="number"?t.mid:g,t.pnl)O(t.pnl);if(t.lastTicket!==void 0)p=t.lastTicket;z(t.fill);return}if(t&&typeof t==="object"&&"ticket"in t&&"side"in t)z(t)}),e.addEventListener("signal",(i)=>{let t=JSON.parse(i.data);U(t),w()}),e.onerror=()=>{if(s)s.textContent="reconnecting"}}I();window.addEventListener("resize",F);\n', "type": "text/javascript;charset=utf-8" } };

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
    const stub = env2.GOLD_ROOM.getByName("xauusd-jev");
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
