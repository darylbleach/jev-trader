const env = (key: string, fallback?: string) => process.env[key] ?? fallback;

/**
 * XAUUSD scalp stop after bid/ask fills. SYMBOL_POINT 0.01 means 250 points is $2.50.
 * Live Swissquote-style books are often about $0.50 wide. A buy fills at ask, so the
 * exit bid already sits about one spread toward the stop. $2.50 leaves about $2.00 of
 * bounce room after that hit. Still a scalp, not a multi dollar hold.
 */
export const GOLD_DEFAULT_SL_POINTS = 250;
/**
 * Take profit that clears a typical ~$0.50 spread with about $1.00 of margin:
 * 150 points is $1.50. Dummy buys at ask / sells at bid, so the target must beat the book.
 */
export const GOLD_DEFAULT_TP_POINTS = 150;
/** Short near-term window Jev is asked about. Slightly longer than the old $0.60 scalp. */
export const GOLD_DEFAULT_HORIZON_MS = 12000;

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
  /** A retail XAUUSD book is often about 30 to 60 pips. 15 was a fake width around a printed mid. */
  maxSpreadPips: Number(env("GOLD_MAX_SPREAD_PIPS", "80")),
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
  model: (env("GOLD_MODEL") ?? env("MODEL", "mock")) as "mock" | "jev",
  jevModelId: env("JEV_MODEL_ID", "jev-latest")!,
  jevUsdPerMTok: 0.042,
  feedUrl: env("XAUUSD_FEED_URL"),
  /**
   * When true and no XAUUSD_FEED_URL is set, poll a public XAUUSD spot so the
   * demo decides on live gold. Set false for production so only JevLeader posts /tick.
   */
  demo: env("GOLD_DEMO", "true") !== "false",
  /** Optional extra spot URL. The live XAUUSD book is always tried first. */
  spotUrl: env("XAUUSD_SPOT_URL", "https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD")!,
  /**
   * How often to refresh the live book. Default matches GOLD_INTERVAL_MS.
   * The book itself reprints many times a minute, unlike a once-a-minute mid print.
   */
  spotRefreshMs: Number(env("XAUUSD_SPOT_REFRESH_MS", "1000")),
  historySize: 1000,
};
