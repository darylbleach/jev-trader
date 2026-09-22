const env = (key: string, fallback?: string) => process.env[key] ?? fallback;

/**
 * XAUUSD scalp stop for bid/ask proof fills. SYMBOL_POINT 0.01 → 300 points is $3.00.
 * Live Swissquote-style book is ~$0.50 wide. Buy at ask starts ~$0.50 underwater on the bid,
 * so mark travel to a $3.00 stop is ~$2.50 (SL minus spread). Matches TP mark travel below.
 */
export const GOLD_DEFAULT_SL_POINTS = 300;
/**
 * Take profit: 200 points is $2.00. Clears the ~$0.50 spread with room: after buy at ask,
 * bid must travel spread + TP ≈ $2.50 to bank, equal to the SL path. Cash breakeven WR is 60%.
 */
export const GOLD_DEFAULT_TP_POINTS = 200;
/**
 * Pause new dummy entries when realized P/L is at or below this USD level until POST /resume.
 * Set GOLD_PAUSE_REALIZED_USD=off (or empty with no default use) via a non-numeric value to disable.
 * Default -20 stops digging after a hole like the post-#14 book tape (~-$22 at ~53% WR).
 */
export const GOLD_DEFAULT_PAUSE_REALIZED_USD = -20;
/** Short near-term window Jev is asked about. Not a swing hold. */
export const GOLD_DEFAULT_HORIZON_MS = 6000;

/** Default proof path pays the book. Set GOLD_FILL_MODE=mid only for mid-fill comparison. */
export type GoldFillMode = "book" | "mid";

export function parseFillMode(raw: string | undefined, fallback: GoldFillMode = "book"): GoldFillMode {
  if (raw === undefined || raw === "") return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "mid" || v === "book") return v;
  return fallback;
}

/** Env integers used for SL/TP. Zero, negative, or non-numeric values fall back so exits stay on. */
export function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

/**
 * Drawdown pause floor in USD. Empty / missing → default. `off` / `false` / `none` → disabled (null).
 * Non-numeric junk falls back to default so a typo cannot silently disable the safeguard.
 */
export function parsePauseRealizedUsd(
  raw: string | undefined,
  fallback: number | null = GOLD_DEFAULT_PAUSE_REALIZED_USD,
): number | null {
  if (raw === undefined || raw === "") return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "off" || v === "false" || v === "none" || v === "disable" || v === "disabled") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return n;
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
  /**
   * Dummy / demo fill model. `book` (default): buy ask / sell bid, exit on the opposing side.
   * `mid` is comparison-only and must not be treated as broker-honest proof.
   */
  fillMode: parseFillMode(env("GOLD_FILL_MODE"), "book"),
  /** When set, block new entries once realizedUsd is at or below this level until resumeEntries(). */
  pauseRealizedUsd: parsePauseRealizedUsd(env("GOLD_PAUSE_REALIZED_USD")),
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
