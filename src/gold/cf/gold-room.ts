import { DurableObject } from "cloudflare:workers";
import { applyWorkerEnv } from "./env";
import { createSseHub, handleGoldHttp, type GoldHttpTrader, type GoldMeta, type SseHub } from "./http";

const IDLE_MS = 15 * 60_000;

/**
 * One shared XAUUSD demo room so every viewer sees the same tape.
 * A Durable Object alarm steps the walk every GOLD_INTERVAL_MS (1s).
 * Cron cannot do that: Workers cron is once a minute at best.
 */
export class GoldRoom extends DurableObject<Env> {
  private trader: GoldHttpTrader | null = null;
  private meta: GoldMeta | null = null;
  private hub: SseHub = createSseHub();
  private mid = 0;
  private seeded = false;
  private intervalMs = 1000;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    applyWorkerEnv(this.env as unknown as Record<string, unknown>);
  }

  async ensureTicking(): Promise<void> {
    await this.boot();
    await this.ensureSeed();
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
      await this.ensureSeed();
      const walk = await import("../walk");
      this.mid = walk.nextDemoMid(this.mid);
      await this.ctx.storage.put("mid", this.mid);
      await trader.onTick(walk.demoTickFromMid(this.mid));
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
    applyWorkerEnv(this.env as unknown as Record<string, unknown>);
    if (this.trader && this.meta) return this.trader;
    const { GoldMockModel } = await import("../model-mock");
    const { GoldTrader } = await import("../trader");
    const { goldConfig } = await import("../config");
    const model = new GoldMockModel();
    const trader = new GoldTrader(model);
    this.intervalMs = goldConfig.intervalMs > 0 ? goldConfig.intervalMs : 1000;
    this.meta = {
      model: model.name,
      market: "XAUUSD",
      dryRun: goldConfig.dryRun,
      dummyMt5: (goldConfig as { dummyMt5?: boolean }).dummyMt5,
      startedAt: trader.startedAt,
      feed: "demo",
    };
    trader.onEvent = (e) => this.hub.broadcast(e.fill ? "fill" : e.late ? "late" : "tick", e);
    trader.onSignal = (s) => this.hub.broadcast("signal", s);
    trader.onFill = (f) => this.hub.broadcast("fill", f);
    this.trader = trader;
    const stored = await this.ctx.storage.get<number>("mid");
    if (typeof stored === "number" && stored > 100) {
      this.mid = stored;
      this.seeded = true;
    }
    return trader;
  }

  private async ensureSeed(): Promise<void> {
    if (this.seeded && this.mid > 0) return;
    const { seedGoldMid } = await import("../walk");
    this.mid = await seedGoldMid();
    this.seeded = true;
    await this.ctx.storage.put("mid", this.mid);
  }
}
