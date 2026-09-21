const env = (key: string, fallback?: string) => process.env[key] ?? fallback;

/** Tight XAUUSD scalp. Many brokers quote SYMBOL_POINT 0.01, so 600 points is $6 of gold. */
export const GOLD_DEFAULT_SL_POINTS = 600;
/** Slightly wider than SL so a small winner can clear: 800 points is $8 at SYMBOL_POINT 0.01. */
export const GOLD_DEFAULT_TP_POINTS = 800;
/** Short near-term window Jev is asked about. Not a swing hold. */
export const GOLD_DEFAULT_HORIZON_MS = 6000;

/** Env integers used for SL/TP. Zero, negative, or non-numeric values fall back so exits stay on. */
export function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export const goldConfig = {
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
  model: (env("GOLD_MODEL") ?? env("MODEL", "mock")) as "mock" | "jev",
  jevModelId: env("JEV_MODEL_ID", "jev-latest")!,
  jevUsdPerMTok: 0.042,
  feedUrl: env("XAUUSD_FEED_URL"),
  /** Built-in XAUUSD walk so `bun run gold` is a watchable demo without MT5. */
  demo: env("GOLD_DEMO", "true") !== "false",
  historySize: 1000,
};
