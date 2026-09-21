import { goldConfig } from "./config";
import { startFeedPoller } from "./feed";
import { createGoldModel } from "./model";
import { startGoldServer } from "./server";
import { GoldTrader } from "./trader";
import { seedGoldMid, startDemoWalk } from "./walk";

const model = createGoldModel();
const trader = new GoldTrader(model);
const feed: "demo" | "url" | "idle" = goldConfig.feedUrl ? "url" : goldConfig.demo ? "demo" : "idle";
const server = startGoldServer(trader, {
  model: model.name,
  market: "XAUUSD",
  dryRun: goldConfig.dryRun,
  startedAt: trader.startedAt,
  feed,
});

trader.onEvent = (e) => {
  server.broadcast(e);
  if (e.decision && !e.late) {
    const p = e.decision.probabilities;
    console.log(`xauusd ${e.mid.toFixed(2)} ${e.decision.action} b${(p.buy * 100).toFixed(0)} s${(p.sell * 100).toFixed(0)} ${e.decision.latencyMs.toFixed(0)}ms pos ${e.decision.position}${e.decision.sim ? " sim" : ""}`);
  }
};
trader.onSignal = (s) => server.broadcastSignal(s);
trader.onFill = (f) => {
  server.broadcastFill(f);
  console.log(`xauusd FILL ${f.side} ${f.lots} @ ${f.price} ticket ${f.ticket}`);
};

if (goldConfig.feedUrl) {
  startFeedPoller(trader, goldConfig.feedUrl, goldConfig.intervalMs);
} else if (goldConfig.demo) {
  const seed = await seedGoldMid();
  startDemoWalk(trader, goldConfig.intervalMs, seed);
  console.log(`gold demo walk seed ${seed.toFixed(2)}`);
}

console.log(`jev-gold model=${model.name} XAUUSD interval ${goldConfig.intervalMs}ms horizon ${goldConfig.horizonMs}ms lot ${goldConfig.lot} ${goldConfig.dryRun ? "DRY RUN" : "live signals"} :${server.port} /demo`);
