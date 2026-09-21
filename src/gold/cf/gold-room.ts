import { DurableObject } from "cloudflare:workers";
import { applyWorkerEnv } from "./env";
import { createSseHub, handleGoldHttp, type GoldHttpTrader, type GoldMeta, type SseHub } from "./http";

const IDLE_MS = 15 * 60_000;

/**
 * One shared XAUUSD demo room so every viewer sees the same tape.
 * Boots the same GoldTrader / DummyMt5 / createGoldModel path as `bun run gold`.
 * A Durable Object alarm calls stepLiveGoldQuote every GOLD_INTERVAL_MS (1s).
 * Cron cannot do that: Workers cron is once a minute at best.
 * GOLD_MODEL=jev boots GoldJevModel via createGoldModel after applyWorkerEnv.
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

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    applyWorkerEnv(this.env);
  }

  async ensureTicking(): Promise<void> {
    await this.boot();
    await this.ctx.storage.put("lastSeen", Date.now());
    const alarm = await this.ctx.storage.getAlarm();
    if (alarm == null) {
      await this.ctx.storage.setAlarm(Date.now() + 50);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const trader = await this.boot();
    await this.ensureTicking();
    return handleGoldHttp(request, trader, this.meta!, this.hub);
  }

  async alarm(): Promise<void> {
    try {
      const trader = await this.boot();
      await this.stepLiveTick(trader);
    } catch (err) {
      console.error("gold alarm", err instanceof Error ? err.message : String(err));
    }
    const lastSeen = (await this.ctx.storage.get<number>("lastSeen")) ?? 0;
    const idle = this.hub.size === 0 && Date.now() - lastSeen > IDLE_MS;
    if (!idle) {
      await this.ctx.storage.setAlarm(Date.now() + this.intervalMs);
    }
  }

  private async boot(): Promise<GoldHttpTrader> {
    applyWorkerEnv(this.env);
    if (this.trader && this.meta) return this.trader;
    const { goldConfig } = await import("../config");
    const { GoldTrader } = await import("../trader");
    const { createGoldModel } = await import("../model");
    const model = createGoldModel();
    const trader = new GoldTrader(model);
    this.intervalMs = goldConfig.intervalMs > 0 ? goldConfig.intervalMs : 1000;
    this.refreshMs = goldConfig.spotRefreshMs > 0 ? goldConfig.spotRefreshMs : 1000;
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
    trader.onFill = (f) => this.hub.broadcast("fill", f);
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
  }
}
