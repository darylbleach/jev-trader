import { DurableObject } from "cloudflare:workers";
import { keepGoldAlarm } from "./alarm";
import { applyWorkerEnv } from "./env";
import { createSseHub, handleGoldHttp, type GoldHttpTrader, type GoldMeta, type SseHub } from "./http";
import { parseProofState, type GoldProofState } from "../proof-state";
import { applyProofBoot, hydrationLooksIntact } from "./proof-boot";

/** Durable Object storage key for closed trades, P/L, and session counters. */
export const PROOF_STORAGE_KEY = "proof";

/**
 * One shared XAUUSD demo room so every viewer sees the same tape.
 * Boots the same GoldTrader / DummyMt5 / createGoldModel path as `bun run gold`.
 * A Durable Object alarm calls stepLiveGoldQuote every GOLD_INTERVAL_MS (1s).
 * While GOLD_DEMO is on, that alarm stays armed after the browser closes.
 * Workers cron is once a minute at best, so it only re-arms a lost alarm.
 * GOLD_MODEL=jev boots GoldJevModel via createGoldModel after applyWorkerEnv.
 *
 * Trade history and P/L live in DO SQLite storage under `proof`. In-memory
 * GoldTrader / DummyMt5Account alone do not survive hibernation or deploys.
 * Boot never starts empty when the `proof` key exists (corrupt blob throws).
 */
export class GoldRoom extends DurableObject<Env> {
  private trader: GoldHttpTrader | null = null;
  private meta: GoldMeta | null = null;
  private hub: SseHub = createSseHub();
  private mid = 0;
  private bid = 0;
  private ask = 0;
  private live = false;
  private lastFetch = 0;
  private intervalMs = 1000;
  private refreshMs = 1000;
  private demo = true;
  private proofDirty = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    applyWorkerEnv(this.env);
  }

  async ensureTicking(): Promise<void> {
    await this.boot();
    await this.arm();
  }

  /** Cron entry. A production room does not start its own quote clock. */
  async wake(): Promise<void> {
    await this.boot();
    if (!this.demo) return;
    await this.arm();
  }

  private async arm(): Promise<void> {
    await this.ctx.storage.put("lastSeen", Date.now());
    const alarm = await this.ctx.storage.getAlarm();
    if (alarm == null) {
      await this.ctx.storage.setAlarm(Date.now() + 50);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const trader = await this.boot();
    await this.ensureTicking();
    const res = await handleGoldHttp(request, trader, this.meta!, this.hub);
    if (this.proofDirty) await this.flushProof();
    return res;
  }

  async alarm(): Promise<void> {
    try {
      const trader = await this.boot();
      await this.stepLiveTick(trader);
      await this.flushProof();
    } catch (err) {
      console.error("gold alarm", err instanceof Error ? err.message : String(err));
    }
    const lastSeen = (await this.ctx.storage.get<number>("lastSeen")) ?? 0;
    if (keepGoldAlarm({ demo: this.demo, viewers: this.hub.size, lastSeen, now: Date.now() })) {
      await this.ctx.storage.setAlarm(Date.now() + this.intervalMs);
    }
  }

  private async boot(): Promise<GoldHttpTrader> {
    applyWorkerEnv(this.env);
    const { goldConfig } = await import("../config");
    this.demo = goldConfig.demo;
    if (this.trader && this.meta) return this.trader;
    const { GoldTrader } = await import("../trader");
    const { createGoldModel } = await import("../model");
    const model = createGoldModel();
    const trader = new GoldTrader(model);
    this.intervalMs = goldConfig.intervalMs > 0 ? goldConfig.intervalMs : 1000;
    this.refreshMs = goldConfig.spotRefreshMs > 0 ? goldConfig.spotRefreshMs : 1000;

    const storedProof = await this.ctx.storage.get<unknown>(PROOF_STORAGE_KEY);
    // Refuse empty boot when a proof blob exists but does not parse.
    const bootMode = applyProofBoot(trader, storedProof);
    if (bootMode === "hydrated") {
      const proof = parseProofState(storedProof);
      if (proof && !hydrationLooksIntact(proof, trader.snapshot())) {
        throw new Error(
          "GoldRoom proof hydrate mismatch after restore; refusing to continue with a divergent empty tape",
        );
      }
    }

    this.meta = {
      model: model.name,
      market: "XAUUSD",
      dryRun: goldConfig.dryRun,
      dummyMt5: goldConfig.dummyMt5,
      startedAt: trader.startedAt,
      feed: "live",
    };
    trader.onEvent = (e) => this.hub.broadcast(e.fill ? "fill" : e.late ? "late" : "tick", e);
    trader.onSignal = (s) => this.hub.broadcast("signal", s);
    trader.onFill = (f) => {
      this.hub.broadcast("fill", f);
      this.proofDirty = true;
    };
    trader.onProofChange = () => {
      this.proofDirty = true;
    };
    this.trader = trader;
    const stored = await this.ctx.storage.get<number>("mid");
    const storedLive = await this.ctx.storage.get<boolean>("live");
    if (typeof stored === "number" && stored > 100) {
      this.mid = stored;
      this.live = storedLive === true;
      if (this.meta) this.meta.feed = this.live ? "live" : "demo";
    }
    return trader;
  }

  private async flushProof(): Promise<void> {
    const trader = this.trader;
    if (!trader || typeof trader.exportProof !== "function") return;
    const proof: GoldProofState = trader.exportProof(Date.now());
    await this.ctx.storage.put(PROOF_STORAGE_KEY, proof);
    if (this.meta) this.meta.startedAt = proof.startedAt;
    this.proofDirty = false;
  }

  private async stepLiveTick(trader: GoldHttpTrader): Promise<void> {
    const { feedKindFromLive, stepLiveGoldQuote } = await import("../spot");
    const { demoTickFromMid } = await import("../walk");
    const next = await stepLiveGoldQuote(
      {
        mid: this.mid > 0 ? this.mid : null,
        bid: this.bid > 0 ? this.bid : null,
        ask: this.ask > 0 ? this.ask : null,
        live: this.live,
        lastFetch: this.lastFetch,
      },
      Date.now(),
      { refreshMs: this.refreshMs },
    );
    this.mid = next.mid ?? 0;
    this.bid = next.bid ?? 0;
    this.ask = next.ask ?? 0;
    this.live = next.live;
    this.lastFetch = next.lastFetch;
    await this.ctx.storage.put("mid", this.mid);
    await this.ctx.storage.put("live", this.live);
    if (this.meta) this.meta.feed = feedKindFromLive(this.live);
    if (this.bid > 0 && this.ask >= this.bid) await trader.onTick({ bid: this.bid, ask: this.ask, volume: 1 });
    else if (this.mid > 0) await trader.onTick(demoTickFromMid(this.mid));
    this.proofDirty = true;
  }
}
